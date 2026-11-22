const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { endAllSessions } = require('../utils/sessions');

const USER_SUMMARY = `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at, r.name as role_name
       FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`;

// GET /api/users — Admin: list all user accounts
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { role, search } = req.query;
    let sql = `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.last_login, u.created_at,
                      r.name as role_name
               FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE 1=1`;
    const params = [];
    if (role) { sql += ' AND r.name = ?'; params.push(role); }
    if (search) { sql += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY u.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/roles — Admin: list all roles
router.get('/roles', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List roles error:', err.message);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// POST /api/users — Admin: create a new user account
router.post('/', authenticate, authorize('super_admin'), [
  body('email').isEmail().withMessage('Valid email is required'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').notEmpty().withMessage('Role is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, first_name, last_name, phone, password, role } = req.body;

    // Check duplicate email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Get role_id
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
    const role_id = roleRows.length ? roleRows[0].id : 5;

    const [result] = await pool.query(
      'INSERT INTO users (email, first_name, last_name, phone, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [email, first_name, last_name, phone || null, password_hash, role_id]
    );

    const [rows] = await pool.query(USER_SUMMARY, [result.insertId]);
    await logAction(req, 'user.created', 'users', result.insertId, { new: rows[0] });
    res.status(201).json({ success: true, data: rows[0] || rows[rows.length - 1] });
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id — Admin: update user (role, active status, profile)
router.put('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { first_name, last_name, phone, role, is_active, password } = req.body;
    if (password && String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const [existing] = await pool.query(USER_SUMMARY, [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'User not found' });

    const fields = [];
    const params = [];
    if (first_name !== undefined) { fields.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { fields.push('last_name = ?'); params.push(last_name); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      fields.push('password_hash = ?'); params.push(password_hash);
    }
    if (role) {
      const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
      if (roleRows.length) { fields.push('role_id = ?'); params.push(roleRows[0].id); }
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    // A switched-off account or a new password signs the person out on every device.
    if (password || (is_active !== undefined && !Number(is_active) && is_active !== true)) await endAllSessions(req.params.id);

    const [rows] = await pool.query(USER_SUMMARY, [req.params.id]);
    await logAction(req, 'user.updated', 'users', Number(req.params.id), {
      old: existing[0], new: { ...rows[0], ...(password ? { password_changed: 'yes' } : {}) },
    });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — Admin: deactivate user
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'User not found' });

    // Prevent self-deactivation
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    await endAllSessions(req.params.id);
    await logAction(req, 'user.deleted', 'users', Number(req.params.id), { old: existing[0], new: { is_active: 0 } });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// GET /api/users/:id/activity — Admin: latest audit-log entries made by this user
router.get('/:id/activity', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT id, action, module, record_id, old_value, new_value, ip_address, created_at
       FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('User activity error:', err.message);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

// POST /api/users/:id/reset-password — Admin: reset a user's password
router.post('/:id/reset-password', authenticate, authorize('super_admin'), [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(req.body.password, salt);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.params.id]);
    await endAllSessions(req.params.id);
    await logAction(req, 'user.password_updated', 'users', Number(req.params.id));
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
