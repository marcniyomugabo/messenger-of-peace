const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public: published activities
router.get('/', async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT a.*, ac.name as category_name, ac.color as category_color
               FROM activities a
               LEFT JOIN activity_categories ac ON a.category_id = ac.id
               WHERE a.status = 'Published'`;
    const params = [];

    if (search) {
      sql += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) { sql += ' AND a.category_id = ?'; params.push(category); }

    sql += ' ORDER BY a.start_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [activities] = await pool.query(sql, params);

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM activities WHERE status = 'Published'"
    );

    res.json({ success: true, data: activities, total: countResult[0].total });
  } catch (error) {
    console.error('Activities list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All activities (authenticated)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT a.*, ac.name as category_name
               FROM activities a
               LEFT JOIN activity_categories ac ON a.category_id = ac.id
               WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (category) { sql += ' AND a.category_id = ?'; params.push(category); }
    if (search) {
      sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY a.start_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [activities] = await pool.query(sql, params);
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Admin activities error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /categories - All categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM activity_categories ORDER BY name');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id - Single activity
router.get('/:id', async (req, res) => {
  try {
    const [activities] = await pool.query(
      `SELECT a.*, ac.name as category_name, ac.color as category_color, ac.icon as category_icon
       FROM activities a
       LEFT JOIN activity_categories ac ON a.category_id = ac.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (activities.length === 0) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, data: activities[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / - Create activity (admin/chief)
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('title').notEmpty().withMessage('Title is required'), body('start_date').notEmpty().withMessage('Start date is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const {
        title, description, short_description, cover_image, location, organizer,
        category_id, start_date, end_date, start_time, end_time, status,
        is_featured, registration_enabled, registration_deadline, max_participants
      } = req.body;

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const [existingSlug] = await pool.query('SELECT id FROM activities WHERE slug = ?', [slug]);
      const finalSlug = existingSlug.length > 0 ? `${slug}-${Date.now()}` : slug;

      const [result] = await pool.query(
        `INSERT INTO activities (title, slug, description, short_description, cover_image, location,
          organizer, category_id, start_date, end_date, start_time, end_time, status,
          is_featured, registration_enabled, registration_deadline, max_participants, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, finalSlug, description || null, short_description || null, cover_image || null,
          location || null, organizer || null, category_id || null, start_date, end_date || null,
          start_time || null, end_time || null, status || 'Draft', is_featured || false,
          registration_enabled || false, registration_deadline || null, max_participants || null,
          req.user.id
        ]
      );

      const [newActivity] = await pool.query('SELECT * FROM activities WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Activity created', data: newActivity[0] });
    } catch (error) {
      console.error('Create activity error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id - Update activity
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM activities WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Activity not found' });

      const {
        title, description, short_description, cover_image, location, organizer,
        category_id, start_date, end_date, start_time, end_time, status,
        is_featured, registration_enabled, registration_deadline, max_participants
      } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) {
        fields.push('title = ?', 'slug = ?');
        params.push(title, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (short_description !== undefined) { fields.push('short_description = ?'); params.push(short_description); }
      if (cover_image !== undefined) { fields.push('cover_image = ?'); params.push(cover_image); }
      if (location !== undefined) { fields.push('location = ?'); params.push(location); }
      if (organizer !== undefined) { fields.push('organizer = ?'); params.push(organizer); }
      if (category_id !== undefined) { fields.push('category_id = ?'); params.push(category_id); }
      if (start_date !== undefined) { fields.push('start_date = ?'); params.push(start_date); }
      if (end_date !== undefined) { fields.push('end_date = ?'); params.push(end_date); }
      if (start_time !== undefined) { fields.push('start_time = ?'); params.push(start_time); }
      if (end_time !== undefined) { fields.push('end_time = ?'); params.push(end_time); }
      if (status !== undefined) { fields.push('status = ?'); params.push(status); }
      if (is_featured !== undefined) { fields.push('is_featured = ?'); params.push(is_featured); }
      if (registration_enabled !== undefined) { fields.push('registration_enabled = ?'); params.push(registration_enabled); }
      if (registration_deadline !== undefined) { fields.push('registration_deadline = ?'); params.push(registration_deadline); }
      if (max_participants !== undefined) { fields.push('max_participants = ?'); params.push(max_participants); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE activities SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM activities WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Activity updated', data: updated[0] });
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id - Archive activity
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM activities WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Activity not found' });

      await pool.query("UPDATE activities SET status = 'Archived' WHERE id = ?", [req.params.id]);
      res.json({ success: true, message: 'Activity archived' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /categories - Create category (admin)
router.post(
  '/categories',
  authenticate,
  authorize('super_admin'),
  [body('name').notEmpty().withMessage('Name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { name, description, color, icon, is_active } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const [result] = await pool.query(
        'INSERT INTO activity_categories (name, slug, description, color, icon, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [name, slug, description || null, color || null, icon || null, is_active !== undefined ? is_active : true]
      );

      const [newCategory] = await pool.query('SELECT * FROM activity_categories WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Category created', data: newCategory[0] });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /categories/:id - Update category
router.put(
  '/categories/:id',
  authenticate,
  authorize('super_admin'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM activity_categories WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });

      const { name, description, color, icon, is_active } = req.body;
      const fields = [];
      const params = [];

      if (name !== undefined) { fields.push('name = ?'); params.push(name); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (color !== undefined) { fields.push('color = ?'); params.push(color); }
      if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE activity_categories SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM activity_categories WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Category updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /categories/:id - Delete category
router.delete(
  '/categories/:id',
  authenticate,
  authorize('super_admin'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM activity_categories WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });

      await pool.query('DELETE FROM activity_categories WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
