const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public: get active members
router.get('/', async (req, res) => {
  try {
    const { unit_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.id, m.member_code, m.first_name, m.last_name, m.date_of_birth,
             m.phone, m.email, m.school, m.location, m.photo, m.role_in_group,
             m.status, m.join_date, u.name as unit_name,
             la.position as leadership_position
      FROM members m
      LEFT JOIN units u ON m.unit_id = u.id
      LEFT JOIN leadership_assignments la ON la.member_id = m.id AND la.is_active = 1
      WHERE m.status = 'Active'
    `;
    const params = [];

    if (unit_id) { sql += ' AND m.unit_id = ?'; params.push(unit_id); }
    if (search) {
      sql += ' AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.member_code LIKE ? OR m.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [members] = await pool.query(sql, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM members WHERE status = ?', ['Active']);

    res.json({ success: true, data: { members, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    console.error('Members list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All members (admin/chief/secretary)
router.get('/admin', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
  try {
    const { unit_id, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.*, u.name as unit_name, la.position as leadership_position, m.monthly_contribution
      FROM members m
      LEFT JOIN units u ON m.unit_id = u.id
      LEFT JOIN leadership_assignments la ON la.member_id = m.id AND la.is_active = 1
      WHERE 1=1
    `;
    const params = [];

    if (unit_id) { sql += ' AND m.unit_id = ?'; params.push(unit_id); }
    if (status) { sql += ' AND m.status = ?'; params.push(status); }
    if (search) {
      sql += ' AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.member_code LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [members] = await pool.query(sql, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM members');

    res.json({ success: true, data: { members, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    console.error('Admin members error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const [members] = await pool.query(
      `SELECT m.*, u.name as unit_name,
              la.position as leadership_position, la.start_date as leadership_start, m.monthly_contribution
       FROM members m
       LEFT JOIN units u ON m.unit_id = u.id
       LEFT JOIN leadership_assignments la ON la.member_id = m.id AND la.is_active = 1
       WHERE m.id = ?`,
      [req.params.id]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const member = members[0];

    const [guardians] = await pool.query('SELECT * FROM member_guardians WHERE member_id = ?', [member.id]);
    const [attendance] = await pool.query(
      'SELECT * FROM attendance WHERE member_id = ? ORDER BY meeting_date DESC LIMIT 20',
      [member.id]
    );
    const [contributions] = await pool.query(
      'SELECT * FROM contributions WHERE member_id = ? ORDER BY contribution_year DESC, contribution_month DESC LIMIT 12',
      [member.id]
    );

    res.json({
      success: true,
      data: { ...member, guardians, recent_attendance: attendance, recent_contributions: contributions },
    });
  } catch (error) {
    console.error('Member detail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { first_name, last_name, date_of_birth, phone, whatsapp, email, school,
        location, unit_id, role_in_group, skills, talents, status, notes, monthly_contribution } = req.body;

      const [countResult] = await pool.query('SELECT COUNT(*) as cnt FROM members');
      const memberCode = 'MOP-' + String(countResult[0].cnt + 1).padStart(4, '0');

      const [result] = await pool.query(
        `INSERT INTO members (member_code, first_name, last_name, date_of_birth, phone, whatsapp,
          email, school, location, unit_id, role_in_group, skills, talents, status, join_date, notes, monthly_contribution)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
        [memberCode, first_name, last_name, date_of_birth || null, phone || null, whatsapp || null,
          email || null, school || null, location || null, unit_id || null, role_in_group || null,
          skills || null, talents || null, status || 'Active', notes || null, monthly_contribution || 500]
      );

      const [newMember] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Member created', data: newMember[0] });
    } catch (error) {
      console.error('Create member error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [param('id').isInt().withMessage('Invalid member ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const [existing] = await pool.query('SELECT id FROM members WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const allowedFields = ['first_name', 'last_name', 'date_of_birth', 'phone', 'whatsapp', 'email',
        'school', 'location', 'unit_id', 'role_in_group', 'skills', 'talents', 'status', 'notes', 'photo_consent', 'monthly_contribution'];

      const fields = [];
      const params = [];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      params.push(req.params.id);
      await pool.query(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Member updated', data: updated[0] });
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id (soft delete - set to Inactive)
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt().withMessage('Invalid member ID')],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM members WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      await pool.query('UPDATE members SET status = ? WHERE id = ?', ['Inactive', req.params.id]);
      res.json({ success: true, message: 'Member deactivated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
