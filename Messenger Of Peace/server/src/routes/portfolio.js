const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Public: published projects
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT pp.*, CONCAT(m.first_name, " ", m.last_name) as creator_name FROM portfolio_projects pp LEFT JOIN members m ON pp.created_by = m.id WHERE pp.status = ?';
    const params = [status || 'Published'];

    sql += ' ORDER BY pp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [projects] = await pool.query(sql, params);
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Portfolio list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /pending
router.get('/pending', authenticate, authorize('super_admin', 'chief'), async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT pp.*, CONCAT(m.first_name, ' ', m.last_name) as creator_name
       FROM portfolio_projects pp LEFT JOIN members m ON pp.created_by = m.id
       WHERE pp.status IN ('Draft','Submitted','Reviewed') ORDER BY pp.created_at ASC`
    );
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT pp.*, CONCAT(m.first_name, ' ', m.last_name) as creator_name
       FROM portfolio_projects pp LEFT JOIN members m ON pp.created_by = m.id WHERE pp.id = ?`,
      [req.params.id]
    );
    if (projects.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    const [media] = await pool.query('SELECT * FROM media WHERE project_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...projects[0], media } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /
router.post(
  '/',
  authenticate,
  [body('title').notEmpty().withMessage('Title is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      const { title, objective, description, start_date, end_date, team, beneficiaries, activities, results, is_featured } = req.body;

      const [result] = await pool.query(
        `INSERT INTO portfolio_projects (title, objective, description, start_date, end_date, team, beneficiaries, activities, results, is_featured, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, objective || null, description || null, start_date || null, end_date || null,
         team || null, beneficiaries || null, activities || null, results || null, is_featured || false, req.user.id]
      );

      const [newProject] = await pool.query('SELECT * FROM portfolio_projects WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, message: 'Project created', data: newProject[0] });
    } catch (error) {
      console.error('Create portfolio error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /:id
router.put('/:id', authenticate, authorize('super_admin', 'chief'), [param('id').isInt()], async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM portfolio_projects WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    const { title, objective, description, start_date, end_date, team, beneficiaries, activities, results, status, is_featured } = req.body;
    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (objective !== undefined) { fields.push('objective = ?'); params.push(objective); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (start_date !== undefined) { fields.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { fields.push('end_date = ?'); params.push(end_date); }
    if (team !== undefined) { fields.push('team = ?'); params.push(team); }
    if (beneficiaries !== undefined) { fields.push('beneficiaries = ?'); params.push(beneficiaries); }
    if (activities !== undefined) { fields.push('activities = ?'); params.push(activities); }
    if (results !== undefined) { fields.push('results = ?'); params.push(results); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (is_featured !== undefined) { fields.push('is_featured = ?'); params.push(is_featured); }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields' });

    params.push(req.params.id);
    await pool.query(`UPDATE portfolio_projects SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM portfolio_projects WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Project updated', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /:id/approve
router.patch('/:id/approve', authenticate, authorize('super_admin', 'chief'), [param('id').isInt()], async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Published', 'Reviewed', 'Archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE portfolio_projects SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      [status, req.user.id, req.params.id]
    );
    res.json({ success: true, message: `Project ${status.toLowerCase()}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorize('super_admin', 'chief'), [param('id').isInt()], async (req, res) => {
  try {
    await pool.query('UPDATE portfolio_projects SET status = ? WHERE id = ?', ['Archived', req.params.id]);
    res.json({ success: true, message: 'Project archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
