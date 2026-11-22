const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET / - Public: published information documents
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM information_documents WHERE status = ?';
    const params = ['Published'];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Information list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /admin - All documents (authenticated)
router.get('/admin', authenticate, authorize('super_admin', 'chief', 'media'), async (req, res) => {
  try {
    const { category, search, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM information_documents WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin information error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / - Create document (authenticated)
router.post('/', authenticate, authorize('super_admin', 'chief', 'media'), [body('title').notEmpty().withMessage('Title is required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    const { title, description, category, fileName, file } = req.body;
    const [result] = await pool.query(
      'INSERT INTO information_documents (title, description, category, file_name, file_path, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || null, category || 'Guide', fileName || null, file || null, req.user.id]
    );
    const [newDoc] = await pool.query('SELECT * FROM information_documents WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Document created', data: newDoc[0] });
  } catch (error) {
    console.error('Create information error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /:id - Update document
router.put('/:id', authenticate, authorize('super_admin', 'chief', 'media'), [param('id').isInt()], async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM information_documents WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    const { title, description, category } = req.body;
    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE information_documents SET ${fields.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.query('SELECT * FROM information_documents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Updated', data: updated[0] });
  } catch (error) {
    console.error('Update information error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, authorize('super_admin', 'chief', 'media'), [param('id').isInt()], async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM information_documents WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query('DELETE FROM information_documents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Delete information error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
