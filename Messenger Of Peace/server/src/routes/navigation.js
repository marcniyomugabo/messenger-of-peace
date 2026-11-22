const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// A menu link is a page of this site ("/about") or a full web address. Anything else
// (for example "javascript:...") is refused, because it could run code in a visitor's browser.
const isSafeMenuUrl = (url) => /^\/(?!\/)\S*$/.test(url) || /^https?:\/\/\S+$/i.test(url);
const urlRule = (optional) => {
  const rule = body('url').trim();
  return (optional ? rule.optional() : rule.notEmpty().withMessage('URL is required'))
    .custom(isSafeMenuUrl).withMessage('URL must start with "/" (a page of this site) or with http:// or https://');
};

// GET / - Public: active items
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM navigation_items WHERE is_active = 1 ORDER BY sort_order ASC'
    );

    const nested = buildTree(items, null);
    res.json({ success: true, data: nested });
  } catch (error) {
    console.error('Navigation list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All items (authenticated)
router.get('/admin', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM navigation_items ORDER BY sort_order ASC'
    );
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Admin navigation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / - Create item (admin/chief)
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('label').trim().notEmpty().withMessage('Label is required'), urlRule(false)],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { label, url, parent_id, sort_order, is_active, opens_new_tab, icon } = req.body;

      const [countResult] = await pool.query('SELECT COUNT(*) as count FROM navigation_items');
      const order = sort_order !== undefined ? sort_order : countResult[0].count;

      const [result] = await pool.query(
        `INSERT INTO navigation_items (label, url, parent_id, sort_order, is_active, opens_new_tab, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [label, url, parent_id || null, order,
         is_active !== undefined ? is_active : true, opens_new_tab || false, icon || null]
      );

      const [newItem] = await pool.query('SELECT * FROM navigation_items WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Navigation item created', data: newItem[0] });
    } catch (error) {
      console.error('Create navigation item error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id - Update item
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt(), body('label').optional().trim().notEmpty().withMessage('Label is required'), urlRule(true)],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT id FROM navigation_items WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Navigation item not found' });

      const { label, url, parent_id, sort_order, is_active, opens_new_tab, icon } = req.body;
      const fields = [];
      const params = [];

      if (label !== undefined) { fields.push('label = ?'); params.push(label); }
      if (url !== undefined) { fields.push('url = ?'); params.push(url); }
      if (parent_id !== undefined) { fields.push('parent_id = ?'); params.push(parent_id); }
      if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
      if (opens_new_tab !== undefined) { fields.push('opens_new_tab = ?'); params.push(opens_new_tab); }
      if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }

      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

      params.push(req.params.id);
      await pool.query(`UPDATE navigation_items SET ${fields.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM navigation_items WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Navigation item updated', data: updated[0] });
    } catch (error) {
      console.error('Update navigation item error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id - Delete item
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt()],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM navigation_items WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Navigation item not found' });

      await pool.query('UPDATE navigation_items SET parent_id = NULL WHERE parent_id = ?', [req.params.id]);
      await pool.query('DELETE FROM navigation_items WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Navigation item deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PATCH /:id/reorder - Update sort_order
router.patch(
  '/:id/reorder',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt(), body('sort_order').isInt()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const [existing] = await pool.query('SELECT id FROM navigation_items WHERE id = ?', [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ success: false, message: 'Navigation item not found' });

      await pool.query('UPDATE navigation_items SET sort_order = ? WHERE id = ?', [req.body.sort_order, req.params.id]);

      const [updated] = await pool.query('SELECT * FROM navigation_items WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Navigation item reordered', data: updated[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

function buildTree(items, parentId) {
  return items
    .filter(item => item.parent_id === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id)
    }));
}

module.exports = router;
