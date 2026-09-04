const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail, contactMessageReceived } = require('../utils/email');

function computeStatus(row) {
  if (row.status) return row.status;
  if (row.replied) return 'Replied';
  if (!row.is_read) return 'Unread';
  return 'Read';
}

function addStatus(rows) {
  return Array.isArray(rows) ? rows.map(r => ({ ...r, status: computeStatus(r) })) : rows;
}

router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, email, subject, message } = req.body;
    const [result] = await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message, is_read) VALUES (?, ?, ?, ?, 0)',
      [name, email, subject, message]
    );
    const [rows] = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [result.insertId]);
    const msg = rows[0] || rows[rows.length - 1];
    if (msg && !msg.status) msg.status = 'Unread';

    sendEmail(process.env.ADMIN_EMAIL || 'admin@mopscouts.rw', `New Contact: ${subject}`, contactMessageReceived(name, subject)).catch(() => {});

    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error('Contact message error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT * FROM contact_messages WHERE 1=1';
    const params = [];
    if (status) {
      if (status === 'Unread') { sql += ' AND (status = ? OR is_read = 0)'; params.push(status); }
      else if (status === 'Read') { sql += ' AND (status = ? OR (is_read = 1 AND replied IS NULL))'; params.push(status); }
      else if (status === 'Replied') { sql += ' AND (status = ? OR replied = 1)'; params.push(status); }
      else { sql += ' AND status = ?'; params.push(status); }
    }
    if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    const enriched = addStatus(rows);

    const statusCounts = { Unread: 0, Read: 0, Replied: 0, Archived: 0 };
    enriched.forEach(m => { if (statusCounts[m.status] !== undefined) statusCounts[m.status]++; });
    const counts = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    res.json({ success: true, data: enriched, counts });
  } catch (err) {
    console.error('List contact messages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    const msg = { ...rows[0], status: computeStatus(rows[0]) };
    if (msg.status === 'Unread') {
      try {
        await pool.query('UPDATE contact_messages SET is_read = 1, updated_at = NOW() WHERE id = ?', [req.params.id]);
        msg.status = 'Read';
      } catch {}
    }
    res.json({ success: true, data: msg });
  } catch (err) {
    console.error('Get contact message error:', err.message);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['Unread', 'Read', 'Replied', 'Archived'];
    if (status && !valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    if (status === 'Unread') {
      await pool.query('UPDATE contact_messages SET is_read = 0, replied = NULL, status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    } else if (status === 'Read') {
      await pool.query('UPDATE contact_messages SET is_read = 1, replied = NULL, status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    } else if (status === 'Replied') {
      await pool.query('UPDATE contact_messages SET is_read = 1, replied = 1, status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    } else {
      await pool.query('UPDATE contact_messages SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    }

    const [rows] = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, data: { ...rows[0], status: computeStatus(rows[0]) } });
  } catch (err) {
    console.error('Update contact message error:', err.message);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM contact_messages WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Message not found' });
    await pool.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Delete contact message error:', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
