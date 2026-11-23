const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { today } = require('../utils/dates');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { notifyUsers, safely } = require('../utils/notify');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Tell the member (if they have a login) that their payment was recorded.
// paid: [{ month, year, amount }]
async function notifyMemberPaid(memberId, paid) {
  if (!paid.length) return;
  const [[member]] = await pool.query('SELECT user_id FROM members WHERE id = ?', [memberId]);
  if (!member?.user_id) return;
  const total = paid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const months = paid.map(p => `${MONTH_NAMES[p.month - 1] || p.month} ${p.year}`).join(', ');
  await notifyUsers([member.user_id], {
    title: 'Contribution recorded',
    message: `Thank you! Your contribution for ${months} (${total.toLocaleString('en-US')} RWF) was recorded.`,
    type: 'payment',
  });
}

// Helper: get months between two dates
function getMonthsBetween(startYear, startMonth, endYear, endMonth) {
  const months = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ month: m, year: y });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// Helper: get monthly amount for a given date
function getAmountForDate(settings, year, month) {
  if (!settings || settings.length === 0) return 500;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  let best = settings[0];
  for (const s of settings) {
    if (s.effective_from && new Date(s.effective_from) <= new Date(dateStr)) {
      if (!best || new Date(s.effective_from) >= new Date(best.effective_from)) best = s;
    }
  }
  return best ? Number(best.monthly_amount) : 500;
}

// Helper: compute member's full dynamic contribution history
function computeMemberHistory(member, payments, settings, currentMonth, currentYear) {
  const joinDate = new Date(member.join_date);
  const joinMonth = joinDate.getMonth() + 1;
  const joinYear = joinDate.getFullYear();
  const months = getMonthsBetween(joinYear, joinMonth, currentYear, currentYear === joinYear ? Math.max(currentMonth, joinMonth) : currentMonth);
  if (currentYear === joinYear && currentMonth < joinMonth) return [];

  const history = [];
  for (const { month, year } of months) {
    const required = getAmountForDate(settings, year, month);
    const monthPayments = payments.filter(p => p.contribution_month === month && p.contribution_year === year && p.status !== 'Cancelled');
    const paid = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Math.max(0, required - paid);
    const status = paid >= required ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
    const paymentDate = monthPayments.length > 0 ? monthPayments.map(p => p.payment_date).sort().pop() : null;
    history.push({ month, year, required_amount: required, total_paid: paid, balance, status, payment_date: paymentDate, payments: monthPayments });
  }
  return history;
}

// GET /summary - Current month summary
router.get('/summary', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const cm = month ? parseInt(month) : new Date().getMonth() + 1;
    const cy = year ? parseInt(year) : new Date().getFullYear();
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const [settingsRows] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    const settings = settingsRows.length > 0 ? settingsRows : [{ monthly_amount: 500, currency: 'RWF', effective_from: '2020-01-01' }];

    const [activeMembers] = await pool.query("SELECT * FROM members WHERE status = 'Active'");
    const [allPayments] = await pool.query("SELECT * FROM contribution_payments WHERE status != 'Cancelled'");

    let total = 0, paid = 0, partial = 0, unpaid = 0, collected = 0, expected = 0;
    for (const member of activeMembers) {
      const memberPayments = allPayments.filter(p => p.member_id === member.id);
      const history = computeMemberHistory(member, memberPayments, settings, cm, cy);
      if (history.length > 0) {
        const m = history[history.length - 1];
        total++;
        expected += m.required_amount;
        collected += m.total_paid;
        if (m.status === 'Paid') paid++;
        else if (m.status === 'Partial') partial++;
        else unpaid++;
      }
    }

    // Outstanding across ALL months
    let totalOutstanding = 0;
    let membersWithMissed = new Set();
    for (const member of activeMembers) {
      const memberPayments = allPayments.filter(p => p.member_id === member.id);
      const fullHistory = computeMemberHistory(member, memberPayments, settings, curMonth, curYear);
      for (const h of fullHistory) {
        totalOutstanding += h.balance;
        if (h.status !== 'Paid') membersWithMissed.add(member.id);
      }
    }

    const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    res.json({ success: true, data: { total, paid, partial, unpaid, collected, expected, rate, outstanding: totalOutstanding, members_with_missed: membersWithMissed.size, month: cm, year: cy } });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /me - the signed-in member's own contribution history (My profile).
router.get('/me', authenticate, async (req, res) => {
  try {
    const [[member]] = await pool.query('SELECT * FROM members WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (!member) return res.json({ success: true, data: null });
    res.json({ success: true, data: await contributionReport(member) });
  } catch (error) {
    console.error('My contributions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /member/:id - Full dynamic contribution history for a member
router.get('/member/:id', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const [members] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (members.length === 0) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: await contributionReport(members[0]) });
  } catch (error) {
    console.error('Member contribution history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// One member's months, payments and totals (used by /member/:id and /me).
async function contributionReport(member) {
    const [settingsRows] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    const settings = settingsRows.length > 0 ? settingsRows : [{ monthly_amount: 500, currency: 'RWF', effective_from: '2020-01-01' }];

    const [payments] = await pool.query("SELECT * FROM contribution_payments WHERE member_id = ? AND status != 'Cancelled' ORDER BY contribution_year, contribution_month", [member.id]);

    const now = new Date();
    const history = computeMemberHistory(member, payments, settings, now.getMonth() + 1, now.getFullYear());

    const totalPaid = history.reduce((s, h) => s + h.total_paid, 0);
    const totalExpected = history.reduce((s, h) => s + h.required_amount, 0);
    const paidMonths = history.filter(h => h.status === 'Paid').length;
    const partialMonths = history.filter(h => h.status === 'Partial').length;
    const unpaidMonths = history.filter(h => h.status === 'Unpaid').length;
    const missed = history.filter(h => h.status !== 'Paid');

    return {
      member: { id: member.id, first_name: member.first_name, last_name: member.last_name, member_code: member.member_code, join_date: member.join_date, monthly_contribution: member.monthly_contribution, unit_id: member.unit_id },
      history,
      total_paid: totalPaid, total_expected: totalExpected, outstanding: totalExpected - totalPaid,
      paid_months: paidMonths, partial_months: partialMonths, unpaid_months: unpaidMonths,
      rate: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0,
      missed
    };
}

// GET / - Monthly contributions list (for selected month)
router.get('/', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const { month, year, status, unit_id, search, page = 1, limit = 200 } = req.query;
    const cm = month ? parseInt(month) : new Date().getMonth() + 1;
    const cy = year ? parseInt(year) : new Date().getFullYear();

    const [settingsRows] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    const settings = settingsRows.length > 0 ? settingsRows : [{ monthly_amount: 500, currency: 'RWF', effective_from: '2020-01-01' }];

    let memberSql = "SELECT m.*, u.name as unit_name FROM members m LEFT JOIN units u ON m.unit_id = u.id WHERE m.status = 'Active'";
    const memberParams = [];
    if (unit_id) { memberSql += ' AND m.unit_id = ?'; memberParams.push(unit_id); }
    if (search) {
      memberSql += ' AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.member_code LIKE ? OR m.phone LIKE ?)';
      const s = `%${search}%`; memberParams.push(s, s, s, s);
    }
    const [activeMembers] = await pool.query(memberSql, memberParams);
    const [allPayments] = await pool.query("SELECT * FROM contribution_payments WHERE status != 'Cancelled'");

    const results = [];
    for (const member of activeMembers) {
      const memberPayments = allPayments.filter(p => p.member_id === member.id);
      const history = computeMemberHistory(member, memberPayments, settings, cm, cy);
      if (history.length > 0) {
        const m = history[history.length - 1];
        results.push({
          id: m.month + '_' + m.year + '_' + member.id,
          member_id: member.id, member_name: `${member.first_name} ${member.last_name}`,
          member_code: member.member_code, phone: member.phone,
          unit_name: member.unit_name, unit_id: member.unit_id,
          contribution_month: m.month, contribution_year: m.year,
          required_amount: m.required_amount, total_paid: m.total_paid,
          balance: m.balance, status: m.status, payment_date: m.payment_date,
          monthly_contribution: member.monthly_contribution
        });
      }
    }

    if (status) results = results.filter(r => r.status === status);
    results.sort((a, b) => (a.member_code || '').localeCompare(b.member_code || ''));

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paged = results.slice(offset, offset + parseInt(limit));

    res.json({ success: true, data: { contributions: paged, total: results.length, month: cm, year: cy } });
  } catch (error) {
    console.error('Contributions list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /overview - All members lifetime contribution overview
router.get('/overview', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const { filter, search, page = 1, limit = 100 } = req.query;
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const [settingsRows] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    const settings = settingsRows.length > 0 ? settingsRows : [{ monthly_amount: 500, currency: 'RWF', effective_from: '2020-01-01' }];

    const [activeMembers] = await pool.query(
      "SELECT m.*, u.name as unit_name FROM members m LEFT JOIN units u ON m.unit_id = u.id WHERE m.status = 'Active' ORDER BY m.member_code"
    );
    const [allPayments] = await pool.query("SELECT * FROM contribution_payments WHERE status != 'Cancelled'");

    const results = [];
    for (const member of activeMembers) {
      const memberPayments = allPayments.filter(p => p.member_id === member.id);
      const fullHistory = computeMemberHistory(member, memberPayments, settings, curMonth, curYear);
      const totalPaid = fullHistory.reduce((s, h) => s + h.total_paid, 0);
      const totalExpected = fullHistory.reduce((s, h) => s + h.required_amount, 0);
      const paidMonths = fullHistory.filter(h => h.status === 'Paid').length;
      const unpaidMonths = fullHistory.filter(h => h.status === 'Unpaid').length;
      const partialMonths = fullHistory.filter(h => h.status === 'Partial').length;
      const currentMonthData = fullHistory.find(h => h.month === curMonth && h.year === curYear);

      results.push({
        member_id: member.id, member_name: `${member.first_name} ${member.last_name}`,
        member_code: member.member_code, join_date: member.join_date, unit_name: member.unit_name,
        monthly_contribution: member.monthly_contribution,
        paid_months: paidMonths, unpaid_months: unpaidMonths, partial_months: partialMonths,
        total_paid: totalPaid, total_expected: totalExpected, outstanding: totalExpected - totalPaid,
        current_month_status: currentMonthData ? currentMonthData.status : 'N/A',
        total_months: fullHistory.length
      });
    }

    let filtered = results;
    if (search) {
      const s = search.toLowerCase();
      filtered = results.filter(r => r.member_name.toLowerCase().includes(s) || r.member_code.toLowerCase().includes(s));
    }
    if (filter === 'paid_up') filtered = results.filter(r => r.outstanding === 0);
    else if (filter === 'has_unpaid') filtered = results.filter(r => r.unpaid_months > 0);
    else if (filter === 'has_partial') filtered = results.filter(r => r.partial_months > 0);
    else if (filter === 'current_month_unpaid') filtered = results.filter(r => r.current_month_status === 'Unpaid');
    else if (filter === 'has_outstanding') filtered = results.filter(r => r.outstanding > 0);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paged = filtered.slice(offset, offset + parseInt(limit));

    res.json({ success: true, data: { members: paged, total: filtered.length } });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /missed - Members who missed a specific month
router.get('/missed', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const cm = month ? parseInt(month) : new Date().getMonth() + 1;
    const cy = year ? parseInt(year) : new Date().getFullYear();

    const [settingsRows] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    const settings = settingsRows.length > 0 ? settingsRows : [{ monthly_amount: 500, currency: 'RWF', effective_from: '2020-01-01' }];

    const [activeMembers] = await pool.query(
      "SELECT m.*, u.name as unit_name FROM members m LEFT JOIN units u ON m.unit_id = u.id WHERE m.status = 'Active'"
    );
    const [allPayments] = await pool.query("SELECT * FROM contribution_payments WHERE status != 'Cancelled'");

    const missed = [];
    for (const member of activeMembers) {
      const memberPayments = allPayments.filter(p => p.member_id === member.id);
      const history = computeMemberHistory(member, memberPayments, settings, cm, cy);
      const monthData = history.find(h => h.month === cm && h.year === cy);
      if (monthData && monthData.status !== 'Paid') {
        missed.push({
          member_id: member.id, member_name: `${member.first_name} ${member.last_name}`,
          member_code: member.member_code, unit_name: member.unit_name,
          required_amount: monthData.required_amount, total_paid: monthData.total_paid,
          balance: monthData.balance, status: monthData.status
        });
      }
    }

    res.json({ success: true, data: { missed, month: cm, year: cy, total: missed.length } });
  } catch (error) {
    console.error('Missed error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /settings
router.get('/settings', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    res.json({ success: true, data: settings[0] || { monthly_amount: 500, currency: 'RWF' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /settings
router.put('/settings', authenticate, authorize('super_admin', 'chief'), async (req, res) => {
  try {
    const { monthly_amount, currency } = req.body;
    if (!monthly_amount || monthly_amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const now = today();
    const [existing] = await pool.query('SELECT id FROM contribution_settings LIMIT 1');
    if (existing.length > 0) {
      await pool.query('UPDATE contribution_settings SET monthly_amount = ?, currency = ?, updated_at = NOW() WHERE id = ?', [monthly_amount, currency || 'RWF', existing[0].id]);
    } else {
      await pool.query('INSERT INTO contribution_settings (monthly_amount, currency, effective_from) VALUES (?, ?, ?)', [monthly_amount, currency || 'RWF', now]);
    }
    await logAction(req, 'contribution_settings.updated', 'contributions', null, { new: { monthly_amount, currency: currency || 'RWF' } });
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /payments - All payment records
router.get('/payments', authenticate, authorize('super_admin', 'chief', 'treasurer', 'secretary'), async (req, res) => {
  try {
    const { month, year, status, payment_method, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT cp.*, CONCAT(m.first_name, ' ', m.last_name) as member_name, m.member_code
               FROM contribution_payments cp JOIN members m ON cp.member_id = m.id WHERE cp.status != 'Cancelled'`;
    const params = [];
    if (month && year) { sql += ' AND cp.contribution_month = ? AND cp.contribution_year = ?'; params.push(parseInt(month), parseInt(year)); }
    if (status) { sql += ' AND cp.status = ?'; params.push(status); }
    if (payment_method) { sql += ' AND cp.payment_method = ?'; params.push(payment_method); }
    if (search) { sql += ' AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.member_code LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    sql += ' ORDER BY cp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await pool.query(sql, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM contribution_payments WHERE status != ?', ['Cancelled']);
    res.json({ success: true, data: { payments: rows, total: countResult[0].total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /reports
router.get('/reports', authenticate, authorize('super_admin', 'chief', 'treasurer'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const cm = month ? parseInt(month) : new Date().getMonth() + 1;
    const cy = year ? parseInt(year) : new Date().getFullYear();
    const [settingsRows] = await pool.query('SELECT * FROM contribution_settings ORDER BY effective_from ASC');
    const settings = settingsRows.length > 0 ? settingsRows : [{ monthly_amount: 500, currency: 'RWF', effective_from: '2020-01-01' }];
    const [activeMembers] = await pool.query("SELECT m.*, u.name as unit_name FROM members m LEFT JOIN units u ON m.unit_id = u.id WHERE m.status = 'Active' ORDER BY m.member_code");
    const [allPayments] = await pool.query("SELECT * FROM contribution_payments WHERE status != 'Cancelled'");
    const rows = [];
    for (const member of activeMembers) {
      const memberPayments = allPayments.filter(p => p.member_id === member.id);
      const history = computeMemberHistory(member, memberPayments, settings, cm, cy);
      const m = history.find(h => h.month === cm && h.year === cy);
      if (m) rows.push({ id: m.month + '_' + m.year + '_' + member.id, member_id: member.id, member_code: member.member_code, member_name: `${member.first_name} ${member.last_name}`, unit_name: member.unit_name, required_amount: m.required_amount, total_paid: m.total_paid, balance: m.balance, status: m.status, payment_date: m.payment_date });
    }
    const expected = rows.reduce((s, r) => s + Number(r.required_amount), 0);
    const collected = rows.reduce((s, r) => s + Number(r.total_paid), 0);
    const paid = rows.filter(r => r.status === 'Paid').length;
    const partial = rows.filter(r => r.status === 'Partial').length;
    const unpaid = rows.filter(r => r.status === 'Unpaid').length;
    res.json({ success: true, data: { month: cm, year: cy, total: rows.length, expected, collected, outstanding: expected - collected, paid, partial, unpaid, rate: expected > 0 ? Math.round((collected / expected) * 100) : 0, rows }});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /payments - Record single payment (supports selecting any month)
router.post('/payments', authenticate, authorize('super_admin', 'chief', 'treasurer'), [
  body('member_id').isInt(), body('amount').isFloat({ min: 0.01 }), body('contribution_month').isInt({ min: 1, max: 12 }), body('contribution_year').isInt({ min: 2020 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    const { member_id, contribution_month, contribution_year, amount, payment_method, payment_date, reference_number, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO contribution_payments (contribution_id, member_id, amount, contribution_month, contribution_year, payment_method, payment_date, reference_number, notes, status, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [null, member_id, amount, contribution_month, contribution_year, payment_method || 'Cash', payment_date || today(), reference_number || null, notes || null, 'Completed', req.user.id]
    );
    await logAction(req, 'payment.created', 'contributions', result.insertId, {
      new: { member_id, amount, contribution_month, contribution_year, payment_method: payment_method || 'Cash', reference_number: reference_number || null },
    });
    await safely(notifyMemberPaid(member_id, [{ month: Number(contribution_month), year: contribution_year, amount }]), 'contribution recorded');
    res.status(201).json({ success: true, message: 'Payment recorded', data: { id: result.insertId } });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /payments/multi - Record payments for multiple months
router.post('/payments/multi', authenticate, authorize('super_admin', 'chief', 'treasurer'), async (req, res) => {
  try {
    const { member_id, months, payment_method, payment_date, reference_number, notes } = req.body;
    if (!member_id || !months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({ success: false, message: 'member_id and months array required' });
    }
    let created = 0;
    const paid = [];
    for (const m of months) {
      const { month, year, amount } = m;
      if (!month || !year || !amount) continue;
      await pool.query(
        'INSERT INTO contribution_payments (contribution_id, member_id, amount, contribution_month, contribution_year, payment_method, payment_date, reference_number, notes, status, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [null, member_id, amount, month, year, payment_method || 'Cash', payment_date || today(), reference_number || null, notes || null, 'Completed', req.user.id]
      );
      created++;
      paid.push({ month: Number(month), year, amount });
    }
    await logAction(req, 'payment.created', 'contributions', null, { new: { member_id, months, created, payment_method: payment_method || 'Cash' } });
    await safely(notifyMemberPaid(member_id, paid), 'contributions recorded');
    res.status(201).json({ success: true, message: `${created} payments recorded`, data: { created } });
  } catch (error) {
    console.error('Multi payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /payments/:id
router.put('/payments/:id', authenticate, authorize('super_admin', 'chief', 'treasurer'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM contribution_payments WHERE id = ? AND status != ?', [req.params.id, 'Cancelled']);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    const { amount, payment_method, payment_date, reference_number, notes } = req.body;
    const fields = []; const params = [];
    if (amount !== undefined) { fields.push('amount = ?'); params.push(amount); }
    if (payment_method !== undefined) { fields.push('payment_method = ?'); params.push(payment_method); }
    if (payment_date !== undefined) { fields.push('payment_date = ?'); params.push(payment_date); }
    if (reference_number !== undefined) { fields.push('reference_number = ?'); params.push(reference_number); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push('updated_at = NOW()');
    params.push(req.params.id);
    await pool.query(`UPDATE contribution_payments SET ${fields.join(', ')} WHERE id = ?`, params);
    await logAction(req, 'payment.updated', 'contributions', Number(req.params.id), {
      old: existing[0], new: { amount, payment_method, payment_date, reference_number, notes },
    });
    res.json({ success: true, message: 'Payment updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /payments/:id/cancel
router.patch('/payments/:id/cancel', authenticate, authorize('super_admin', 'chief'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM contribution_payments WHERE id = ? AND status != ?', [req.params.id, 'Cancelled']);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    await pool.query('UPDATE contribution_payments SET status = ?, updated_at = NOW() WHERE id = ?', ['Cancelled', req.params.id]);
    await logAction(req, 'payment.cancelled', 'contributions', Number(req.params.id), { old: existing[0], new: { status: 'Cancelled' } });
    res.json({ success: true, message: 'Payment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
