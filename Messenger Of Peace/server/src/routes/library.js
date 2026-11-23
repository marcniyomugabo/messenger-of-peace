const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET / - Public: published resources
router.get('/', async (req, res) => {
  try {
    const { search, category, file_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM library_resources WHERE status = \'Published\'';
    const params = [];

    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR author LIKE ? OR tags LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (file_type) { sql += ' AND file_type = ?'; params.push(file_type); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [resources] = await pool.query(sql, params);

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM library_resources WHERE status = 'Published'"
    );

    res.json({ success: true, data: resources, total: countResult[0].total });
  } catch (error) {
    console.error('Library list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All resources (authenticated)
router.get('/admin', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const { status, category, file_type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM library_resources WHERE 1=1';
    const params = [];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (file_type) { sql += ' AND file_type = ?'; params.push(file_type); }
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [resources] = await pool.query(sql, params);
    res.json({ success: true, data: resources });
  } catch (error) {
    console.error('Admin library error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /categories - Distinct categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT DISTINCT category FROM library_resources WHERE category IS NOT NULL ORDER BY category'
    );
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id - Single resource
router.get('/:id', async (req, res) => {
  try {
    const [resources] = await pool.query('SELECT * FROM library_resources WHERE id = ?', [req.params.id]);
    if (resources.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, data: resources[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / - Create resource (admin/chief/media)
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [body('title').notEmpty().withMessage('Title is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const {
        title, description, category, author, file_path, cover_image,
        file_type, file_size, tags, is_featured, status
      } = req.body;

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [existingSlug] = await pool.query('SELECT id FROM library_resources WHERE slug = ?', [slug]);
      const finalSlug = existingSlug.length > 0 ? `${slug}-${Date.now()}` : slug;

      const [result] = await pool.query(
        `INSERT INTO library_resources (title, slug, description, category, author, file_path, cover_image,
          file_type, file_size, tags, is_featured, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, finalSlug, description || null, category || null, author || null,
          file_path || null, cover_image || null, file_type || 'Other', file_size || null,
          tags || null, is_featured || false, status || 'Draft', req.user.id
        ]
      );

      const [newResource] = await pool.query('SELECT * FROM library_resources WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Resource created', data: newResource[0] });
    } catch (error) {
      console.error('Create resource error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id - Update resource
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM library_resources WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });

      const {
        title, description, category, author, file_path, cover_image,
        file_type, file_size, tags, is_featured, status
      } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) {
        fields.push('title = ?', 'slug = ?');
        params.push(title, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (category !== undefined) { fields.push('category = ?'); params.push(category); }
      if (author !== undefined) { fields.push('author = ?'); params.push(author); }
      if (file_path !== undefined) { fields.push('file_path = ?'); params.push(file_path); }
      if (cover_image !== undefined) { fields.push('cover_image = ?'); params.push(cover_image); }
      if (file_type !== undefined) { fields.push('file_type = ?'); params.push(file_type); }
      if (file_size !== undefined) { fields.push('file_size = ?'); params.push(file_size); }
      if (tags !== undefined) { fields.push('tags = ?'); params.push(tags); }
      if (is_featured !== undefined) { fields.push('is_featured = ?'); params.push(is_featured); }
      if (status !== undefined) { fields.push('status = ?'); params.push(status); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE library_resources SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM library_resources WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Resource updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id - Archive resource
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM library_resources WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });

      await pool.query("UPDATE library_resources SET status = 'Archived' WHERE id = ?", [req.params.id]);
      res.json({ success: true, message: 'Resource archived' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /upload - Upload resource file with multer
router.post(
  '/upload',
  authenticate,
  authorize('super_admin', 'chief', 'media'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

      const { title, description, category, author, tags, is_featured, status } = req.body;

      let fileType = 'Other';
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      if (ext === 'pdf') fileType = 'PDF';
      else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) fileType = 'Document';
      else if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) fileType = 'Video';
      else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) fileType = 'Audio';

      const fileName = title || req.file.originalname;
      const slug = fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [existingSlug] = await pool.query('SELECT id FROM library_resources WHERE slug = ?', [slug]);
      const finalSlug = existingSlug.length > 0 ? `${slug}-${Date.now()}` : slug;

      const [result] = await pool.query(
        `INSERT INTO library_resources (title, slug, description, category, author, file_path,
          file_type, file_size, tags, is_featured, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileName, finalSlug, description || null, category || null, author || null,
          `/uploads/${req.file.filename}`, fileType, req.file.size, tags || null,
          is_featured || false, status || 'Draft', req.user.id
        ]
      );

      const [newResource] = await pool.query('SELECT * FROM library_resources WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'File uploaded', data: newResource[0] });
    } catch (error) {
      console.error('Upload library resource error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
