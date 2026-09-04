const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorizePermission } = require('../middleware/auth');

// ─── INCOME ───

router.get('/income', authenticate, async (req, res) => {
  try {
    const { date_from, date_to, category, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM finance_income WHERE 1=1`;
    const params = [];

    if (date_from) { sql += ` AND date >= ?`; params.push(date_from); }
    if (date_to) { sql += ` AND date <= ?`; params.push(date_to); }
    if (category) { sql += ` AND category = ?`; params.push(category); }

    sql += ` ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const records = await pool.query(sql, params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('List income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/income', authenticate, authorizePermission('finance.create'), async (req, res) => {
  try {
    const { date, amount, source, category, description, reference, attachment } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required' });

    const result = await pool.query(
      `INSERT INTO finance_income (date, amount, source, category, description, reference, attachment, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [date || new Date().toISOString().split('T')[0], amount, source || null, category || 'General', description || null, reference || null, attachment || null, req.user.id]
    );

    const record = await pool.query(`SELECT * FROM finance_income WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, message: 'Income recorded', data: record[0] });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/income/:id', authenticate, authorizePermission('finance.update'), async (req, res) => {
  try {
    const existing = await pool.query(`SELECT * FROM finance_income WHERE id = ?`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Income record not found' });

    const { date, amount, source, category, description, reference, attachment } = req.body;
    await pool.query(
      `UPDATE finance_income SET date = ?, amount = ?, source = ?, category = ?, description = ?, reference = ?, attachment = ? WHERE id = ?`,
      [
        date || existing[0].date,
        amount !== undefined ? amount : existing[0].amount,
        source !== undefined ? source : existing[0].source,
        category !== undefined ? category : existing[0].category,
        description !== undefined ? description : existing[0].description,
        reference !== undefined ? reference : existing[0].reference,
        attachment !== undefined ? attachment : existing[0].attachment,
        req.params.id
      ]
    );

    const updated = await pool.query(`SELECT * FROM finance_income WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Income updated', data: updated[0] });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/income/:id', authenticate, authorizePermission('finance.delete'), async (req, res) => {
  try {
    const existing = await pool.query(`SELECT * FROM finance_income WHERE id = ?`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Income record not found' });

    await pool.query(`DELETE FROM finance_income WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Income record deleted' });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── EXPENSES ───

router.get('/expenses', authenticate, async (req, res) => {
  try {
    const { date_from, date_to, category, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM finance_expenses WHERE 1=1`;
    const params = [];

    if (date_from) { sql += ` AND date >= ?`; params.push(date_from); }
    if (date_to) { sql += ` AND date <= ?`; params.push(date_to); }
    if (category) { sql += ` AND category = ?`; params.push(category); }
    if (status) { sql += ` AND status = ?`; params.push(status); }

    sql += ` ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const records = await pool.query(sql, params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/expenses', authenticate, authorizePermission('finance.create'), async (req, res) => {
  try {
    const { date, amount, category, description, vendor, reference, attachment } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required' });

    const result = await pool.query(
      `INSERT INTO finance_expenses (date, amount, category, description, vendor, reference, attachment, recorded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date || new Date().toISOString().split('T')[0], amount, category || 'General', description || null, vendor || null, reference || null, attachment || null, req.user.id, 'Pending']
    );

    const record = await pool.query(`SELECT * FROM finance_expenses WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, message: 'Expense recorded', data: record[0] });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/expenses/:id', authenticate, authorizePermission('finance.update'), async (req, res) => {
  try {
    const existing = await pool.query(`SELECT * FROM finance_expenses WHERE id = ?`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Expense record not found' });

    const { date, amount, category, description, vendor, reference, attachment, status } = req.body;
    const fields = [];
    const params = [];

    if (date !== undefined) { fields.push('date = ?'); params.push(date); }
    if (amount !== undefined) { fields.push('amount = ?'); params.push(amount); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (vendor !== undefined) { fields.push('vendor = ?'); params.push(vendor); }
    if (reference !== undefined) { fields.push('reference = ?'); params.push(reference); }
    if (attachment !== undefined) { fields.push('attachment = ?'); params.push(attachment); }
    if (status === 'Approved') { fields.push('status = ?'); params.push('Approved'); fields.push('approved_by = ?'); params.push(req.user.id); }
    else if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE finance_expenses SET ${fields.join(', ')} WHERE id = ?`, params);

    const updated = await pool.query(`SELECT * FROM finance_expenses WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Expense updated', data: updated[0] });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/expenses/:id', authenticate, authorizePermission('finance.delete'), async (req, res) => {
  try {
    const existing = await pool.query(`SELECT * FROM finance_expenses WHERE id = ?`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'Expense record not found' });

    await pool.query(`DELETE FROM finance_expenses WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Expense record deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── BALANCE & SUMMARY ───

router.get('/balance', authenticate, async (req, res) => {
  try {
    const allIncome = await pool.query(`SELECT * FROM finance_income`);
    const allExpenses = await pool.query(`SELECT * FROM finance_expenses`);

    const totalIncome = allIncome.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalExpenses = allExpenses.filter(r => r.status === 'Approved').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    const monthIncome = allIncome.filter(r => {
      if (!r.date) return false;
      return r.date.startsWith(`${currentYear}-${currentMonth}`);
    }).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const monthExpenses = allExpenses.filter(r => {
      if (!r.date || r.status !== 'Approved') return false;
      return r.date.startsWith(`${currentYear}-${currentMonth}`);
    }).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance: totalIncome - totalExpenses,
        current_month_income: monthIncome,
        current_month_expenses: monthExpenses
      }
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const allIncome = await pool.query(`SELECT * FROM finance_income`);
    const allExpenses = await pool.query(`SELECT * FROM finance_expenses`);

    const totalIncome = allIncome.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const approvedExpenses = allExpenses.filter(r => r.status === 'Approved');
    const totalExpenses = approvedExpenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    const monthIncome = allIncome.filter(r => r.date && r.date.startsWith(`${currentYear}-${currentMonth}`))
      .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const monthExpenses = approvedExpenses.filter(r => r.date && r.date.startsWith(`${currentYear}-${currentMonth}`))
      .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const byCategory = {};
    approvedExpenses.forEach(r => {
      const cat = r.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat] += parseFloat(r.amount) || 0;
    });

    const incomeByCategory = {};
    allIncome.forEach(r => {
      const cat = r.category || 'General';
      if (!incomeByCategory[cat]) incomeByCategory[cat] = 0;
      incomeByCategory[cat] += parseFloat(r.amount) || 0;
    });

    const monthlyTrend = {};
    allIncome.forEach(r => {
      if (!r.date) return;
      const key = r.date.substring(0, 7);
      if (!monthlyTrend[key]) monthlyTrend[key] = { month: key, income: 0, expenses: 0 };
      monthlyTrend[key].income += parseFloat(r.amount) || 0;
    });
    approvedExpenses.forEach(r => {
      if (!r.date) return;
      const key = r.date.substring(0, 7);
      if (!monthlyTrend[key]) monthlyTrend[key] = { month: key, income: 0, expenses: 0 };
      monthlyTrend[key].expenses += parseFloat(r.amount) || 0;
    });

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance: totalIncome - totalExpenses,
        current_month_income: monthIncome,
        current_month_expenses: monthExpenses,
        income_by_category: incomeByCategory,
        expenses_by_category: byCategory,
        monthly_trend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
        recent_income: allIncome.slice(0, 5),
        recent_expenses: approvedExpenses.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
