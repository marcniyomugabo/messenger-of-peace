const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role_id: user.role_id, role: user.role_name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const [users] = await pool.query(
        `SELECT u.*, r.name as role_name FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.email = ? AND u.is_active = 1`,
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      await pool.query('UPDATE users SET refresh_token = ?, last_login = NOW() WHERE id = ?', [refreshToken, user.id]);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token: accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            role: user.role_name,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, password, first_name, last_name, phone } = req.body;

      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const [roleResult] = await pool.query("SELECT id FROM roles WHERE name = 'member'");
      const role_id = roleResult.length > 0 ? roleResult[0].id : null;

      const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
        [email, hashedPassword, role_id]
      );

      const memberCode = 'MOP-' + String(result.insertId).padStart(4, '0');
      await pool.query(
        'INSERT INTO members (user_id, first_name, last_name, phone, member_code, status) VALUES (?, ?, ?, ?, ?, ?)',
        [result.insertId, first_name, last_name, phone || null, memberCode, 'Active']
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { id: result.insertId, email, first_name, last_name },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE refresh_token = ?', [refreshToken]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }

    const user = users[0];
    const [roleResult] = await pool.query('SELECT name FROM roles WHERE id = ?', [user.role_id]);
    const roleName = roleResult.length > 0 ? roleResult[0].name : 'member';

    const newAccessToken = generateAccessToken({ ...user, role_name: roleName });
    const newRefreshToken = generateRefreshToken(user);

    await pool.query('UPDATE users SET refresh_token = ? WHERE id = ?', [newRefreshToken, user.id]);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: { token: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.is_active, r.name as role_name, r.id as role_id
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [perms] = await pool.query(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [users[0].role_id]
    );

    const [member] = await pool.query(
      'SELECT * FROM members WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...users[0],
        permissions: perms.map(p => p.name),
        member: member.length > 0 ? member[0] : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
