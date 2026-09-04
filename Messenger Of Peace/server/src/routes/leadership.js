const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public list of active leadership
router.get('/', async (req, res) => {
  try {
    const [leaders] = await pool.query(
      `SELECT la.*, CONCAT(m.first_name, ' ', m.last_name) as member_name,
              m.photo as member_photo, m.email as member_email,
              u.name as unit_name
       FROM leadership_assignments la
       LEFT JOIN members m ON la.member_id = m.id
       LEFT JOIN units u ON la.unit_id = u.id
       WHERE la.is_active = 1
       ORDER BY la.start_date DESC`
    );
    res.json({ success: true, data: leaders });
  } catch (error) {
    console.error('Leadership list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const [leaders] = await pool.query(
      `SELECT la.*, CONCAT(m.first_name, ' ', m.last_name) as member_name,
              m.photo as member_photo, u.name as unit_name
       FROM leadership_assignments la
       LEFT JOIN members m ON la.member_id = m.id
       LEFT JOIN units u ON la.unit_id = u.id
       WHERE la.id = ?`,
      [req.params.id]
    );

    if (leaders.length === 0) {
      return res.status(404).json({ success: false, message: 'Leadership entry not found' });
    }

    res.json({ success: true, data: leaders[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief'),
  [
    body('member_id').isInt().withMessage('Member ID is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('start_date').notEmpty().withMessage('Start date is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { member_id, position, unit_id, start_date, end_date, description } = req.body;

      const [result] = await pool.query(
        `INSERT INTO leadership_assignments (member_id, position, unit_id, start_date, end_date, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [member_id, position, unit_id || null, start_date, end_date || null, description || null]
      );

      const [newLeader] = await pool.query(
        `SELECT la.*, CONCAT(m.first_name, ' ', m.last_name) as member_name
         FROM leadership_assignments la
         LEFT JOIN members m ON la.member_id = m.id
         WHERE la.id = ?`,
        [result.insertId]
      );

      res.status(201).json({ success: true, message: 'Leadership entry created', data: newLeader[0] });
    } catch (error) {
      console.error('Create leadership error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt().withMessage('Invalid ID')],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM leadership_assignments WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Leadership entry not found' });
      }

      const { member_id, position, unit_id, start_date, end_date, is_active, description } = req.body;
      const fields = [];
      const params = [];

      if (member_id !== undefined) { fields.push('member_id = ?'); params.push(member_id); }
      if (position !== undefined) { fields.push('position = ?'); params.push(position); }
      if (unit_id !== undefined) { fields.push('unit_id = ?'); params.push(unit_id); }
      if (start_date !== undefined) { fields.push('start_date = ?'); params.push(start_date); }
      if (end_date !== undefined) { fields.push('end_date = ?'); params.push(end_date); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }

      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      params.push(req.params.id);
      await pool.query(`UPDATE leadership_assignments SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query(
        `SELECT la.*, CONCAT(m.first_name, ' ', m.last_name) as member_name
         FROM leadership_assignments la LEFT JOIN members m ON la.member_id = m.id WHERE la.id = ?`,
        [req.params.id]
      );

      res.json({ success: true, message: 'Leadership entry updated', data: updated[0] });
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
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM leadership_assignments WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }

      await pool.query('UPDATE leadership_assignments SET is_active = 0 WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Leadership entry deactivated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
