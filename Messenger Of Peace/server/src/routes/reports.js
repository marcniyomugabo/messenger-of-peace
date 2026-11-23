const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { memberStats, loadAttendance } = require('../utils/attendanceStats');

// GET /membership
router.get('/membership', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
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
router.get('/attendance', authenticate, authorize('super_admin', 'chief', 'secretary', 'unit_leader'), async (req, res) => {
  try {
    const { unit_id, date_from, date_to } = req.query;
    // Per register unit (whole-group registers shown as "Whole group"). Late counts as attended;
    // the rate leaves Excused out, like everywhere else.
    let sql = `SELECT IFNULL(u.name, 'Whole group') AS unit_name, COUNT(DISTINCT s.id) AS registers,
         SUM(a.status IN ('Present', 'Late')) AS attended, SUM(a.status = 'Absent') AS absent, SUM(a.status = 'Excused') AS excused
       FROM attendance_sessions s JOIN attendance a ON a.session_id = s.id LEFT JOIN units u ON u.id = s.unit_id WHERE 1=1`;
    const params = [];
    if (unit_id) { sql += ' AND s.unit_id = ?'; params.push(unit_id); }
    if (date_from) { sql += ' AND s.session_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND s.session_date <= ?'; params.push(date_to); }
    sql += ' GROUP BY s.unit_id, u.name ORDER BY u.name IS NULL, u.name';
    const [units] = await pool.query(sql, params);
    const byUnit = units.map(u => {
      const attended = Number(u.attended) || 0, absent = Number(u.absent) || 0;
      return { unit_name: u.unit_name, registers: u.registers, attended, absent, excused: Number(u.excused) || 0,
        rate: attended + absent ? Math.round((attended / (attended + absent)) * 100) : null };
    });

    // Best attendance: highest rate, then most registers attended.
    const [members] = await pool.query(
      `SELECT m.id, m.first_name, m.last_name, m.unit_id, m.join_date, un.name AS unit_name
       FROM members m LEFT JOIN units un ON un.id = m.unit_id WHERE m.status = 'Active'`);
    const { sessions, byMember } = await loadAttendance();
    const topAttendees = members
      .map(m => ({ m, s: memberStats(m, sessions, byMember.get(m.id) || new Map(), { from: date_from, to: date_to }) }))
      .filter(x => x.s.present + x.s.late + x.s.absent > 0)
      .sort((a, b) => (b.s.rate - a.s.rate) || ((b.s.present + b.s.late) - (a.s.present + a.s.late)))
      .slice(0, 10)
      .map(({ m, s }) => ({ name: `${m.first_name} ${m.last_name}`, unit_name: m.unit_name, sessions_present: s.present + s.late, total_sessions: s.present + s.late + s.absent, rate: s.rate }));

    res.json({ success: true, data: { by_unit: byUnit, top_attendees: topAttendees } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /finance
router.get('/finance', authenticate, authorize('super_admin', 'chief', 'treasurer'), async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();

    const [contributions] = await pool.query(`
      SELECT contribution_month, status, COUNT(*) as count, SUM(amount) as total
      FROM contribution_payments WHERE contribution_year = ?
      GROUP BY contribution_month, status ORDER BY contribution_month ASC`, [y]);

    // Same layout as before (type, status, count, total), now from income and expenses
    const [transactions] = await pool.query(`
      SELECT 'Income' as type, 'Received' as status, COUNT(*) as count, SUM(amount) as total
      FROM finance_income WHERE YEAR(date) = ?
      HAVING COUNT(*) > 0
      UNION ALL
      SELECT 'Expense' as type, status, COUNT(*) as count, SUM(amount) as total
      FROM finance_expenses WHERE YEAR(date) = ?
      GROUP BY status`, [y, y]);

    res.json({ success: true, data: { contributions, transactions, year: parseInt(y) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /events
router.get('/events', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
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
router.get('/applications', authenticate, authorize('super_admin', 'chief', 'secretary'), async (req, res) => {
  try {
    const [statusCounts] = await pool.query('SELECT status, COUNT(*) as count FROM member_applications GROUP BY status');
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM member_applications GROUP BY month ORDER BY month DESC LIMIT 12`);
    res.json({ success: true, data: { status_counts: statusCounts, monthly } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /overview
router.get('/overview', authenticate, authorize('super_admin', 'chief', 'deputy_chief', 'secretary', 'treasurer', 'discipline_officer', 'unit_leader', 'media'), async (req, res) => {
  try {
    const [members] = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "Active" THEN 1 ELSE 0 END) as active FROM members');
    const [events] = await pool.query('SELECT COUNT(*) as total FROM events WHERE status = "Published"');
    const [applications] = await pool.query('SELECT COUNT(*) as pending FROM member_applications WHERE status = "Pending"');
    const [contributions] = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM contribution_payments WHERE contribution_year = YEAR(CURDATE()) AND status != "Cancelled"');

    res.json({ success: true, data: { members: members[0], events: events[0], pending_applications: applications[0].pending, total_contributions: contributions[0].total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
