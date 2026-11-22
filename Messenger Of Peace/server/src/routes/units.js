const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// A member's unit is members.unit_id, so units are counted from there (active members only).
const UNIT_LIST = `
  SELECT u.*, COUNT(m.id) AS member_count
  FROM units u
  LEFT JOIN members m ON m.unit_id = u.id AND m.status = 'Active'
  %WHERE%
  GROUP BY u.id
  ORDER BY u.display_order ASC, u.name ASC`;

const EDITABLE = ['name', 'description', 'focus_area', 'icon', 'min_age', 'max_age', 'color', 'activities', 'leader_id', 'is_active', 'display_order'];

const toSlug = name => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Empty form fields become NULL; ages and order become numbers.
function clean(field, value) {
  if (value === '' || value === undefined) return null;
  if (['min_age', 'max_age', 'display_order', 'leader_id'].includes(field)) return Number(value);
  if (field === 'is_active') return value ? 1 : 0;
  return value;
}

const unitRules = [
  body('name').optional().trim().notEmpty().withMessage('Unit name is required'),
  body(['min_age', 'max_age']).optional({ values: 'falsy' }).isInt({ min: 0, max: 120 }).withMessage('Ages must be whole numbers'),
  body('display_order').optional({ values: 'falsy' }).isInt().withMessage('Order must be a whole number'),
  body('color').optional({ values: 'falsy' }).matches(/^#[0-9a-fA-F]{6}$/).withMessage('Colour must look like #6B21A8'),
  body().custom(b => {
    if (b.min_age && b.max_age && Number(b.min_age) > Number(b.max_age)) throw new Error('Youngest age must not be above the oldest age');
    return true;
  }),
];

// GET / - Public list of active units (public Units page, Join Us form, member pages)
router.get('/', async (req, res) => {
  try {
    const [units] = await pool.query(UNIT_LIST.replace('%WHERE%', 'WHERE u.is_active = 1'));
    res.json({ success: true, data: units });
  } catch (error) {
    console.error('Units list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All units, including deactivated ones, for the Units page in the dashboard
router.get('/admin', authenticate, authorize('super_admin', 'chief'), async (req, res) => {
  try {
    const [units] = await pool.query(UNIT_LIST.replace('%WHERE%', ''));
    res.json({ success: true, data: units });
  } catch (error) {
    console.error('Units admin list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id - One unit with its members (staff only: it lists children's names)
router.get('/:id', authenticate, authorize('super_admin', 'chief', 'secretary', 'unit_leader'), [param('id').isInt()], async (req, res) => {
  try {
    const [units] = await pool.query(UNIT_LIST.replace('%WHERE%', 'WHERE u.id = ?'), [req.params.id]);
    if (units.length === 0) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const [members] = await pool.query(
      `SELECT id, member_code, first_name, last_name, photo, role_in_group
       FROM members WHERE unit_id = ? AND status = 'Active'
       ORDER BY first_name ASC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...units[0], members } });
  } catch (error) {
    console.error('Unit detail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief'),
  [body('name').trim().notEmpty().withMessage('Unit name is required'), ...unitRules],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const name = req.body.name;
      const slug = toSlug(name);
      const [existing] = await pool.query('SELECT id FROM units WHERE name = ? OR slug = ?', [name, slug]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Unit name already exists' });
      }

      const fields = EDITABLE.filter(f => f !== 'name' && req.body[f] !== undefined);
      const [result] = await pool.query(
        `INSERT INTO units (name, slug${fields.map(f => ', ' + f).join('')}) VALUES (?, ?${', ?'.repeat(fields.length)})`,
        [name, slug, ...fields.map(f => clean(f, req.body[f]))]
      );

      const [newUnit] = await pool.query('SELECT * FROM units WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Unit created', data: newUnit[0] });
    } catch (error) {
      console.error('Create unit error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id
// The slug is kept when a unit is renamed: applications store it, so changing it would
// break the link between those applications and their unit.
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt().withMessage('Invalid unit ID'), ...unitRules],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const [existing] = await pool.query('SELECT id FROM units WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      if (req.body.name !== undefined) {
        const [taken] = await pool.query('SELECT id FROM units WHERE name = ? AND id <> ?', [req.body.name, req.params.id]);
        if (taken.length > 0) {
          return res.status(409).json({ success: false, message: 'Unit name already exists' });
        }
      }

      const fields = EDITABLE.filter(f => req.body[f] !== undefined);
      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      await pool.query(
        `UPDATE units SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`,
        [...fields.map(f => clean(f, req.body[f])), req.params.id]
      );

      const [updated] = await pool.query('SELECT * FROM units WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Unit updated', data: updated[0] });
    } catch (error) {
      console.error('Update unit error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /:id - Deactivates the unit: hidden from the website and Join Us; its members keep it
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief'),
  [param('id').isInt().withMessage('Invalid unit ID')],
  async (req, res) => {
    try {
      const [existing] = await pool.query('SELECT id FROM units WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      await pool.query('UPDATE units SET is_active = 0 WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Unit deactivated' });
    } catch (error) {
      console.error('Deactivate unit error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
