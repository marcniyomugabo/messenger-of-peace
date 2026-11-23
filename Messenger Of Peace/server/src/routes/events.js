const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// What the public may see of an event. Never the budget, organizer notes or who created it,
// and never the participants (they are children).
const PUBLIC_FIELDS = 'e.id, e.title, e.category, e.description, e.venue, e.start_date, e.end_date, e.status';
// Drafts are private; Published, Ongoing, Completed and Cancelled events are shown.
const PUBLIC_WHERE = "e.status <> 'Draft'";

// GET / - Public events. ?when=upcoming (not ended yet, soonest first) or ?when=past (newest first).
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    // Counted by day: an event stays "upcoming" for the whole day it ends.
    const ends = 'DATE(COALESCE(e.end_date, e.start_date))';
    let where = PUBLIC_WHERE;
    let order = 'e.start_date ASC';
    if (req.query.when === 'upcoming') where += ` AND ${ends} >= CURDATE()`;
    if (req.query.when === 'past') { where += ` AND ${ends} < CURDATE()`; order = 'e.start_date DESC'; }
    const [events] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM events e WHERE ${where} ORDER BY ${order} LIMIT ?`, [limit]);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Events list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All events (authenticated)
router.get('/admin', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT e.*, COUNT(ep.id) as registered_count FROM events e
       LEFT JOIN event_participants ep ON e.id = ep.event_id WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    if (category) { sql += ' AND e.category = ?'; params.push(category); }

    sql += ' GROUP BY e.id ORDER BY e.start_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [events] = await pool.query(sql, params);
    res.json({ success: true, data: { events } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id - one public event (no drafts, no participants)
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    if (!validationResult(req).isEmpty()) return res.status(404).json({ success: false, message: 'Event not found' });
    const [[event]] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM events e WHERE e.id = ? AND ${PUBLIC_WHERE}`, [req.params.id]);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id/participants - who takes part (staff only: these are children's names)
router.get('/:id/participants', authenticate, authorize('super_admin', 'chief', 'secretary', 'unit_leader'), [param('id').isInt()], async (req, res) => {
  try {
    const [participants] = await pool.query(
      `SELECT ep.*, CONCAT(m.first_name, ' ', m.last_name) as member_name
       FROM event_participants ep LEFT JOIN members m ON ep.member_id = m.id
       WHERE ep.event_id = ?`, [req.params.id]
    );
    res.json({ success: true, data: participants });
  } catch (error) {
    console.error('Event participants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [body('title').notEmpty(), body('start_date').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { title, category, description, venue, start_date, end_date, organizer, budget, status } = req.body;

      const [result] = await pool.query(
        `INSERT INTO events (title, category, description, venue, start_date, end_date, organizer, budget, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, category || 'Other', description || null, venue || null, start_date,
         end_date || null, organizer || null, budget || 0, status || 'Draft', req.user.id]
      );

      const [newEvent] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Event created', data: newEvent[0] });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM events WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

      const { title, category, description, venue, start_date, end_date, organizer, budget, status } = req.body;
      const fields = [];
      const params = [];

      if (title !== undefined) { fields.push('title = ?'); params.push(title); }
      if (category !== undefined) { fields.push('category = ?'); params.push(category); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (venue !== undefined) { fields.push('venue = ?'); params.push(venue); }
      if (start_date !== undefined) { fields.push('start_date = ?'); params.push(start_date); }
      if (end_date !== undefined) { fields.push('end_date = ?'); params.push(end_date || null); }
      if (organizer !== undefined) { fields.push('organizer = ?'); params.push(organizer); }
      if (budget !== undefined) { fields.push('budget = ?'); params.push(budget); }
      if (status !== undefined) { fields.push('status = ?'); params.push(status); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Event updated', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id
router.delete('/:id', authenticate, authorize('super_admin', 'chief'), [param('id').isInt()], async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /:id/register
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const [member] = await pool.query('SELECT id FROM members WHERE user_id = ?', [req.user.id]);
    if (!member.length) return res.status(404).json({ success: false, message: 'Member profile not found' });

    const [existing] = await pool.query(
      'SELECT id FROM event_participants WHERE event_id = ? AND member_id = ?',
      [req.params.id, member[0].id]
    );
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Already registered' });

    await pool.query(
      'INSERT INTO event_participants (event_id, member_id, status) VALUES (?, ?, ?)',
      [req.params.id, member[0].id, 'Registered']
    );

    res.status(201).json({ success: true, message: 'Registered for event' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
