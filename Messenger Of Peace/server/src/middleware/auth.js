const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

// Permissions are read from the database on every request (not stored in the token),
// so changes made in Role Management apply immediately.
const loadPermissions = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.name FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = ? AND u.is_active = 1`,
    [userId]
  );
  return rows.map(r => r.name);
};

const authorizePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (req.user.role === 'super_admin') return next();
    try {
      const permissions = await loadPermissions(req.user.id);
      if (permissions.includes(permission)) return next();
      return res.status(403).json({ success: false, message: `Permission denied: ${permission}` });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
};

const authorizeAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role === 'super_admin') return next();
    try {
      const granted = await loadPermissions(req.user.id);
      if (permissions.some(p => granted.includes(p))) return next();
      return res.status(403).json({ success: false, message: 'Permission denied' });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
};

// For checks inside a route (e.g. only some fields need an extra permission).
const hasPermission = async (user, permission) => {
  if (user?.role === 'super_admin') return true;
  return (await loadPermissions(user.id)).includes(permission);
};

module.exports = { authenticate, authorize, authorizePermission, authorizeAnyPermission, hasPermission };
