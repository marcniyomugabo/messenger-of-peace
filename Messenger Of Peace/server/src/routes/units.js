const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public list
router.get('/', async (req, res) => {
  try {
    const [units] = await pool.query(
      `SELECT u.*, COUNT(um.member_id) as member_count
       FROM units u
       LEFT JOIN unit_members um ON um.unit_id = u.id AND um.is_active = 1
       WHERE u.is_active = 1
       GROUP BY u.id
       ORDER BY u.display_order ASC, u.name ASC`
    );
    res.json({ success: true, data: units });
  } catch (error) {
    console.error('Units list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const [units] = await pool.query(
      `SELECT u.*, COUNT(um.member_id) as member_count
       FROM units u
       LEFT JOIN unit_members um ON um.unit_id = u.id AND um.is_active = 1
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );

    if (units.length === 0) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const [members] = await pool.query(
      `SELECT m.id, m.member_code, m.first_name, m.last_name, m.photo, um.role
       FROM members m
       JOIN unit_members um ON um.member_id = m.id
       WHERE um.unit_id = ? AND um.is_active = 1 AND m.status = 'Active'
       ORDER BY m.first_name ASC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...units[0], members } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('name').notEmpty().withMessage('Unit name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { name, description, focus_area, icon, display_order } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const [existing] = await pool.query('SELECT id FROM units WHERE name = ?', [name]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Unit name already exists' });
      }

      const [result] = await pool.query(
        'INSERT INTO units (name, slug, description, focus_area, icon, display_order) VALUES (?, ?, ?, ?, ?, ?)',
        [name, slug, description || null, focus_area || null, icon || null, display_order || 0]
      );

      const [newUnit] = await pool.query('SELECT * FROM units WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Unit created', data: newUnit[0] });
    } catch (error) {
      console.error('Create unit error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt().withMessage('Invalid unit ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const [existing] = await pool.query('SELECT id FROM units WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      const { name, description, focus_area, icon, leader_id, is_active, display_order } = req.body;
      const fields = [];
      const params = [];

      if (name !== undefined) { fields.push('name = ?'); params.push(name); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (focus_area !== undefined) { fields.push('focus_area = ?'); params.push(focus_area); }
      if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
      if (leader_id !== undefined) { fields.push('leader_id = ?'); params.push(leader_id); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
      if (display_order !== undefined) { fields.push('display_order = ?'); params.push(display_order); }

      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      params.push(req.params.id);
      await pool.query(`UPDATE units SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM units WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Unit updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt().withMessage('Invalid unit ID')],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM units WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      await pool.query('UPDATE units SET is_active = 0 WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Unit deactivated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
