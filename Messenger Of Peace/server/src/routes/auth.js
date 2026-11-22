const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const crypto = require('crypto');
const { sendEmail, passwordResetEmail } = require('../utils/email');
const { siteUrl, isProduction } = require('../config/env');
const { startSession, findSession, renewSession, endSession, endSessionByKey, endOtherSessions, endAllSessions } = require('../utils/sessions');

// Slow down password guessing: 10 failed logins per 15 minutes from one address.
// Successful logins are not counted, so normal users are never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// sid = the device's session (see utils/sessions.js), so signing out or changing the
// password knows which device is asking.
const generateAccessToken = (user, sid) => {
  return jwt.sign(
    { id: user.id, email: user.email, role_id: user.role_id, role: user.role_name, sid },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
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
        await logAction(req, 'auth.login_failed', 'auth', null, { user: { email } });
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        await logAction(req, 'auth.login_failed', 'auth', user.id, { user: { email } });
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // A new session for this device; other devices stay signed in.
      const { sid, refreshToken } = await startSession(user.id, req);
      const accessToken = generateAccessToken(user, sid);

      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
      await logAction(req, 'auth.login', 'auth', user.id, { user });

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

// There is no public sign-up: accounts are created when an admin approves a
// Join Us application, or by a super admin from user management.

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    // Unknown, expired, signed-out or deactivated: the device must sign in again.
    const session = await findSession(refreshToken);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Your sign-in has ended. Please sign in again.' });
    }

    const newRefreshToken = await renewSession(session.sid);
    const newAccessToken = generateAccessToken({ ...session, role_name: session.role_name || 'member' }, session.sid);

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
// Signs out this device only.
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.user.sid) await endSession(req.user.sid, req.user.id);
    else if (req.body?.refreshToken) await endSessionByKey(req.body.refreshToken, req.user.id);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Same limit as login, so the current password cannot be guessed through this route.
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// POST /api/auth/change-password - any logged-in user changes their own password
router.post(
  '/change-password',
  authenticate,
  passwordChangeLimiter,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { current_password, new_password } = req.body;
      const [users] = await pool.query('SELECT id, password_hash FROM users WHERE id = ? AND is_active = 1', [req.user.id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      if (current_password === new_password) {
        return res.status(400).json({ success: false, message: 'New password must be different from the current one' });
      }

      const hashedPassword = await bcrypt.hash(new_password, 12);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.id]);
      // Anyone else signed in with the old password (another device) is signed out; this device stays.
      await endOtherSessions(req.user.id, req.user.sid);
      await logAction(req, 'auth.password_updated', 'auth', req.user.id);
      res.json({ success: true, message: 'Password changed. Other devices have been signed out.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ===== Forgot password =====
// 1. POST /forgot-password {email}: if the account exists, a one-time link is emailed.
//    The answer is always the same, so nobody can find out which emails have an account.
// 2. POST /reset-password {token, password}: the link's token sets a new password.
const RESET_MINUTES = 30;
const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');

// 5 requests per 15 minutes from one address: enough for a person, too few to flood inboxes.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
});

// Choosing the new password: 10 tries per 15 minutes (enough for typing mistakes,
// far too few to guess a link's 64-character token).
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

const FORGOT_ANSWER = 'If an account uses this email, a link to reset the password has been sent to its email address. '
  + 'The link works for 30 minutes. No email? Ask a group leader to reset your password.';

router.post(
  '/forgot-password',
  forgotLimiter,
  [body('email').trim().isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const email = req.body.email.toLowerCase();
      const [[user]] = await pool.query(
        `SELECT u.id, u.email, m.email AS member_email FROM users u
         LEFT JOIN members m ON m.user_id = u.id
         WHERE LOWER(u.email) = ? AND u.is_active = 1 LIMIT 1`,
        [email]
      );
      if (user) {
        // Members approved from Join Us get a made-up login (name@mop.rw) with no real inbox,
        // so their own email from the member record is used when there is one.
        const generated = /@mop\.rw$/i.test(user.email);
        const sendTo = user.member_email || (generated ? null : user.email);
        if (sendTo) {
          const token = crypto.randomBytes(32).toString('hex');
          // Older unused links stop working: only the newest one is valid.
          await pool.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [user.id]);
          await pool.query(
            'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL ? MINUTE)',
            [user.id, hashToken(token), RESET_MINUTES]
          );
          const link = `${siteUrl}/reset-password?token=${token}`;
          const sent = await sendEmail(sendTo, 'Reset your password', passwordResetEmail(link, RESET_MINUTES));
          // Without email settings (on a developer's computer) the link is shown in the server log instead.
          if (sent.skipped && !isProduction) console.log(`[DEV] Password reset link for ${user.email}: ${link}`);
          await logAction(req, 'auth.password_reset_requested', 'auth', user.id, { user });
        } else {
          await logAction(req, 'auth.password_reset_no_email', 'auth', user.id, { user });
        }
      }
      res.json({ success: true, message: FORGOT_ANSWER });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.post(
  '/reset-password',
  resetLimiter,
  [
    body('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('This reset link is not valid'),
    body('password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const [[reset]] = await pool.query(
        `SELECT pr.id, pr.user_id, u.email FROM password_resets pr
         JOIN users u ON u.id = pr.user_id AND u.is_active = 1
         WHERE pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
        [hashToken(req.body.token)]
      );
      if (!reset) {
        return res.status(400).json({ success: false, message: 'This reset link is not valid or has expired. Please ask for a new one.' });
      }
      const hashedPassword = await bcrypt.hash(req.body.password, 12);
      // The link is used up, and every device that was logged in must log in again.
      await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [reset.id]);
      await pool.query('UPDATE users SET password_hash = ?, refresh_token = NULL WHERE id = ?', [hashedPassword, reset.user_id]);
      await endAllSessions(reset.user_id); // every device signs in again with the new password
      await logAction(req, 'auth.password_reset', 'auth', reset.user_id, { user: { id: reset.user_id, email: reset.email } });
      res.json({ success: true, message: 'Your password has been changed. You can now log in.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.is_active, r.name as role, r.name as role_name, r.id as role_id
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
