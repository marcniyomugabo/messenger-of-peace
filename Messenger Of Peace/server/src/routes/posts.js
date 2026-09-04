const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public: published posts
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT p.* FROM posts p WHERE p.status = ?';
    const params = ['Published'];

    if (category) { sql += ' AND p.category = ?'; params.push(category); }
    if (search) { sql += ' AND (p.title LIKE ? OR p.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY p.published_at DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [posts] = await pool.query(sql, params);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All posts (authenticated)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT p.* FROM posts p WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND p.status = ?'; params.push(status); }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [posts] = await pool.query(sql, params);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:slug
router.get('/:slug', async (req, res) => {
  try {
    const [posts] = await pool.query('SELECT * FROM posts WHERE slug = ? AND status = ?', [req.params.slug, 'Published']);
    if (posts.length === 0) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: posts[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post('/', authenticate, [body('title').notEmpty(), body('content').notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { title, content, excerpt, category, featured_image, status, seo_title, seo_description } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const [existingSlug] = await pool.query('SELECT id FROM posts WHERE slug = ?', [slug]);
    const finalSlug = existingSlug.length > 0 ? `${slug}-${Date.now()}` : slug;

    const postStatus = status || 'Draft';
    const publishedAt = postStatus === 'Published' ? new Date() : null;

    const [result] = await pool.query(
      `INSERT INTO posts (title, slug, content, excerpt, category, featured_image, status, published_at, seo_title, seo_description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, finalSlug, content, excerpt || null, category || null, featured_image || null,
       postStatus, publishedAt, seo_title || null, seo_description || null, req.user.id]
    );

    const [newPost] = await pool.query('SELECT * FROM posts WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Post created', data: newPost[0] });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /:id
router.put('/:id', authenticate, [param('id').isInt()], async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    const { title, content, excerpt, category, featured_image, status, seo_title, seo_description } = req.body;
    const fields = [];
    const params = [];

    if (title !== undefined) {
      fields.push('title = ?', 'slug = ?');
      params.push(title, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (excerpt !== undefined) { fields.push('excerpt = ?'); params.push(excerpt); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (featured_image !== undefined) { fields.push('featured_image = ?'); params.push(featured_image); }
    if (status !== undefined) {
      fields.push('status = ?'); params.push(status);
      if (status === 'Published') fields.push('published_at = COALESCE(published_at, NOW())');
    }
    if (seo_title !== undefined) { fields.push('seo_title = ?'); params.push(seo_title); }
    if (seo_description !== undefined) { fields.push('seo_description = ?'); params.push(seo_description); }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields' });
    params.push(req.params.id);
    await pool.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Post updated', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorize('super_admin', 'chief'), [param('id').isInt()], async (req, res) => {
  try {
    await pool.query('UPDATE posts SET status = ? WHERE id = ?', ['Archived', req.params.id]);
    res.json({ success: true, message: 'Post archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
