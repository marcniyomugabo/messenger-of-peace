// "Report a Concern" (safeguarding).
// Anyone can send a report, anonymously if they want. Only the people who handle safeguarding
// (super admin, chief, discipline officer) can read reports. Reports are never deleted.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { sendEmail } = require('../utils/email');

const HANDLERS = ['super_admin', 'chief', 'discipline_officer'];
const CATEGORIES = ['Child safety', 'Abuse', 'Harassment', 'Bullying', 'Fraud or theft', 'Misconduct', 'Safety risk', 'Other'];
const STATUSES = ['New', 'Being handled', 'Closed'];

// A few reports per hour from one address: enough for real use, stops automated spam.
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many reports from this connection. Please try again later, or call a group leader.' },
});

const optionalText = (field, max) => body(field).optional({ values: 'falsy' }).trim().isLength({ max }).withMessage(`${field} is too long`);

// Reference given to the reporter, e.g. MOP-C-7KQ2XD (no 0/O/1/I to avoid mix-ups).
const newReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'MOP-C-' + Array.from(crypto.randomBytes(6), b => chars[b % chars.length]).join('');
};

// POST /api/concerns - send a report (public)
router.post(
  '/',
  reportLimiter,
  [
    body('category').isIn(CATEGORIES).withMessage('Please choose what the concern is about'),
    body('description').trim().isLength({ min: 20, max: 5000 }).withMessage('Please describe what happened (at least 20 characters)'),
    optionalText('happened_on', 100),
    optionalText('location', 255),
    optionalText('people_involved', 2000),
    optionalText('reporter_name', 150),
    optionalText('reporter_contact', 150),
    optionalText('reporter_relation', 100),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const b = req.body;
      const anonymous = b.anonymous === true || b.anonymous === 1 || b.anonymous === 'true';
      const reference = newReference();
      await pool.query(
        `INSERT INTO concerns (reference, category, description, happened_on, location, people_involved, child_in_danger,
          is_anonymous, reporter_name, reporter_contact, reporter_relation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reference, b.category, b.description, b.happened_on || null, b.location || null, b.people_involved || null,
         b.child_in_danger ? 1 : 0, anonymous ? 1 : 0,
         anonymous ? null : (b.reporter_name || null), anonymous ? null : (b.reporter_contact || null),
         anonymous ? null : (b.reporter_relation || null)]
      );

      // Tell the handlers that a report arrived. The notification never contains the details.
      const urgent = b.child_in_danger ? ' URGENT: a child may be in danger now.' : '';
      const [handlers] = await pool.query(
        `SELECT u.id, u.email, m.email AS member_email FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN members m ON m.user_id = u.id
         WHERE r.name IN (?) AND u.is_active = 1`,
        [HANDLERS]
      );
      for (const h of handlers) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, 'alert', '/dashboard/concerns', 0)`,
          [h.id, 'New concern reported', `A concern about "${b.category}" was reported (reference ${reference}).${urgent} Open Concerns in the dashboard.`]
        );
        const to = h.member_email || (/@mop\.rw$/i.test(h.email) ? null : h.email);
        if (to) {
          sendEmail(to, `New concern reported (${reference})`,
            `<p>A concern about <strong>${b.category}</strong> was reported on the website (reference ${reference}).${urgent}</p>
             <p>For privacy the details are not in this email. Please log in and open <strong>Concerns</strong> in the dashboard.</p>`);
        }
      }

      await logAction(req, 'concern.reported', 'concerns', null, { new: { reference, category: b.category, child_in_danger: !!b.child_in_danger } });
      res.status(201).json({ success: true, message: 'Thank you. Your report has been received.', data: { reference } });
    } catch (error) {
      console.error('Report concern error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/concerns - list (handlers only). The full text is only shown when one report is opened.
router.get('/', authenticate, authorize(...HANDLERS), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.reference, c.category, c.status, c.child_in_danger, c.is_anonymous, c.created_at, c.updated_at,
              u.email AS handled_by_email
       FROM concerns c LEFT JOIN users u ON u.id = c.handled_by
       ORDER BY (c.status = 'Closed'), c.child_in_danger DESC, c.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List concerns error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/concerns/:id - one report (handlers only). Every opening is recorded.
router.get('/:id', authenticate, authorize(...HANDLERS), [param('id').isInt()], async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT c.*, u.email AS handled_by_email FROM concerns c LEFT JOIN users u ON u.id = c.handled_by WHERE c.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await logAction(req, 'concern.viewed', 'concerns', row.id);
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('View concern error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/concerns/:id - status and private notes (handlers only)
router.patch(
  '/:id',
  authenticate,
  authorize(...HANDLERS),
  [
    param('id').isInt(),
    body('status').optional().isIn(STATUSES).withMessage('Unknown status'),
    body('handler_notes').optional({ nullable: true }).isLength({ max: 10000 }).withMessage('Notes are too long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
      const [[before]] = await pool.query('SELECT id, status FROM concerns WHERE id = ?', [req.params.id]);
      if (!before) return res.status(404).json({ success: false, message: 'Not found' });

      const status = req.body.status ?? before.status;
      const fields = ['status = ?', 'handled_by = ?'];
      const params = [status, req.user.id];
      if (req.body.handler_notes !== undefined) { fields.push('handler_notes = ?'); params.push(req.body.handler_notes || null); }
      await pool.query(`UPDATE concerns SET ${fields.join(', ')} WHERE id = ?`, [...params, req.params.id]);

      // The audit log records who changed the status, never the notes themselves.
      await logAction(req, 'concern.updated', 'concerns', before.id, { old: { status: before.status }, new: { status } });
      res.json({ success: true, message: 'Saved' });
    } catch (error) {
      console.error('Update concern error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
module.exports.CATEGORIES = CATEGORIES;
