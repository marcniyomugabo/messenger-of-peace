const jwt = require('jsonwebtoken');

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

const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (req.user.role === 'super_admin') return next();
    if (req.user.permissions && req.user.permissions.includes(permission)) return next();
    return res.status(403).json({ success: false, message: `Permission denied: ${permission}` });
  };
};

const authorizeAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role === 'super_admin') return next();
    if (req.user.permissions && permissions.some(p => req.user.permissions.includes(p))) return next();
    return res.status(403).json({ success: false, message: 'Permission denied' });
  };
};

module.exports = { authenticate, authorize, authorizePermission, authorizeAnyPermission };
