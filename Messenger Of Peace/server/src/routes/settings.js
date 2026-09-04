const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public settings (group name, contacts, etc.)
router.get('/', async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settingsObj = {};
    settings.forEach((s) => { settingsObj[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /all - All settings (admin/chief)
router.get('/all', authenticate, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM settings ORDER BY category, setting_key');
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /roles
router.get('/roles', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY name');
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /permissions
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const [permissions] = await pool.query('SELECT * FROM permissions ORDER BY module, name');
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT / - Update settings
router.put('/', authenticate, authorize('super_admin', 'chief'), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object required' });
    }

    const promises = Object.entries(settings).map(([key, value]) => {
      return pool.query(
        'INSERT INTO settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
        [key, String(value), req.user.id]
      );
    });

    await Promise.all(promises);
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /roles/:id/permissions
router.put('/roles/:id/permissions', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { permission_ids } = req.body;
    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ success: false, message: 'Permission IDs array required' });
    }

    const roleId = req.params.id;
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    if (permission_ids.length > 0) {
      const promises = permission_ids.map((permId) => {
        return pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
      });
      await Promise.all(promises);
    }

    res.json({ success: true, message: 'Role permissions updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
