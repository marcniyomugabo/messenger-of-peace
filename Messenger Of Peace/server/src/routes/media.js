const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET / - All media
router.get('/', async (req, res) => {
  try {
    const { file_type, is_approved, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT m.* FROM media m WHERE 1=1';
    const params = [];
    if (file_type) { sql += ' AND m.file_type = ?'; params.push(file_type); }
    if (is_approved !== undefined) { sql += ' AND m.is_approved = ?'; params.push(is_approved); }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [media] = await pool.query(sql, params);
    res.json({ success: true, data: media });
  } catch (error) {
    console.error('Media list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /gallery - Public approved gallery
router.get('/gallery', async (req, res) => {
  try {
    const { file_type, event_id, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT m.* FROM media m WHERE m.is_approved = 1 AND m.is_public = 1';
    const params = [];
    if (file_type) { sql += ' AND m.file_type = ?'; params.push(file_type); }
    if (event_id) { sql += ' AND m.event_id = ?'; params.push(event_id); }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [media] = await pool.query(sql, params);
    res.json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /:id
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const [media] = await pool.query('SELECT * FROM media WHERE id = ?', [req.params.id]);
    if (media.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: media[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { title, caption, alt_text, event_id, project_id, is_public } = req.body;

    let fileType = 'Photo';
    if (req.file.mimetype.startsWith('video/')) fileType = 'Video';
    else if (req.file.mimetype === 'application/pdf') fileType = 'Document';

    const [result] = await pool.query(
      `INSERT INTO media (title, file_path, file_type, mime_type, file_size, caption, alt_text,
        event_id, project_id, is_public, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title || req.file.originalname, `/uploads/${req.file.filename}`, fileType,
       req.file.mimetype, req.file.size, caption || null, alt_text || null,
       event_id || null, project_id || null, is_public || false, req.user.id]
    );

    const [newMedia] = await pool.query('SELECT * FROM media WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'File uploaded', data: newMedia[0] });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /:id - Approve/update media
router.patch('/:id', authenticate, [param('id').isInt()], async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM media WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    const { title, caption, is_approved, is_public, alt_text } = req.body;
    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (caption !== undefined) { fields.push('caption = ?'); params.push(caption); }
    if (is_approved !== undefined) { fields.push('is_approved = ?'); params.push(is_approved); }
    if (is_public !== undefined) { fields.push('is_public = ?'); params.push(is_public); }
    if (alt_text !== undefined) { fields.push('alt_text = ?'); params.push(alt_text); }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields' });

    params.push(req.params.id);
    await pool.query(`UPDATE media SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM media WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Media updated', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, [param('id').isInt()], async (req, res) => {
  try {
    const fs = require('fs');
    const [existing] = await pool.query('SELECT * FROM media WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    const filePath = existing[0].file_path;
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM media WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Media deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
