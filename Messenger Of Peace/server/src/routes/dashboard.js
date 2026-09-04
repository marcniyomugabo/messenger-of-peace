const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Main dashboard stats
router.get('/', authenticate, async (req, res) => {
  try {
    const [members] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'Applicant' THEN 1 ELSE 0 END) as applicants,
        SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END) as suspended
      FROM members
    `);

    const [events] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Published' AND start_date >= NOW() THEN 1 ELSE 0 END) as upcoming,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
      FROM events
    `);

    const [applications] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
      FROM applications
    `);

    const [finance] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) as approved_total,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as pending_total
      FROM financial_transactions
      WHERE YEAR(created_at) = YEAR(CURDATE())
    `);

    const [contributions] = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0) as total_collected,
        COUNT(DISTINCT member_id) as contributing_members,
        SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as paid_total,
        SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as pending_total
      FROM contributions
      WHERE contribution_year = YEAR(CURDATE())
    `);

    const [units] = await pool.query(`
      SELECT u.id, u.name, u.icon,
             COUNT(um.member_id) as member_count
      FROM units u
      LEFT JOIN unit_members um ON um.unit_id = u.id AND um.is_active = 1
      WHERE u.is_active = 1
      GROUP BY u.id ORDER BY u.name
    `);

    const [recentMembers] = await pool.query(`
      SELECT id, member_code, first_name, last_name, photo, status, join_date
      FROM members WHERE status = 'Active'
      ORDER BY join_date DESC LIMIT 5
    `);

    const [upcomingEvents] = await pool.query(`
      SELECT id, title, start_date, venue, category, status
      FROM events
      WHERE status = 'Published' AND start_date >= NOW()
      ORDER BY start_date ASC LIMIT 5
    `);

    const [recentApplications] = await pool.query(`
      SELECT id, first_name, last_name, email, unit_preference, status, created_at
      FROM applications WHERE status = 'Pending'
      ORDER BY created_at DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        members: members[0],
        events: events[0],
        applications: applications[0],
        finance: finance[0],
        contributions: contributions[0],
        units,
        recent_members: recentMembers,
        upcoming_events: upcomingEvents,
        pending_applications: recentApplications,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /treasurer - Treasurer dashboard
router.get('/treasurer', authenticate, async (req, res) => {
  try {
    const [contributions] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN contribution_month = MONTH(CURDATE()) AND contribution_year = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as month_collected,
        COALESCE(SUM(CASE WHEN contribution_year = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as year_collected,
        COUNT(DISTINCT CASE WHEN status = 'Paid' THEN member_id END) as paying_members
      FROM contributions
      WHERE contribution_year = YEAR(CURDATE())
    `);

    const [recentTransactions] = await pool.query(`
      SELECT ft.*, CONCAT(m.first_name, ' ', m.last_name) as member_name
      FROM financial_transactions ft
      LEFT JOIN members m ON ft.member_id = m.id
      ORDER BY ft.created_at DESC
      LIMIT 10
    `);

    const [monthlyFinance] = await pool.query(`
      SELECT contribution_month as month,
             SUM(amount) as total,
             SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as paid
      FROM contributions
      WHERE contribution_year = YEAR(CURDATE())
      GROUP BY contribution_month
      ORDER BY contribution_month ASC
    `);

    res.json({
      success: true,
      data: {
        contributions: contributions[0],
        recent_transactions: recentTransactions,
        monthly: monthlyFinance,
      },
    });
  } catch (error) {
    console.error('Treasurer dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /unit-leader - Unit leader dashboard
router.get('/unit-leader', authenticate, async (req, res) => {
  try {
    const [member] = await pool.query('SELECT unit_id FROM members WHERE user_id = ?', [req.user.id]);
    const unitId = member[0]?.unit_id;

    if (!unitId) {
      return res.json({ success: true, data: { message: 'No unit assigned' } });
    }

    const [unitInfo] = await pool.query('SELECT * FROM units WHERE id = ?', [unitId]);

    const [members] = await pool.query(`
      SELECT m.id, m.member_code, m.first_name, m.last_name, m.photo, m.status
      FROM members m
      JOIN unit_members um ON um.member_id = m.id
      WHERE um.unit_id = ? AND um.is_active = 1 AND m.status = 'Active'
      ORDER BY m.first_name ASC
    `, [unitId]);

    const [attendance] = await pool.query(`
      SELECT a.*, CONCAT(m.first_name, ' ', m.last_name) as member_name, e.title as event_title
      FROM attendance a
      LEFT JOIN members m ON a.member_id = m.id
      LEFT JOIN events e ON a.event_id = e.id
      WHERE a.unit_id = ?
      ORDER BY a.meeting_date DESC
      LIMIT 20
    `, [unitId]);

    res.json({
      success: true,
      data: { unit: unitInfo[0], members, recent_attendance: attendance },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /member - Member dashboard
router.get('/member', authenticate, async (req, res) => {
  try {
    const [member] = await pool.query(
      `SELECT m.*, u.name as unit_name, la.position as leadership_position
       FROM members m
       LEFT JOIN units u ON m.unit_id = u.id
       LEFT JOIN leadership_assignments la ON la.member_id = m.id AND la.is_active = 1
       WHERE m.user_id = ?`,
      [req.user.id]
    );

    const [attendance] = await pool.query(`
      SELECT a.*, e.title as event_title
      FROM attendance a
      LEFT JOIN events e ON a.event_id = e.id
      WHERE a.member_id = ?
      ORDER BY a.meeting_date DESC
      LIMIT 10
    `, [member[0]?.id || 0]);

    const [contributions] = await pool.query(`
      SELECT * FROM contributions
      WHERE member_id = ?
      ORDER BY contribution_year DESC, contribution_month DESC
      LIMIT 6
    `, [member[0]?.id || 0]);

    const [upcomingEvents] = await pool.query(`
      SELECT id, title, start_date, venue
      FROM events
      WHERE status = 'Published' AND start_date >= NOW()
      ORDER BY start_date ASC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        profile: member[0],
        recent_attendance: attendance,
        contributions,
        upcoming_events: upcomingEvents,
      },
    });
  } catch (error) {
    console.error('Member dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
