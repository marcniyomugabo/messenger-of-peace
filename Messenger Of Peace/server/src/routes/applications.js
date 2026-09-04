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
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getUnitForAge(age) {
  for (const [name, range] of Object.entries(UNIT_AGE_MAP)) {
    if (age >= range.min && age <= range.max) return name;
  }
  return null;
}

// POST / - Submit application (public)
router.post(
  '/',
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('date_of_birth').notEmpty().withMessage('Date of birth is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const {
        first_name, last_name, date_of_birth, phone, location,
        unit_preference, recommended_unit, age_at_application,
        education_status, school_name, study_level, field_of_study,
        employment_status, company_name, job_title, occupation,
        business_name, business_description, other_description,
        motivation, parent_guardian_name, parent_guardian_phone,
      } = req.body;

      // Backend age validation
      const age = calcAge(date_of_birth);
      if (age < 6) return res.status(400).json({ success: false, message: 'Applicant must be at least 6 years old.' });
      if (age > 25) return res.status(400).json({ success: false, message: 'Applicants above 25 should contact MOP leadership.' });

      const expectedUnit = getUnitForAge(age);
      if (unit_preference && unit_preference !== expectedUnit) {
        return res.status(400).json({ success: false, message: `Based on age ${age}, the correct unit is ${expectedUnit}.` });
      }

      // Generate application code
      const [countResult] = await pool.query('SELECT COUNT(*) as cnt FROM applications');
      const appCode = 'MOP-APP-' + String((countResult[0]?.cnt || 0) + 1).padStart(4, '0');

      const [result] = await pool.query(
        `INSERT INTO applications (
          first_name, last_name, date_of_birth, phone, location,
          unit_preference, recommended_unit, age_at_application,
          education_status, school_name, study_level, field_of_study,
          employment_status, company_name, job_title, occupation,
          business_name, business_description, other_description,
          motivation, parent_guardian_name, parent_guardian_phone, application_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name, last_name, date_of_birth || null, phone, location || null,
          unit_preference || expectedUnit, recommended_unit || expectedUnit, age,
          education_status || null, school_name || null, study_level || null, field_of_study || null,
          employment_status || null, company_name || null, job_title || null, occupation || null,
          business_name || null, business_description || null, other_description || null,
          motivation || null, parent_guardian_name || null, parent_guardian_phone || null, appCode,
        ]
      );

      // Also create member as Applicant
      const [mCount] = await pool.query('SELECT COUNT(*) as cnt FROM members');
      const memberCode = 'MOP-' + String((mCount[0]?.cnt || 0) + 1).padStart(4, '0');

      const [unit] = await pool.query("SELECT id FROM units WHERE name LIKE ?", [`%${unit_preference || expectedUnit || ''}%`]);

      const [memberResult] = await pool.query(
        `INSERT INTO members (member_code, first_name, last_name, date_of_birth, phone,
          location, unit_id, status, join_date, notes, monthly_contribution)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Applicant', CURDATE(), ?, 500)`,
        [memberCode, first_name, last_name, date_of_birth || null, phone,
         location || null, unit.length > 0 ? unit[0].id : null,
         motivation || null]
      );

      if (parent_guardian_name || parent_guardian_phone) {
        await pool.query(
          'INSERT INTO member_guardians (member_id, guardian_name, phone) VALUES (?, ?, ?)',
          [memberResult.insertId, parent_guardian_name || null, parent_guardian_phone || null]
        );
      }

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully.',
        data: { id: result.insertId, application_code: appCode, member_id: memberResult.insertId, first_name, last_name, status: 'Pending' }
      });
    } catch (error) {
      console.error('Submit application error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET / - All applications (admin)
router.get('/', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT a.*, CONCAT(rv.first_name, ' ', rv.last_name) as reviewed_by_name
       FROM applications a LEFT JOIN members rv ON a.reviewed_by = rv.id WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (search) {
      sql += ' AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.application_code LIKE ?)';
      const s = `%${search}%`; params.push(s, s, s);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [applications] = await pool.query(sql, params);
    const [counts] = await pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status');

    res.json({ success: true, data: { applications, status_counts: counts } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [apps] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: apps[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /:id/review
router.patch(
  '/:id/review',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [param('id').isInt(), body('status').isIn(['Reviewed', 'Approved', 'Rejected'])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

      const { status, notes } = req.body;
      await pool.query(
        'UPDATE applications SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
        [status, notes || null, req.user.id, req.params.id]
      );

      if (status === 'Approved') {
        const app = existing[0];

        const [existingMember] = await pool.query(
          "SELECT id FROM members WHERE first_name = ? AND last_name = ? AND phone = ? AND status = 'Applicant' ORDER BY id DESC LIMIT 1",
          [app.first_name, app.last_name, app.phone]
        );

        if (existingMember.length > 0) {
          const unitName = app.unit_preference || app.recommended_unit || '';
          const [unit] = await pool.query("SELECT id FROM units WHERE name LIKE ?", [`%${unitName}%`]);
          await pool.query("UPDATE members SET status = 'Active', unit_id = ? WHERE id = ?",
            [unit.length > 0 ? unit[0].id : null, existingMember[0].id]);
        } else {
          const bcrypt = require('bcryptjs');
          const tempPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(tempPassword, 12);

          const [roleResult] = await pool.query("SELECT id FROM roles WHERE name = 'member'");
          const role_id = roleResult.length > 0 ? roleResult[0].id : null;

          const email = app.email || `${app.first_name.toLowerCase()}.${app.last_name.toLowerCase()}@mop.rw`;

          const [userResult] = await pool.query(
            'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
            [email, hashedPassword, role_id]
          );

          const [mCount] = await pool.query('SELECT COUNT(*) as cnt FROM members');
          const memberCode = 'MOP-' + String((mCount[0]?.cnt || 0) + 1).padStart(4, '0');

          const unitName = app.unit_preference || app.recommended_unit || '';
          const [unit] = await pool.query("SELECT id FROM units WHERE name LIKE ?", [`%${unitName}%`]);

          await pool.query(
            `INSERT INTO members (user_id, member_code, first_name, last_name, date_of_birth, phone,
              location, unit_id, status, join_date, monthly_contribution)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE(), 500)`,
            [userResult.insertId, memberCode, app.first_name, app.last_name, app.date_of_birth,
             app.phone, app.location, unit.length > 0 ? unit[0].id : null]
          );
        }

        if (app.parent_guardian_name || app.parent_guardian_phone) {
          const [m] = await pool.query(
            "SELECT id FROM members WHERE first_name = ? AND last_name = ? AND phone = ? ORDER BY id DESC LIMIT 1",
            [app.first_name, app.last_name, app.phone]
          );
          if (m.length > 0) {
            const [existingG] = await pool.query('SELECT id FROM member_guardians WHERE member_id = ?', [m[0].id]);
            if (existingG.length === 0) {
              await pool.query('INSERT INTO member_guardians (member_id, guardian_name, phone) VALUES (?, ?, ?)',
                [m[0].id, app.parent_guardian_name, app.parent_guardian_phone]);
            }
          }
        }
      }

      if (status === 'Approved' && existing[0].email) {
        sendEmail(existing[0].email, 'Your Application Has Been Approved!', applicationApproved(`${existing[0].first_name} ${existing[0].last_name}`, existing[0].unit_preference)).catch(() => {});
      } else if (status === 'Rejected' && existing[0].email) {
        sendEmail(existing[0].email, 'Application Update', applicationRejected(`${existing[0].first_name} ${existing[0].last_name}`, notes)).catch(() => {});
      }

      res.json({ success: true, message: `Application ${status.toLowerCase()}` });
    } catch (error) {
      console.error('Review application error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
