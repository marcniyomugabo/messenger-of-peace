const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorizePermission } = require('../middleware/auth');

router.get('/', authenticate, authorizePermission('reports.view'), async (req, res) => {
  try {
    const { user_id, action, module: mod, date_from, date_to, limit = 50, offset = 0 } = req.query;

    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (user_id) { sql += ` AND user_id = ?`; params.push(user_id); }
    if (action) { sql += ` AND action = ?`; params.push(action); }
    if (mod) { sql += ` AND module = ?`; params.push(mod); }
    if (date_from) { sql += ` AND created_at >= ?`; params.push(date_from); }
    if (date_to) { sql += ` AND created_at <= ?`; params.push(date_to); }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const logs = await pool.query(sql, params);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { action, module: mod, record_id, old_value, new_value } = req.body;
    if (!action || !mod) return res.status(400).json({ success: false, message: 'action and module are required' });

    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, module, record_id, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.email || 'system',
        action,
        mod,
        record_id || null,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        req.ip || null
      ]
    );

    res.status(201).json({ success: true, message: 'Audit log created', data: { id: result.insertId } });
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
