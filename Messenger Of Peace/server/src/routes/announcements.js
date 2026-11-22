// Announcements. Who sees one depends on its audience:
//   All      - the public website (Home page) and everyone signed in
//   Parents  - the public website (parents have no accounts) and everyone signed in
//   Members  - everyone signed in (members and leaders)
//   Leaders  - dashboard staff only
// When one is first published it goes to the bell of everyone signed in who may see it,
// and, if asked, by email to them. Each of these happens once.
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail, announcementEmail } = require('../utils/email');
const { notifyUsers, safely } = require('../utils/notify');
const { logAction } = require('../utils/audit');

const EDITORS = ['super_admin', 'chief', 'secretary'];
const STAFF = ['super_admin', 'chief', 'deputy_chief', 'secretary', 'treasurer', 'discipline_officer', 'unit_leader', 'media'];
const AUDIENCES = ['All', 'Members', 'Leaders', 'Parents'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Draft', 'Published', 'Archived'];
const PUBLIC_AUDIENCES = ['All', 'Parents'];
const audiencesFor = (role) => (STAFF.includes(role) ? AUDIENCES : ['All', 'Members', 'Parents']);

const SELECT = `SELECT a.id, a.title, a.content, a.priority, a.target_audience, a.status, a.created_at, a.updated_at,
    a.published_at, a.notified_at, a.emailed_at,
    COALESCE(NULLIF(TRIM(CONCAT(IFNULL(u.first_name, ''), ' ', IFNULL(u.last_name, ''))), ''), u.email) AS author_name
  FROM announcements a LEFT JOIN users u ON u.id = a.created_by`;
const ORDER = " ORDER BY FIELD(a.priority, 'High', 'Medium', 'Low'), COALESCE(a.published_at, a.created_at) DESC";

// GET / - public: published announcements for the website (All and Parents). ?limit=3 for the Home page.
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 50);
    const [rows] = await pool.query(`${SELECT} WHERE a.status = 'Published' AND a.target_audience IN (?)${ORDER} LIMIT ?`, [PUBLIC_AUDIENCES, limit]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List announcements error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// GET /mine - signed in: published announcements this person may see (notice board).
router.get('/mine', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT} WHERE a.status = 'Published' AND a.target_audience IN (?)${ORDER} LIMIT 100`, [audiencesFor(req.user.role)]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('My announcements error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// GET /admin - editors: every announcement, any status.
router.get('/admin', authenticate, authorize(...EDITORS), async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `${SELECT} WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (search) { sql += ' AND (a.title LIKE ? OR a.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await pool.query(sql, params);
    const [counts] = await pool.query('SELECT status, COUNT(*) as count FROM announcements GROUP BY status');
    res.json({ success: true, data: rows, counts });
  } catch (err) {
    console.error('Admin list announcements error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// GET /:id - public: one published website announcement (drafts and staff-only ones stay private).
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    if (!validationResult(req).isEmpty()) return res.status(404).json({ success: false, message: 'Announcement not found' });
    const [rows] = await pool.query(`${SELECT} WHERE a.id = ? AND a.status = 'Published' AND a.target_audience IN (?)`, [req.params.id, PUBLIC_AUDIENCES]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get announcement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch announcement' });
  }
});

// Active users who may see an announcement for this audience.
async function audienceUsers(audience) {
  if (audience === 'Leaders') {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, m.email AS member_email FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN members m ON m.user_id = u.id WHERE u.is_active = 1 AND r.name IN (?)`, [STAFF]);
    return rows;
  }
  const [rows] = await pool.query(
    'SELECT u.id, u.email, m.email AS member_email FROM users u LEFT JOIN members m ON m.user_id = u.id WHERE u.is_active = 1');
  return rows;
}

// First publication: bell for everyone it is for; email when asked. Returns what was done.
async function announce(id, sendEmails) {
  const [[a]] = await pool.query(`${SELECT} WHERE a.id = ?`, [id]);
  if (!a || a.status !== 'Published') return { notified: 0, emailed: 0 };
  await pool.query('UPDATE announcements SET published_at = COALESCE(published_at, NOW()) WHERE id = ?', [id]);
  const users = await audienceUsers(a.target_audience);
  let notified = 0, emailed = 0;
  // Parents have no logins: their announcements go on the website (and by email if asked), not to bells.
  if (!a.notified_at && a.target_audience !== 'Parents') {
    notified = await notifyUsers(users.map(u => u.id), {
      title: a.priority === 'High' ? `Important: ${a.title}` : a.title,
      message: String(a.content || '').replace(/\s+/g, ' ').slice(0, 220),
      type: 'announcement',
      link: `/dashboard/notice-board#announcement-${a.id}`,
    });
    await pool.query('UPDATE announcements SET notified_at = NOW() WHERE id = ?', [id]);
  }
  if (sendEmails && !a.emailed_at) {
    // Real addresses only: a member's own email, or a login email that is not a generated @mop.rw one.
    const to = [...new Set(users.map(u => u.member_email || (/@mop\.rw$/i.test(u.email) ? null : u.email)).filter(Boolean))];
    for (const address of to) {
      const sent = await sendEmail(address, a.title, announcementEmail(a.title, a.content, a.author_name || 'Messengers of Peace'));
      if (sent.success) emailed++;
    }
    await pool.query('UPDATE announcements SET emailed_at = NOW() WHERE id = ?', [id]);
    return { notified, emailed, email_addresses: to.length };
  }
  return { notified, emailed };
}

const rules = (partial) => {
  const opt = (chain) => (partial ? chain.optional() : chain);
  return [
    opt(body('title')).trim().notEmpty().withMessage('Title is required').isLength({ max: 255 }).withMessage('Title is too long'),
    opt(body('content')).trim().notEmpty().withMessage('Content is required').isLength({ max: 10000 }).withMessage('Content is too long'),
    body('priority').optional().isIn(PRIORITIES).withMessage('Choose a priority'),
    body('target_audience').optional().isIn(AUDIENCES).withMessage('Choose who it is for'),
    body('status').optional().isIn(STATUSES).withMessage('Choose a status'),
  ];
};

// POST / - editors: create (and, if Published, announce).
router.post('/', authenticate, authorize(...EDITORS), rules(false), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
  try {
    const { title, content, priority, target_audience, status, send_email } = req.body;
    const [result] = await pool.query(
      'INSERT INTO announcements (title, content, priority, target_audience, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title.trim(), content.trim(), priority || 'Medium', target_audience || 'All', status || 'Draft', req.user.id]
    );
    const sent = await safely(announce(result.insertId, !!send_email), 'announcement') || { notified: 0, emailed: 0 };
    const [[row]] = await pool.query(`${SELECT} WHERE a.id = ?`, [result.insertId]);
    await logAction(req, 'announcement.created', 'announcements', result.insertId, { new: { title: row.title, status: row.status, target_audience: row.target_audience } });
    res.status(201).json({ success: true, data: row, sent });
  } catch (err) {
    console.error('Create announcement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

// PUT /:id - editors: update (announces when it is published for the first time).
router.put('/:id', authenticate, authorize(...EDITORS), [param('id').isInt(), ...rules(true)], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
  try {
    const [[existing]] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found' });
    const fields = [];
    const params = [];
    for (const f of ['title', 'content', 'priority', 'target_audience', 'status']) {
      if (req.body[f] !== undefined) { fields.push(`${f} = ?`); params.push(typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]); }
    }
    fields.push('updated_at = NOW()');
    await pool.query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    const sent = await safely(announce(req.params.id, !!req.body.send_email), 'announcement') || { notified: 0, emailed: 0 };
    const [[row]] = await pool.query(`${SELECT} WHERE a.id = ?`, [req.params.id]);
    await logAction(req, 'announcement.updated', 'announcements', Number(req.params.id), {
      old: { title: existing.title, status: existing.status, target_audience: existing.target_audience },
      new: { title: row.title, status: row.status, target_audience: row.target_audience },
    });
    res.json({ success: true, data: row, sent });
  } catch (err) {
    console.error('Update announcement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});

// DELETE /:id - editors.
router.delete('/:id', authenticate, authorize(...EDITORS), [param('id').isInt()], async (req, res) => {
  try {
    const [[existing]] = await pool.query('SELECT id, title FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found' });
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    await logAction(req, 'announcement.deleted', 'announcements', existing.id, { old: existing });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});

module.exports = router;
