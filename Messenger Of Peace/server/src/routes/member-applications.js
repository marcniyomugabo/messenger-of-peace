const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { nextMemberCode } = require('../utils/memberCode');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const rateLimit = require('express-rate-limit');
const { sendEmail, applicationApproved, applicationRejected } = require('../utils/email');
const { siteUrl } = require('../config/env');
const { notifyRoles, notifyUsers, safely } = require('../utils/notify');
const { emailsToApplicantsOn } = require('../utils/siteSwitches');

// Leaders who review applications; they are alerted when a new one arrives.
const REVIEWERS = ['super_admin', 'chief', 'secretary'];

// A few applications per hour from one address: enough for a family, stops automated spam.
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many applications from this connection. Please try again later, or contact the group.' },
});

// Rwanda mobile numbers in any common spelling -> 07XXXXXXXX ('' when not valid).
// "+250 788 123 456", "250788123456", "0788-123-456" all give "0788123456".
function normalPhone(value) {
  let d = String(value || '').replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (/^2507\d{8}$/.test(d)) d = '0' + d.slice(3);
  return /^07\d{8}$/.test(d) ? d : '';
}
const rwPhone = (field, label, optional = false) => {
  const chain = optional ? body(field).optional({ values: 'falsy' }) : body(field);
  return chain.custom(v => !!normalPhone(v)).withMessage(`${label} must be a valid Rwanda phone number (e.g. 07XX XXX XXX)`);
};

// Temporary password for a newly approved member: 10 random characters, without
// look-alikes (0/O, 1/l/I) so it can be read out or written down.
function makeTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(10), b => chars[b % chars.length]).join('');
}

// Login email from the names (letters and digits only), with a number added if taken:
// "Iradukunda Cyusa" + "Samillah" -> iradukunda.cyusa.samillah@mop.rw, then ...samillah2@mop.rw
async function makeLoginEmail(firstName, secondName) {
  const clean = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  const base = [clean(firstName), clean(secondName)].filter(Boolean).join('.') || 'member';
  for (let n = 1; ; n++) {
    const email = `${base}${n === 1 ? '' : n}@mop.rw`;
    const [taken] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (taken.length === 0) return email;
  }
}

// POST / - Submit member application (public)
router.post(
  '/',
  applyLimiter,
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('second_name').notEmpty().withMessage('Second name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    rwPhone('phone', 'Phone'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('parent_first_name').notEmpty().withMessage('Parent first name is required'),
    body('parent_second_name').notEmpty().withMessage('Parent second name is required'),
    body('parent_phone').notEmpty().withMessage('Parent phone is required'),
    rwPhone('parent_phone', 'Parent phone'),
    rwPhone('emergency_phone', 'Emergency contact phone', true),
    body('gender').isIn(['Female', 'Male']).withMessage('Please choose the gender'),
    body('date_of_birth').isISO8601().withMessage('Please give the date of birth')
      .custom(v => new Date(v) < new Date()).withMessage('Date of birth must be in the past'),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email is not valid'),
    body('emergency_name').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
    body('emergency_phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
    body('emergency_relation').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      // The form sends the unit's slug (e.g. "inkesha"); only open units can be chosen.
      const [openUnit] = await pool.query('SELECT id FROM units WHERE slug = ? AND is_active = 1', [req.body.unit]);
      if (openUnit.length === 0) return res.status(400).json({ success: false, message: 'Please choose one of the units' });

      const {
        first_name, second_name, phone, location, district, sector, cell,
        unit, studying, school_name, school_location,
        has_job, job, company, current_activity,
        parent_first_name, parent_second_name, parent_phone,
        gender, date_of_birth, email, emergency_name, emergency_phone, emergency_relation,
      } = req.body;

      // Same phone already waiting for review: don't save it twice, give back the reference.
      const myPhone = normalPhone(phone);
      const [pending] = await pool.query("SELECT application_code, phone FROM member_applications WHERE status IN ('Pending', 'Reviewed')");
      const earlier = pending.find(p => normalPhone(p.phone) === myPhone);
      if (earlier) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: 'An application with this phone number is already waiting for review.',
          data: { application_code: earlier.application_code },
        });
      }

      const [result] = await pool.query(
        `INSERT INTO member_applications (
          first_name, second_name, phone, location, district, sector, cell,
          unit, studying, school_name, school_location,
          has_job, job, company, current_activity,
          parent_first_name, parent_second_name, parent_phone,
          gender, date_of_birth, email, emergency_name, emergency_phone, emergency_relation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [
          first_name, second_name, phone, location || null, district || null,
          sector || null, cell || null,
          unit, studying === 1 || studying === true ? 1 : 0,
          school_name || null, school_location || null,
          has_job === 1 || has_job === true ? 1 : (has_job === 0 || has_job === false ? 0 : null),
          job || null, company || null, current_activity || null,
          parent_first_name, parent_second_name, parent_phone,
          gender, date_of_birth, email || null, emergency_name || null, emergency_phone || null, emergency_relation || null,
        ]
      );

      // The reference comes from the row's own id, so two applications can never share one.
      const appCode = 'MOP-APP-' + String(result.insertId).padStart(4, '0');
      await pool.query('UPDATE member_applications SET application_code = ? WHERE id = ?', [appCode, result.insertId]);

      // Alert the reviewers in the dashboard (name, unit and reference only).
      // The application is saved; a failed alert must not turn it into an error for the applicant.
      const [unitRow] = await pool.query('SELECT name FROM units WHERE slug = ?', [unit]);
      await safely(notifyRoles(REVIEWERS, {
        title: 'New membership application',
        message: `${first_name} ${second_name} applied to join ${unitRow[0]?.name || unit} (reference ${appCode}).`,
        type: 'application',
        link: '/dashboard/join-requests',
      }), 'new application');

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

    // reviewed_by is a user id (the logged-in reviewer), so look the name up in users.
    let sql = `SELECT ma.*, COALESCE(NULLIF(TRIM(CONCAT_WS(' ', rv.first_name, rv.last_name)), ''), rv.email) as reviewed_by_name
       FROM member_applications ma LEFT JOIN users rv ON ma.reviewed_by = rv.id WHERE 1=1`;
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
router.get('/:id', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
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

        // Idempotency guard: the same person (name + phone) is never added twice.
        // Different people may share a name, so the login email is not used for this.
        const [existingMember] = await pool.query(
          'SELECT m.id FROM members m WHERE m.first_name = ? AND m.last_name = ? AND m.phone = ? LIMIT 1',
          [app.first_name, app.second_name, app.phone]
        );
        if (existingMember.length > 0) {
          return res.json({
            success: true,
            message: 'Application approved. Member already exists.',
            data: { id: app.id, status: 'Approved', member_id: existingMember[0].id },
          });
        }

        const memberCode = await nextMemberCode();

        // Applications store the unit's slug; older ones may hold its name instead.
        const [unit] = await pool.query('SELECT id, name FROM units WHERE slug = ? OR name = ? ORDER BY slug = ? DESC LIMIT 1', [app.unit, app.unit, app.unit]);

        const bcrypt = require('bcryptjs');
        const email = await makeLoginEmail(app.first_name, app.second_name);
        const tempPassword = makeTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const [roleResult] = await pool.query("SELECT id FROM roles WHERE name = 'member'");

        const [userResult] = await pool.query(
          'INSERT INTO users (email, first_name, last_name, phone, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?)',
          [email, app.first_name, app.second_name, app.phone || null, hashedPassword, roleResult.length > 0 ? roleResult[0].id : null]
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

        // Details from the Join Us form that the member record keeps.
        await pool.query('UPDATE members SET gender = ?, date_of_birth = ?, email = ? WHERE id = ?',
          [app.gender || null, app.date_of_birth || null, app.email || null, memberId]);

        // The parent is the emergency contact, unless the form gave someone else for that.
        const separateEmergency = !!(app.emergency_name || app.emergency_phone);
        await pool.query(
          'INSERT INTO member_guardians (member_id, guardian_name, relationship, phone, is_emergency) VALUES (?, ?, ?, ?, ?)',
          [memberId, `${app.parent_first_name} ${app.parent_second_name}`, 'Parent / guardian', app.parent_phone, separateEmergency ? 0 : 1]
        );
        if (separateEmergency) {
          await pool.query(
            'INSERT INTO member_guardians (member_id, guardian_name, relationship, phone, is_emergency) VALUES (?, ?, ?, ?, 1)',
            // The form allows a phone without a name; the contact still needs a label.
            [memberId, app.emergency_name || 'Emergency contact', app.emergency_relation || null, app.emergency_phone || null]
          );
        }

        await logAction(req, 'application.approved', 'applications', app.id, {
          old: { status: app.status }, new: { status: 'Approved', member_id: memberId, member_code: memberCode, login_email: email },
        });

        // Waiting for the new member when they first sign in.
        await safely(notifyUsers([userResult.insertId], {
          title: 'Welcome to Messengers of Peace!',
          message: `Your application was approved and you are now a member of ${unit[0]?.name || 'the group'} (member code ${memberCode}). ` +
            'You signed in with a temporary password: please change it now from the menu at the top right (Change password).',
          type: 'member',
        }), 'welcome');

        // If the applicant gave an email (and emails are switched on), send the good news with their login.
        let emailedTo = null;
        if (app.email && await emailsToApplicantsOn()) {
          const sent = await sendEmail(app.email, 'Your Messengers of Peace application is approved',
            applicationApproved(`${app.first_name} ${app.second_name}`, unit[0]?.name || app.unit,
              { email, temporary_password: tempPassword, url: `${siteUrl}/login` }));
          if (sent.success) emailedTo = app.email;
        }

        // The temporary password is only ever shown here, once; only its hash is stored.
        return res.json({
          success: true,
          message: 'Application approved',
          data: { id: app.id, status: 'Approved', member_id: memberId, login: { email, temporary_password: tempPassword }, emailed_to: emailedTo },
        });
      }

      // A rejection is emailed once, when it happens. The admin notes stay internal.
      let emailedTo = null;
      if (status === 'Rejected' && app.status !== 'Rejected' && app.email && await emailsToApplicantsOn()) {
        const sent = await sendEmail(app.email, 'Your Messengers of Peace application',
          applicationRejected(`${app.first_name} ${app.second_name}`));
        if (sent.success) emailedTo = app.email;
      }

      await logAction(req, `application.${status.toLowerCase()}`, 'applications', app.id, { old: { status: app.status }, new: { status, notes: notes || null } });
      res.json({ success: true, message: `Application ${status.toLowerCase()}`, data: { emailed_to: emailedTo } });
    } catch (error) {
      console.error('Review member application error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
