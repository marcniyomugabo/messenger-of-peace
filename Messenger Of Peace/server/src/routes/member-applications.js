const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail, applicationApproved, applicationRejected } = require('../utils/email');

const UNIT_AGE_MAP = {
  'Abatoni': { min: 6, max: 12 },
  'Inkesha': { min: 13, max: 16 },
  'Abahizi': { min: 17, max: 20 },
  'Ingenzi': { min: 21, max: 25 },
};

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// POST / - Submit member application (public)
router.post(
  '/',
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('second_name').notEmpty().withMessage('Second name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('parent_first_name').notEmpty().withMessage('Parent first name is required'),
    body('parent_second_name').notEmpty().withMessage('Parent second name is required'),
    body('parent_phone').notEmpty().withMessage('Parent phone is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const {
        first_name, second_name, phone, location, district, sector, cell,
        unit, studying, school_name, school_location,
        has_job, job, company, current_activity,
        parent_first_name, parent_second_name, parent_phone,
      } = req.body;

      const [countResult] = await pool.query('SELECT COUNT(*) as cnt FROM member_applications');
      const appCode = 'MOP-APP-' + String((countResult[0]?.cnt || 0) + 1).padStart(4, '0');

      const [result] = await pool.query(
        `INSERT INTO member_applications (
          application_code, first_name, second_name, phone, location, district, sector, cell,
          unit, studying, school_name, school_location,
          has_job, job, company, current_activity,
          parent_first_name, parent_second_name, parent_phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [
          appCode, first_name, second_name, phone, location || null, district || null,
          sector || null, cell || null,
          unit, studying === 1 || studying === true ? 1 : 0,
          school_name || null, school_location || null,
          has_job === 1 || has_job === true ? 1 : (has_job === 0 || has_job === false ? 0 : null),
          job || null, company || null, current_activity || null,
          parent_first_name, parent_second_name, parent_phone,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully.',
        data: { id: result.insertId, application_code: appCode, first_name, second_name, unit, status: 'Pending' }
      });
    } catch (error) {
      console.error('Submit member application error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET / - All member applications (admin)
router.get('/', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT ma.*, CONCAT(rv.first_name, ' ', rv.last_name) as reviewed_by_name
       FROM member_applications ma LEFT JOIN members rv ON ma.reviewed_by = rv.id WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND ma.status = ?'; params.push(status); }
    if (search) {
      sql += ' AND (ma.first_name LIKE ? OR ma.second_name LIKE ? OR ma.application_code LIKE ? OR ma.phone LIKE ?)';
      const s = `%${search}%`; params.push(s, s, s, s);
    }

    sql += ' ORDER BY ma.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [applications] = await pool.query(sql, params);
    const [counts] = await pool.query('SELECT status, COUNT(*) as count FROM member_applications GROUP BY status');

    res.json({ success: true, data: { applications, status_counts: counts } });
  } catch (error) {
    console.error('Get member applications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [apps] = await pool.query('SELECT * FROM member_applications WHERE id = ?', [req.params.id]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: apps[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /:id/review - Approve or Reject
router.patch(
  '/:id/review',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [param('id').isInt(), body('status').isIn(['Reviewed', 'Approved', 'Rejected'])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT * FROM member_applications WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

      const app = existing[0];
      const { status, notes } = req.body;

      // Prevent re-approving an application that was already approved (idempotency).
      if (app.status === 'Approved' && status === 'Approved') {
        const [existingApproved] = await pool.query(
          'SELECT id FROM members WHERE first_name = ? AND last_name = ? AND phone = ?',
          [app.first_name, app.second_name, app.phone]
        );
        return res.status(200).json({
          success: true,
          message: 'Application was already approved.',
          data: { id: app.id, status: 'Approved', member_id: existingApproved.length > 0 ? existingApproved[0].id : null },
        });
      }

      await pool.query(
        'UPDATE member_applications SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?',
        [status, notes || null, req.user.id, req.params.id]
      );

      if (status === 'Approved') {
        const app = existing[0];

        // Idempotency guard: do not create a duplicate user/member if approved already.
        const email = `${app.first_name.toLowerCase()}.${app.second_name.toLowerCase()}@mop.rw`;
        const [existingMember] = await pool.query(
          'SELECT m.id FROM members m LEFT JOIN users u ON m.user_id = u.id WHERE u.email = ? OR (m.first_name = ? AND m.last_name = ? AND m.phone = ?) LIMIT 1',
          [email, app.first_name, app.second_name, app.phone]
        );
        if (existingMember.length > 0) {
          return res.json({
            success: true,
            message: 'Application approved. Member already exists.',
            data: { id: app.id, status: 'Approved', member_id: existingMember[0].id },
          });
        }

        const unitMap = { abatoni: 'Abatoni', inkesha: 'Inkesha', abahizi: 'Abahizi', ingenzi: 'Ingenzi' };
        const unitName = unitMap[app.unit] || app.unit;

        const [mCount] = await pool.query('SELECT COUNT(*) as cnt FROM members');
        const memberCode = 'MOP-' + String((mCount[0]?.cnt || 0) + 1).padStart(4, '0');

        const [unit] = await pool.query("SELECT id FROM units WHERE name = ?", [unitName]);

        const bcrypt = require('bcryptjs');
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const [roleResult] = await pool.query("SELECT id FROM roles WHERE name = 'member'");

        const [userResult] = await pool.query(
          'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
          [email, hashedPassword, roleResult.length > 0 ? roleResult[0].id : null]
        );

        const locationParts = [app.cell, app.sector, app.district].filter(Boolean).join(', ');

        await pool.query(
          `INSERT INTO members (user_id, member_code, first_name, last_name, phone,
            location, unit_id, status, join_date, monthly_contribution, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE(), 500, ?)`,
          [userResult.insertId, memberCode, app.first_name, app.second_name, app.phone,
           locationParts || app.location, unit.length > 0 ? unit[0].id : null,
           `Studying: ${app.studying ? 'Yes' : 'No'}${app.school_name ? ', School: ' + app.school_name : ''}${app.job ? ', Job: ' + app.job : ''}`]
        );

        const [newMember] = await pool.query('SELECT id FROM members WHERE user_id = ?', [userResult.insertId]);
        const memberId = newMember.length > 0 ? newMember[0].id : userResult.insertId;

        await pool.query(
          'INSERT INTO member_guardians (member_id, guardian_name, phone) VALUES (?, ?, ?)',
          [memberId, `${app.parent_first_name} ${app.parent_second_name}`, app.parent_phone]
        );
      }

      res.json({ success: true, message: `Application ${status.toLowerCase()}` });
    } catch (error) {
      console.error('Review member application error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
