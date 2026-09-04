const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Get attendance records
router.get('/', authenticate, async (req, res) => {
  try {
    const { event_id, unit_id, date_from, date_to, member_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT a.*, CONCAT(m.first_name, ' ', m.last_name) as member_name,
             e.title as event_title, un.name as unit_name
      FROM attendance a
      LEFT JOIN members m ON a.member_id = m.id
      LEFT JOIN events e ON a.event_id = e.id
      LEFT JOIN units un ON a.unit_id = un.id
      WHERE 1=1
    `;
    const params = [];

    if (event_id) { sql += ' AND a.event_id = ?'; params.push(event_id); }
    if (unit_id) { sql += ' AND a.unit_id = ?'; params.push(unit_id); }
    if (member_id) { sql += ' AND a.member_id = ?'; params.push(member_id); }
    if (date_from) { sql += ' AND a.meeting_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND a.meeting_date <= ?'; params.push(date_to); }

    sql += ' ORDER BY a.meeting_date DESC, m.first_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [records] = await pool.query(sql, params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Attendance list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /summary - Attendance summary by member
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { unit_id, date_from, date_to } = req.query;

    let sql = `
      SELECT m.id as member_id, CONCAT(m.first_name, ' ', m.last_name) as member_name,
             un.name as unit_name,
             COUNT(a.id) as total_sessions,
             SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
             SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_count,
             SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
      FROM members m
      LEFT JOIN attendance a ON m.id = a.member_id
      LEFT JOIN units un ON m.unit_id = un.id
      WHERE m.status = 'Active'
    `;
    const params = [];

    if (unit_id) { sql += ' AND m.unit_id = ?'; params.push(unit_id); }
    if (date_from) { sql += ' AND a.meeting_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND a.meeting_date <= ?'; params.push(date_to); }

    sql += ' GROUP BY m.id ORDER BY m.first_name ASC';

    const [summary] = await pool.query(sql, params);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST / - Record attendance
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [
    body('meeting_date').notEmpty().withMessage('Meeting date is required'),
    body('records').isArray({ min: 1 }).withMessage('At least one attendance record required'),
    body('records.*.member_id').isInt().withMessage('Member ID is required'),
    body('records.*.status').isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { event_id, meeting_date, unit_id, records } = req.body;

      const insertPromises = records.map((record) => {
        return pool.query(
          `INSERT INTO attendance (member_id, event_id, meeting_date, status, reason, unit_id, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason)`,
          [record.member_id, event_id || null, meeting_date, record.status, record.reason || null, unit_id || null, req.user.id]
        );
      });

      await Promise.all(insertPromises);
      res.status(201).json({ success: true, message: 'Attendance recorded', data: { meeting_date, count: records.length } });
    } catch (error) {
      console.error('Record attendance error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PATCH /:id - Update single record
router.patch(
  '/:id',
  authenticate,
  authorize('super_admin', 'chief', 'secretary'),
  [
    param('id').isInt().withMessage('Invalid attendance ID'),
    body('status').isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const [existing] = await pool.query('SELECT id FROM attendance WHERE id = ?', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Attendance record not found' });
      }

      const { status, reason } = req.body;
      const updateFields = ['status = ?'];
      const params = [status];
      if (reason !== undefined) { updateFields.push('reason = ?'); params.push(reason); }
      params.push(req.params.id);

      await pool.query(`UPDATE attendance SET ${updateFields.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'Attendance updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
