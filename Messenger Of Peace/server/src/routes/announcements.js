const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail, announcementEmail } = require('../utils/email');

// GET /api/announcements — Public: list published announcements
router.get('/', async (req, res) => {
  try {
    const { priority, target_audience } = req.query;
    let sql = `SELECT a.*, CONCAT(m.first_name, ' ', m.last_name) as author_name
               FROM announcements a LEFT JOIN members m ON a.created_by = m.id
               WHERE a.status = 'Published'`;
    const params = [];
    if (priority) { sql += ' AND a.priority = ?'; params.push(priority); }
    if (target_audience) { sql += ' AND (a.target_audience = ? OR a.target_audience = \'All\')'; params.push(target_audience); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List announcements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// GET /api/announcements/admin — Admin: list all announcements (all statuses)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `SELECT a.*, CONCAT(m.first_name, ' ', m.last_name) as author_name
               FROM announcements a LEFT JOIN members m ON a.created_by = m.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (search) { sql += ' AND (a.title LIKE ? OR a.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await pool.query(sql, params);
    const [counts] = await pool.query('SELECT status, COUNT(*) as count FROM announcements GROUP BY status');
    res.json({ success: true, data: rows, counts });
  } catch (err) {
    console.error('Admin list announcements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// GET /api/announcements/:id — Public: single announcement
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(m.first_name, ' ', m.last_name) as author_name
       FROM announcements a LEFT JOIN members m ON a.created_by = m.id WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get announcement error:', err.message);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// POST /api/announcements — Admin: create announcement
router.post('/', authenticate, [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, content, priority, target_audience, status } = req.body;
    const authorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    const [result] = await pool.query(
      'INSERT INTO announcements (title, content, priority, target_audience, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, priority || 'Medium', target_audience || 'All', status || 'Draft', req.user.member_id || req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] || rows[rows.length - 1] });
  } catch (err) {
    console.error('Create announcement error:', err.message);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// PUT /api/announcements/:id — Admin: update announcement
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, content, priority, target_audience, status } = req.body;
    const [existing] = await pool.query('SELECT id FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Announcement not found' });

    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (priority !== undefined) { fields.push('priority = ?'); params.push(priority); }
    if (target_audience !== undefined) { fields.push('target_audience = ?'); params.push(target_audience); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    fields.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Update announcement error:', err.message);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// DELETE /api/announcements/:id — Admin: delete announcement
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM announcements WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Announcement not found' });
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
