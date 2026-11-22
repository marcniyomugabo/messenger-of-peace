const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET / - Main dashboard stats
router.get('/', authenticate, authorize('super_admin', 'chief', 'deputy_chief', 'secretary', 'treasurer', 'discipline_officer', 'unit_leader', 'media'), async (req, res) => {
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

    // Join Us requests (the form saves to member_applications)
    const [applications] = await pool.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected
      FROM member_applications
    `);

    // Group money this year: income, and expenses split by approval
    const [finance] = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM finance_income WHERE YEAR(date) = YEAR(CURDATE())) as income_total,
        (SELECT COALESCE(SUM(amount), 0) FROM finance_expenses WHERE status = 'Approved' AND YEAR(date) = YEAR(CURDATE())) as expenses_approved,
        (SELECT COALESCE(SUM(amount), 0) FROM finance_expenses WHERE status = 'Pending' AND YEAR(date) = YEAR(CURDATE())) as expenses_pending
    `);

    // Member contributions paid for this year (cancelled payments do not count)
    const [contributions] = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0) as total_collected,
        COUNT(DISTINCT member_id) as contributing_members
      FROM contribution_payments
      WHERE contribution_year = YEAR(CURDATE()) AND status != 'Cancelled'
    `);

    const [units] = await pool.query(`
      SELECT u.id, u.name, u.icon,
             COUNT(m.id) as member_count
      FROM units u
      LEFT JOIN members m ON m.unit_id = u.id AND m.status = 'Active'
      WHERE u.is_active = 1
      GROUP BY u.id ORDER BY u.display_order, u.name
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
      SELECT id, application_code, first_name, second_name, phone, unit, status, created_at
      FROM member_applications WHERE status = 'Pending'
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
router.get('/treasurer', authenticate, authorize('super_admin', 'chief', 'treasurer'), async (req, res) => {
  try {
    const [contributions] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN contribution_month = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) as month_collected,
        COALESCE(SUM(amount), 0) as year_collected,
        COUNT(DISTINCT member_id) as paying_members
      FROM contribution_payments
      WHERE contribution_year = YEAR(CURDATE()) AND status != 'Cancelled'
    `);

    // Latest group money movements, income and expenses together
    const [recentTransactions] = await pool.query(`
      SELECT * FROM (
        SELECT 'income' as type, id, date, amount, COALESCE(source, description) as description, category, 'Received' as status, created_at
        FROM finance_income
        UNION ALL
        SELECT 'expense' as type, id, date, amount, description, category, status, created_at
        FROM finance_expenses
      ) t
      ORDER BY date DESC, created_at DESC
      LIMIT 10
    `);

    const [monthlyFinance] = await pool.query(`
      SELECT contribution_month as month, SUM(amount) as total
      FROM contribution_payments
      WHERE contribution_year = YEAR(CURDATE()) AND status != 'Cancelled'
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
router.get('/unit-leader', authenticate, authorize('super_admin', 'chief', 'unit_leader'), async (req, res) => {
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
      WHERE m.unit_id = ? AND m.status = 'Active'
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
      SELECT * FROM contribution_payments
      WHERE member_id = ? AND status != 'Cancelled'
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
