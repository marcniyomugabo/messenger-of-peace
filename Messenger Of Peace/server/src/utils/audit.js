const pool = require('../config/db');

// Fields that must never be written to the audit log.
const SECRET_KEYS = /pass(word)?|hash|token|secret/i;

// Copy of a value without secret fields, as JSON text (or null).
const clean = (value) => {
  if (value === undefined || value === null) return null;
  const strip = (v) => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      return Object.fromEntries(Object.entries(v).filter(([k]) => !SECRET_KEYS.test(k)).map(([k, x]) => [k, strip(x)]));
    }
    return v;
  };
  return JSON.stringify(strip(value));
};

// Record who did what. Never throws: if logging fails the action itself still succeeds.
// Usage: logAction(req, 'member.approved', 'members', member.id, { old: before, new: after })
// `user` replaces req.user where nobody is logged in yet (login, failed login).
const logAction = async (req, action, module, recordId = null, { old: oldValue, new: newValue, user } = {}) => {
  const who = user || req.user || {};
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, module, record_id, old_value, new_value, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [who.id || null, who.email || null, action, module, recordId || null,
       clean(oldValue), clean(newValue), req.ip || null, req.get?.('user-agent') || null]
    );
  } catch (err) {
    console.error(`Audit log failed for ${action}:`, err.message);
  }
};

module.exports = { logAction };
