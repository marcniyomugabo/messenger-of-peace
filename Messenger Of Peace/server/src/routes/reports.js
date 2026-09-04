const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /membership
router.get('/membership', authenticate, async (req, res) => {
  try {
    const [byUnit] = await pool.query(`
      SELECT u.id, u.name as unit_name,
             COUNT(CASE WHEN m.status = 'Active' THEN 1 END) as active_count,
             COUNT(m.id) as total_count
      FROM units u LEFT JOIN members m ON m.unit_id = u.id
      WHERE u.is_active = 1 GROUP BY u.id ORDER BY u.name`);

    const [totals] = await pool.query(`
      SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
             SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
             SUM(CASE WHEN status = 'Applicant' THEN 1 ELSE 0 END) as applicants,
             SUM(CASE WHEN status = 'Alumni' THEN 1 ELSE 0 END) as alumni
      FROM members`);

    res.json({ success: true, data: { by_unit: byUnit, totals: totals[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /attendance
router.get('/attendance', authenticate, async (req, res) => {
  try {
    const { unit_id, date_from, date_to } = req.query;
    let sql = `SELECT u.name as unit_name, a.meeting_date, a.status, COUNT(*) as count
       FROM attendance a LEFT JOIN units u ON a.unit_id = u.id WHERE 1=1`;
    const params = [];
    if (unit_id) { sql += ' AND a.unit_id = ?'; params.push(unit_id); }
    if (date_from) { sql += ' AND a.meeting_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND a.meeting_date <= ?'; params.push(date_to); }
    sql += ' GROUP BY u.name, a.meeting_date, a.status ORDER BY a.meeting_date DESC';

    const [report] = await pool.query(sql, params);

    const [topAttendees] = await pool.query(`
      SELECT CONCAT(m.first_name, ' ', m.last_name) as name, un.name as unit_name,
             COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as sessions_present,
             COUNT(a.id) as total_sessions
      FROM members m LEFT JOIN attendance a ON a.member_id = m.id LEFT JOIN units un ON m.unit_id = un.id
      WHERE m.status = 'Active' GROUP BY m.id ORDER BY sessions_present DESC LIMIT 10`);

    res.json({ success: true, data: { by_unit: report, top_attendees: topAttendees } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /finance
router.get('/finance', authenticate, async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();

    const [contributions] = await pool.query(`
      SELECT contribution_month, status, COUNT(*) as count, SUM(amount) as total
      FROM contributions WHERE contribution_year = ?
      GROUP BY contribution_month, status ORDER BY contribution_month ASC`, [y]);

    const [transactions] = await pool.query(`
      SELECT type, status, COUNT(*) as count, SUM(amount) as total
      FROM financial_transactions WHERE YEAR(created_at) = ?
      GROUP BY type, status`, [y]);

    res.json({ success: true, data: { contributions, transactions, year: parseInt(y) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /events
router.get('/events', authenticate, async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT category, status, COUNT(*) as count FROM events GROUP BY category, status`);

    const [participation] = await pool.query(`
      SELECT e.title, e.start_date, COUNT(ep.id) as registered
      FROM events e LEFT JOIN event_participants ep ON e.id = ep.event_id
      WHERE e.status = 'Published' GROUP BY e.id ORDER BY registered DESC LIMIT 10`);

    res.json({ success: true, data: { summary, top_participation: participation } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /applications
router.get('/applications', authenticate, async (req, res) => {
  try {
    const [statusCounts] = await pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status');
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM applications GROUP BY month ORDER BY month DESC LIMIT 12`);
    res.json({ success: true, data: { status_counts: statusCounts, monthly } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /overview
router.get('/overview', authenticate, async (req, res) => {
  try {
    const [members] = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "Active" THEN 1 ELSE 0 END) as active FROM members');
    const [events] = await pool.query('SELECT COUNT(*) as total FROM events WHERE status = "Published"');
    const [applications] = await pool.query('SELECT COUNT(*) as pending FROM applications WHERE status = "Pending"');
    const [contributions] = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM contributions WHERE contribution_year = YEAR(CURDATE()) AND status = "Paid"');

    res.json({ success: true, data: { members: members[0], events: events[0], pending_applications: applications[0].pending, total_contributions: contributions[0].total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
