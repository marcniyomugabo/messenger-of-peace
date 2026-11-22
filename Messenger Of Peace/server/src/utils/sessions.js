// One sign-in per device. Each login creates a session with its own long-lived "refresh"
// key, so signing in on a phone no longer signs the laptop out, and signing out on one
// device leaves the others signed in. Only a hash of each key is stored.
const crypto = require('crypto');
const pool = require('../config/db');

const SESSION_DAYS = 7;
const hash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const newKey = () => crypto.randomBytes(48).toString('base64url');
const deviceOf = (req) => String(req.headers['user-agent'] || '').slice(0, 255) || null;

// A new session for this login. Returns its id (put into the access token) and the key.
async function startSession(userId, req) {
  const refreshToken = newKey();
  const [r] = await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, NOW() + INTERVAL ? DAY)`,
    [userId, hash(refreshToken), deviceOf(req), req.ip || null, SESSION_DAYS]
  );
  return { sid: r.insertId, refreshToken };
}

// The session (and its active user) for a key, or null if unknown, expired or the user is off.
async function findSession(refreshToken) {
  const [rows] = await pool.query(
    `SELECT s.id AS sid, u.*, r.name AS role_name FROM user_sessions s
     JOIN users u ON u.id = s.user_id LEFT JOIN roles r ON r.id = u.role_id
     WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1`,
    [hash(refreshToken)]
  );
  return rows[0] || null;
}

// A used key is replaced by a new one (a stolen old key stops working).
async function renewSession(sid) {
  const refreshToken = newKey();
  await pool.query(
    'UPDATE user_sessions SET token_hash = ?, last_used_at = NOW(), expires_at = NOW() + INTERVAL ? DAY WHERE id = ?',
    [hash(refreshToken), SESSION_DAYS, sid]
  );
  return refreshToken;
}

const endSession = (sid, userId) => pool.query('DELETE FROM user_sessions WHERE id = ? AND user_id = ?', [sid, userId]);
const endSessionByKey = (refreshToken, userId) => pool.query('DELETE FROM user_sessions WHERE token_hash = ? AND user_id = ?', [hash(refreshToken), userId]);
// Password changed: sign out every other device (keepSid = this one, if known).
const endOtherSessions = (userId, keepSid) => pool.query('DELETE FROM user_sessions WHERE user_id = ? AND id <> ?', [userId, keepSid || 0]);
const endAllSessions = (userId) => pool.query('DELETE FROM user_sessions WHERE user_id = ?', [userId]);

async function cleanupExpiredSessions() {
  try {
    await pool.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  } catch (error) {
    console.error('[Sessions] Cleanup failed:', error.message);
  }
}

module.exports = { startSession, findSession, renewSession, endSession, endSessionByKey, endOtherSessions, endAllSessions, cleanupExpiredSessions, hash };
