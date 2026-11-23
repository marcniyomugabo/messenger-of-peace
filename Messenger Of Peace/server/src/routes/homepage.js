const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// A slide's picture and button link must be a path on this site ("/images/bg2.jpeg", "/about")
// or a full web address. Anything else (for example "javascript:..." or text with quotes or
// brackets, which could break out of the page's style) is refused.
const isSafeLink = (value) => /^\/(?!\/)[^\s"'()<>\\]*$/.test(value) || /^https?:\/\/[^\s"'()<>\\]+$/i.test(value);
const slideRules = [
  body(['background_image', 'button_link']).optional({ values: 'falsy' }).trim()
    .custom(isSafeLink).withMessage('Picture and button link must start with "/" or with http:// or https://'),
];

// GET /slides - Public: active slides
router.get('/slides', async (req, res) => {
  try {
    const [slides] = await pool.query(
      'SELECT * FROM hero_slides WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: slides });
  } catch (error) {
    console.error('Slides list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /sections - Public: active sections
router.get('/sections', async (req, res) => {
  try {
    const { section_type } = req.query;
    let sql = 'SELECT * FROM homepage_sections WHERE is_active = 1';
    const params = [];

    if (section_type) { sql += ' AND section_type = ?'; params.push(section_type); }

    sql += ' ORDER BY sort_order ASC';

    const [sections] = await pool.query(sql, params);
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Sections list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /slides/admin - All slides (authenticated)
router.get('/slides/admin', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const [slides] = await pool.query('SELECT * FROM hero_slides ORDER BY sort_order ASC');
    res.json({ success: true, data: slides });
  } catch (error) {
    console.error('Admin slides error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /sections/admin - All sections (authenticated)
router.get('/sections/admin', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const [sections] = await pool.query('SELECT * FROM homepage_sections ORDER BY sort_order ASC');
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Admin sections error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /slides - Create slide (admin/chief)
router.post(
  '/slides',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('title').trim().notEmpty().withMessage('Title is required'), ...slideRules],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { title, subtitle, description, background_image, button_text, button_link, sort_order, is_active } = req.body;

      const [countResult] = await pool.query('SELECT COUNT(*) as count FROM hero_slides');
      const order = sort_order !== undefined ? sort_order : countResult[0].count;

      const [result] = await pool.query(
        `INSERT INTO hero_slides (title, subtitle, description, background_image, button_text, button_link, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, subtitle || null, description || null, background_image || null,
         button_text || null, button_link || null, order, is_active !== undefined ? is_active : true]
      );

      const [newSlide] = await pool.query('SELECT * FROM hero_slides WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Slide created', data: newSlide[0] });
    } catch (error) {
      console.error('Create slide error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /slides/:id - Update slide
router.put(
  '/slides/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt(), body('title').optional().trim().notEmpty().withMessage('Title is required'), ...slideRules],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT id FROM hero_slides WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Slide not found' });

      const { title, subtitle, description, background_image, button_text, button_link, sort_order, is_active } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) { fields.push('title = ?'); params.push(title); }
      if (subtitle !== undefined) { fields.push('subtitle = ?'); params.push(subtitle); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (background_image !== undefined) { fields.push('background_image = ?'); params.push(background_image); }
      if (button_text !== undefined) { fields.push('button_text = ?'); params.push(button_text); }
      if (button_link !== undefined) { fields.push('button_link = ?'); params.push(button_link); }
      if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE hero_slides SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM hero_slides WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Slide updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /slides/:id - Delete slide
router.delete(
  '/slides/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM hero_slides WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Slide not found' });

      await pool.query('DELETE FROM hero_slides WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Slide deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PATCH /slides/:id/reorder - Update sort_order
router.patch(
  '/slides/:id/reorder',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt(), body('sort_order').isInt()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT id FROM hero_slides WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Slide not found' });

      await pool.query('UPDATE hero_slides SET sort_order = ? WHERE id = ?', [req.body.sort_order, req.params.id]);

      const [updated] = await pool.query('SELECT * FROM hero_slides WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Slide reordered', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /sections - Create section
router.post(
  '/sections',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('title').notEmpty().withMessage('Title is required'), body('section_type').notEmpty().withMessage('Section type is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { title, content, section_type, image, sort_order, is_active, settings } = req.body;

      const [countResult] = await pool.query('SELECT COUNT(*) as count FROM homepage_sections');
      const order = sort_order !== undefined ? sort_order : countResult[0].count;

      const [result] = await pool.query(
        `INSERT INTO homepage_sections (title, content, section_type, image, sort_order, is_active, settings)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, content || null, section_type, image || null, order,
         is_active !== undefined ? is_active : true, settings || null]
      );

      const [newSection] = await pool.query('SELECT * FROM homepage_sections WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Section created', data: newSection[0] });
    } catch (error) {
      console.error('Create section error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /sections/:id - Update section
router.put(
  '/sections/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM homepage_sections WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Section not found' });

      const { title, content, section_type, image, sort_order, is_active, settings } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) { fields.push('title = ?'); params.push(title); }
      if (content !== undefined) { fields.push('content = ?'); params.push(content); }
      if (section_type !== undefined) { fields.push('section_type = ?'); params.push(section_type); }
      if (image !== undefined) { fields.push('image = ?'); params.push(image); }
      if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
      if (settings !== undefined) { fields.push('settings = ?'); params.push(settings); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE homepage_sections SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM homepage_sections WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Section updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /sections/:id - Delete section
router.delete(
  '/sections/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM homepage_sections WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Section not found' });

      await pool.query('DELETE FROM homepage_sections WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Section deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PATCH /sections/:id/reorder - Update sort_order
router.patch(
  '/sections/:id/reorder',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt(), body('sort_order').isInt()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT id FROM homepage_sections WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Section not found' });

      await pool.query('UPDATE homepage_sections SET sort_order = ? WHERE id = ?', [req.body.sort_order, req.params.id]);

      const [updated] = await pool.query('SELECT * FROM homepage_sections WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Section reordered', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
