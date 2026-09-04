const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - All SEO settings (authenticated)
router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM seo_settings ORDER BY page_slug');
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('SEO settings list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:page_slug - Get SEO for a specific page (public)
router.get('/:page_slug', async (req, res) => {
  try {
    const [settings] = await pool.query(
      'SELECT * FROM seo_settings WHERE page_slug = ?',
      [req.params.page_slug]
    );
    if (settings.length === 0) return res.status(404).json({ success: false, message: 'SEO settings not found' });
    res.json({ success: true, data: settings[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /:page_slug - Upsert SEO settings for a page (admin/chief)
router.put(
  '/:page_slug',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('title').notEmpty().withMessage('Title is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { page_slug } = req.params;
      const { title, description, keywords, og_image, canonical_url } = req.body;

      const [existing] = await pool.query(
        'SELECT id FROM seo_settings WHERE page_slug = ?',
        [page_slug]
      );

      if (existing.length > 0) {
        const fields = [];
        const params = [];

        if (title !== undefined) { fields.push('title = ?'); params.push(title); }
        if (description !== undefined) { fields.push('description = ?'); params.push(description); }
        if (keywords !== undefined) { fields.push('keywords = ?'); params.push(keywords); }
        if (og_image !== undefined) { fields.push('og_image = ?'); params.push(og_image); }
        if (canonical_url !== undefined) { fields.push('canonical_url = ?'); params.push(canonical_url); }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

        params.push(page_slug);
        await pool.query(`UPDATE seo_settings SET ${fields.join(', ')} WHERE page_slug = ?`, params);

        const [updated] = await pool.query('SELECT * FROM seo_settings WHERE page_slug = ?', [page_slug]);
        res.json({ success: true, message: 'SEO settings updated', data: updated[0] });
      } else {
        const [result] = await pool.query(
          'INSERT INTO seo_settings (page_slug, title, description, keywords, og_image, canonical_url) VALUES (?, ?, ?, ?, ?, ?)',
          [page_slug, title, description || null, keywords || null, og_image || null, canonical_url || null]
        );

        const [newSetting] = await pool.query('SELECT * FROM seo_settings WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'SEO settings created', data: newSetting[0] });
      }
    } catch (error) {
      console.error('Upsert SEO settings error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
