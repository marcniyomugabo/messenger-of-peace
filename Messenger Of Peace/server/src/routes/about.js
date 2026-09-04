const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public: active content
router.get('/', async (req, res) => {
  try {
    const [content] = await pool.query(
      'SELECT * FROM about_content WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('About content list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All content (authenticated)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const [content] = await pool.query(
      'SELECT * FROM about_content ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Admin about content error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /:section_key - Upsert content by section_key (admin/chief)
router.put(
  '/:section_key',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('title').notEmpty().withMessage('Title is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { section_key } = req.params;
      const { title, content, image, sort_order, is_active } = req.body;

      const [existing] = await pool.query(
        'SELECT id FROM about_content WHERE section_key = ?',
        [section_key]
      );

      if (existing.length > 0) {
        const fields = [];
        const params = [];

        if (title !== undefined) { fields.push('title = ?'); params.push(title); }
        if (content !== undefined) { fields.push('content = ?'); params.push(content); }
        if (image !== undefined) { fields.push('image = ?'); params.push(image); }
        if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
        if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

        params.push(section_key);
        await pool.query(`UPDATE about_content SET ${fields.join(', ')} WHERE section_key = ?`, params);

        const [updated] = await pool.query('SELECT * FROM about_content WHERE section_key = ?', [section_key]);
        res.json({ success: true, message: 'Content updated', data: updated[0] });
      } else {
        const [countResult] = await pool.query('SELECT COUNT(*) as count FROM about_content');
        const order = sort_order !== undefined ? sort_order : countResult[0].count;

        const [result] = await pool.query(
          'INSERT INTO about_content (section_key, title, content, image, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [section_key, title, content || null, image || null, order, is_active !== undefined ? is_active : true]
        );

        const [newContent] = await pool.query('SELECT * FROM about_content WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Content created', data: newContent[0] });
      }
    } catch (error) {
      console.error('Upsert about content error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:section_key - Delete section
router.delete(
  '/:section_key',
  authenticate,
  authorize('super_admin', 'chief'),
  async (req, res) => {
    try {
      const [existing] = await pool.query(
        'SELECT id FROM about_content WHERE section_key = ?',
        [req.params.section_key]
      );
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Section not found' });

      await pool.query('DELETE FROM about_content WHERE section_key = ?', [req.params.section_key]);
      res.json({ success: true, message: 'Section deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
