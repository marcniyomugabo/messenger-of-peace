const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { today } = require('../utils/dates');
const { nextMemberCode } = require('../utils/memberCode');

// GET / - Public: get active members
// Public, so only non-personal fields: no birth date, contact details, school or location.
// The photo is shown only when the member gave photo consent.
router.get('/', async (req, res) => {
  try {
    const { unit_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.id, m.member_code, m.first_name, m.last_name,
             CASE WHEN m.photo_consent = 1 THEN m.photo END as photo,
             m.role_in_group, m.status, m.unit_id, u.name as unit_name,
             la.position as leadership_position
      FROM members m
      LEFT JOIN units u ON m.unit_id = u.id
      LEFT JOIN leadership_assignments la ON la.member_id = m.id AND la.is_active = 1
      WHERE m.status = 'Active'
    `;
    const params = [];

    if (unit_id) { sql += ' AND m.unit_id = ?'; params.push(unit_id); }
    if (search) {
      sql += ' AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.member_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

// GET /me - the signed-in person's own member record (My profile). Only their own; a few
// internal fields (notes, photo consent) are left out.
router.get('/me', authenticate, async (req, res) => {
  try {
    const [[m]] = await pool.query(
      `SELECT m.id, m.member_code, m.first_name, m.last_name, m.gender, m.date_of_birth, m.phone, m.whatsapp, m.email,
              m.school, m.location, m.status, m.join_date, m.role_in_group, m.monthly_contribution, m.photo,
              u.name AS unit_name, u.focus_area AS unit_focus, la.position AS leadership_position
       FROM members m
       LEFT JOIN units u ON u.id = m.unit_id
       LEFT JOIN leadership_assignments la ON la.member_id = m.id AND la.is_active = 1
       WHERE m.user_id = ? LIMIT 1`,
      [req.user.id]
    );
    if (!m) return res.json({ success: true, data: null });
    const [guardians] = await pool.query(
      'SELECT guardian_name, relationship, phone, is_emergency FROM member_guardians WHERE member_id = ? ORDER BY is_emergency DESC, id',
      [m.id]
    );
    res.json({ success: true, data: { ...m, guardians } });
  } catch (error) {
    console.error('My profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
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
      "SELECT * FROM contribution_payments WHERE member_id = ? AND status != 'Cancelled' ORDER BY contribution_year DESC, contribution_month DESC LIMIT 12",
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

// Checks shared by "add member" and "edit member". Empty optional fields are saved as nothing.
const GENDERS = ['Female', 'Male'];
const recordRules = [
  body('gender').optional({ values: 'falsy' }).isIn(GENDERS).withMessage('Gender must be Female or Male'),
  body('date_of_birth').optional({ values: 'falsy' }).isISO8601().withMessage('Date of birth must be a date')
    .custom(v => new Date(v) < new Date()).withMessage('Date of birth must be in the past'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email is not valid'),
  body('join_date').optional({ values: 'falsy' }).isISO8601().withMessage('Join date must be a valid date'),
  body('emergency_name').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('emergency_phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('emergency_relation').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
];
const orNull = v => (v === '' || v === undefined ? null : v);

// The member's emergency contact is their guardian marked as emergency contact.
// Saving it with a name or phone creates or updates that guardian; empty fields leave it as it is.
async function saveEmergencyContact(memberId, b) {
  if (!b.emergency_name && !b.emergency_phone) return;
  const [[existing]] = await pool.query('SELECT id FROM member_guardians WHERE member_id = ? AND is_emergency = 1 LIMIT 1', [memberId]);
  // A phone without a name still needs a label (the name column is required).
  const values = [b.emergency_name || 'Emergency contact', b.emergency_relation || null, b.emergency_phone || null];
  if (existing) {
    await pool.query('UPDATE member_guardians SET guardian_name = ?, relationship = ?, phone = ? WHERE id = ?', [...values, existing.id]);
  } else {
    await pool.query('INSERT INTO member_guardians (member_id, guardian_name, relationship, phone, is_emergency) VALUES (?, ?, ?, ?, 1)', [memberId, ...values]);
  }
}

// POST /
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    ...recordRules,
    body('join_date').optional({ values: 'falsy' }).isISO8601().withMessage('Join date must be a valid date'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { first_name, last_name, gender, date_of_birth, phone, whatsapp, email, school,
        location, unit_id, role_in_group, skills, talents, status, notes, monthly_contribution, join_date } = req.body;

      const memberCode = await nextMemberCode();

      const [result] = await pool.query(
        `INSERT INTO members (member_code, first_name, last_name, gender, date_of_birth, phone, whatsapp,
          email, school, location, unit_id, role_in_group, skills, talents, status, join_date, notes, monthly_contribution)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberCode, first_name, last_name, gender || null, date_of_birth || null, phone || null, whatsapp || null,
          email || null, school || null, location || null, unit_id || null, role_in_group || null,
          skills || null, talents || null, status || 'Active', join_date || today(), notes || null, monthly_contribution || 500]
      );
      await saveEmergencyContact(result.insertId, req.body);

      const [newMember] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
      await logAction(req, 'member.created', 'members', result.insertId, { new: newMember[0] });
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
  [param('id').isInt().withMessage('Invalid member ID'), ...recordRules],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const [existing] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const allowedFields = ['first_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'whatsapp', 'email',
        'school', 'location', 'unit_id', 'role_in_group', 'skills', 'talents', 'status', 'notes', 'photo_consent', 'monthly_contribution', 'join_date'];
      if (req.body.join_date === '') delete req.body.join_date; // an empty join date keeps the current one
      // Optional fields that cannot hold empty text (dates, numbers, choices): empty means "none".
      const emptyMeansNone = ['gender', 'date_of_birth', 'email', 'unit_id', 'whatsapp', 'phone'];

      const fields = [];
      const params = [];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          fields.push(`${field} = ?`);
          params.push(emptyMeansNone.includes(field) ? orNull(req.body[field]) : req.body[field]);
        }
      }

      const hasEmergency = req.body.emergency_name || req.body.emergency_phone;
      if (fields.length === 0 && !hasEmergency) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      if (fields.length) {
        params.push(req.params.id);
        await pool.query(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      await saveEmergencyContact(Number(req.params.id), req.body);

      const [updated] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
      await logAction(req, 'member.updated', 'members', Number(req.params.id), { old: existing[0], new: updated[0] });
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
      await logAction(req, 'member.deleted', 'members', Number(req.params.id), { new: { status: 'Inactive' } });
      res.json({ success: true, message: 'Member deactivated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
