const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public: published albums
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [albums] = await pool.query(
      `SELECT ga.*, (SELECT COUNT(*) FROM gallery_images gi WHERE gi.album_id = ga.id) as image_count
       FROM gallery_albums ga
       WHERE ga.status = 'Published'
       ORDER BY ga.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM gallery_albums WHERE status = 'Published'"
    );

    res.json({ success: true, data: albums, total: countResult[0].total });
  } catch (error) {
    console.error('Gallery albums list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All albums (authenticated)
router.get('/admin', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT ga.*, (SELECT COUNT(*) FROM gallery_images gi WHERE gi.album_id = ga.id) as image_count
               FROM gallery_albums ga WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND ga.status = ?'; params.push(status); }

    sql += ' ORDER BY ga.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [albums] = await pool.query(sql, params);
    res.json({ success: true, data: albums });
  } catch (error) {
    console.error('Admin gallery albums error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /images/public - Public images from published albums
router.get('/images/public', async (req, res) => {
  try {
    const { album_id, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT gi.*, ga.title as album_title
               FROM gallery_images gi
               JOIN gallery_albums ga ON gi.album_id = ga.id
               WHERE ga.status = 'Published'`;
    const params = [];

    if (album_id) { sql += ' AND gi.album_id = ?'; params.push(album_id); }

    sql += ' ORDER BY gi.sort_order ASC, gi.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [images] = await pool.query(sql, params);
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /images - All images (authenticated, with album_id filter)
router.get('/images', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const { album_id, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT gi.*, ga.title as album_title
               FROM gallery_images gi
               LEFT JOIN gallery_albums ga ON gi.album_id = ga.id
               WHERE 1=1`;
    const params = [];

    if (album_id) { sql += ' AND gi.album_id = ?'; params.push(album_id); }

    sql += ' ORDER BY gi.sort_order ASC, gi.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [images] = await pool.query(sql, params);
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id - Single album with images
router.get('/:id', async (req, res) => {
  try {
    const [albums] = await pool.query(
      'SELECT * FROM gallery_albums WHERE id = ?',
      [req.params.id]
    );
    if (albums.length === 0) return res.status(404).json({ success: false, message: 'Album not found' });

    const [images] = await pool.query(
      'SELECT * FROM gallery_images WHERE album_id = ? ORDER BY sort_order ASC, created_at ASC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...albums[0], images } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / - Create album (admin/chief/media)
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [body('title').notEmpty().withMessage('Title is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { title, description, cover_image, status } = req.body;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [existingSlug] = await pool.query('SELECT id FROM gallery_albums WHERE slug = ?', [slug]);
      const finalSlug = existingSlug.length > 0 ? `${slug}-${Date.now()}` : slug;

      const [result] = await pool.query(
        'INSERT INTO gallery_albums (title, slug, description, cover_image, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [title, finalSlug, description || null, cover_image || null, status || 'Draft', req.user.id]
      );

      const [newAlbum] = await pool.query('SELECT * FROM gallery_albums WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Album created', data: newAlbum[0] });
    } catch (error) {
      console.error('Create album error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id - Update album
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM gallery_albums WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Album not found' });

      const { title, description, cover_image, status } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) {
        fields.push('title = ?', 'slug = ?');
        params.push(title, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (cover_image !== undefined) { fields.push('cover_image = ?'); params.push(cover_image); }
      if (status !== undefined) { fields.push('status = ?'); params.push(status); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE gallery_albums SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM gallery_albums WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Album updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id - Archive album
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM gallery_albums WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Album not found' });

      await pool.query("UPDATE gallery_albums SET status = 'Archived' WHERE id = ?", [req.params.id]);
      res.json({ success: true, message: 'Album archived' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /images - Add image to album
router.post(
  '/images',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [body('album_id').notEmpty().withMessage('Album ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { album_id, media_id, title, caption, description, sort_order, is_cover, image_url } = req.body;

      const [album] = await pool.query('SELECT id FROM gallery_albums WHERE id = ?', [album_id]);
      if (album.length === 0) return res.status(404).json({ success: false, message: 'Album not found' });

      const [countResult] = await pool.query('SELECT COUNT(*) as count FROM gallery_images WHERE album_id = ?', [album_id]);
      const order = sort_order !== undefined ? sort_order : countResult[0].count;

      const [result] = await pool.query(
        'INSERT INTO gallery_images (album_id, media_id, title, caption, description, image_url, sort_order, is_cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [album_id, media_id || null, title || null, caption || null, description || null, image_url || null, order, is_cover || false]
      );

      const [newImage] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Image added', data: newImage[0] });
    } catch (error) {
      console.error('Add gallery image error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /images/:id - Update image
router.put(
  '/images/:id',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM gallery_images WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Image not found' });

      const { title, caption, description, sort_order, is_cover } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) { fields.push('title = ?'); params.push(title); }
      if (caption !== undefined) { fields.push('caption = ?'); params.push(caption); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
      if (is_cover !== undefined) { fields.push('is_cover = ?'); params.push(is_cover); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE gallery_images SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Image updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /images/:id - Delete image
router.delete(
  '/images/:id',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM gallery_images WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Image not found' });

      await pool.query('DELETE FROM gallery_images WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Image deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PATCH /images/:id/reorder - Update sort_order
router.patch(
  '/images/:id/reorder',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [param('id').isInt(), body('sort_order').isInt()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT id FROM gallery_images WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Image not found' });

      await pool.query('UPDATE gallery_images SET sort_order = ? WHERE id = ?', [req.body.sort_order, req.params.id]);

      const [updated] = await pool.query('SELECT * FROM gallery_images WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Image reordered', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
