const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// Settings the public website shows (Footer, Contact page, Home). Everything else
// (contribution amount, notification switches, ...) is only for the dashboard.
const PUBLIC_KEYS = [
  'group_name', 'group_description', 'group_location',
  'whatsapp_contact', 'phone_contact', 'email_contact',
  'meeting_day', 'meeting_time', 'meeting_location',
  'facebook_url', 'twitter_url', 'instagram_url',
  // "Support MOP" page: how people can give to the group.
  'support_text', 'support_momo_number', 'support_momo_name',
  'support_bank_name', 'support_bank_account', 'support_bank_holder',
];

// GET / - Public settings (group name, contacts, meeting info, social links)
router.get('/', async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?)', [PUBLIC_KEYS]);
    const settingsObj = {};
    settings.forEach((s) => { settingsObj[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /all - All settings (admin/chief)
router.get('/all', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM settings ORDER BY category, setting_key');
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /roles
router.get('/roles', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY name');
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /permissions
router.get('/permissions', authenticate, authorize('super_admin'), async (req, res) => {
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

    const keys = Object.keys(settings);
    const [beforeRows] = keys.length
      ? await pool.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?)', [keys])
      : [[]];

    const promises = Object.entries(settings).map(([key, value]) => {
      return pool.query(
        'INSERT INTO settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
        [key, String(value), req.user.id]
      );
    });

    await Promise.all(promises);
    await logAction(req, 'settings.updated', 'settings', null, {
      old: Object.fromEntries(beforeRows.map(r => [r.setting_key, r.setting_value])), new: settings,
    });
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
    const [beforePerms] = await pool.query('SELECT permission_id FROM role_permissions WHERE role_id = ?', [roleId]);
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    if (permission_ids.length > 0) {
      const promises = permission_ids.map((permId) => {
        return pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
      });
      await Promise.all(promises);
    }

    await logAction(req, 'role.updated', 'roles', Number(roleId), {
      old: { permission_ids: beforePerms.map(p => p.permission_id) }, new: { permission_ids },
    });
    res.json({ success: true, message: 'Role permissions updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
