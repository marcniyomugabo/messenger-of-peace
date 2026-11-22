const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorizePermission, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorizePermission('reports.view'), async (req, res) => {
  try {
    const { user_id, action, module: mod, date_from, date_to, limit = 50, offset = 0 } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (user_id) { where += ` AND user_id = ?`; params.push(user_id); }
    // The page filters by kind (create, update, delete, login, approve); actions are named
    // like 'member.created' or 'expense.approved', so match on the word they contain.
    if (action) { where += ` AND action LIKE ?`; params.push(`%${String(action).replace(/e$/, '')}%`); }
    if (mod) { where += ` AND module = ?`; params.push(mod); }
    if (date_from) { where += ` AND created_at >= ?`; params.push(date_from); }
    if (date_to) { where += ` AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`; params.push(date_to); }

    const [logs] = await pool.query(
      `SELECT * FROM audit_logs${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs${where}`, params);

    // Summary cards and filter lists cover the whole log, not just this page.
    const [[kpi]] = await pool.query(`
      SELECT COUNT(*) AS total_actions,
             COALESCE(SUM(DATE(created_at) = CURDATE()), 0) AS today_actions,
             COUNT(DISTINCT user_id) AS active_users,
             COUNT(DISTINCT module) AS modules_affected
      FROM audit_logs`);
    const [users] = await pool.query(`
      SELECT DISTINCT u.id, u.email, TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS name
      FROM audit_logs a JOIN users u ON u.id = a.user_id ORDER BY u.email`);
    const [modules] = await pool.query('SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module');

    res.json({
      success: true,
      data: {
        logs,
        total,
        kpi: Object.fromEntries(Object.entries(kpi).map(([k, v]) => [k, Number(v)])),
        users: users.map(u => ({ ...u, name: u.name || null })),
        modules: modules.map(m => m.module),
      },
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { action, module: mod, record_id, old_value, new_value } = req.body;
    if (!action || !mod) return res.status(400).json({ success: false, message: 'action and module are required' });

    const [result] = await pool.query(
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
