const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const all = await pool.query(`SELECT * FROM notifications WHERE user_id = ? AND is_read = 0`, [req.user.id]);
    res.json({ success: true, data: { count: all.length } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = notifications.filter(n => n.is_read === 0 || n.is_read === false);

    res.json({ success: true, data: { notifications, unread_count: unread.length } });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const existing = await pool.query(`SELECT * FROM notifications WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Notification not found' });

    await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { user_id, title, message, type, link } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'title and message are required' });

    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
      [user_id || req.user.id, title, message, type || 'info', link || null]
    );

    const record = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, message: 'Notification created', data: record[0] });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await pool.query(`SELECT * FROM notifications WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Notification not found' });

    await pool.query(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
