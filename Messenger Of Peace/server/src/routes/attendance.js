// Attendance registers ("sessions"): one per meeting, event, camp or training, for one unit
// or the whole group. Every expected member must be marked before a register is saved.
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { today } = require('../utils/dates');
const { notifyUsers, notifyRoles, safely } = require('../utils/notify');
const { switchOn } = require('../utils/siteSwitches');
const { memberStats, loadAttendance, rateOf, ALERT_AFTER } = require('../utils/attendanceStats');

const TAKERS = ['super_admin', 'chief', 'secretary', 'unit_leader'];
const MANAGERS = ['super_admin', 'chief', 'secretary']; // see every unit, may delete registers
const TYPES = ['Weekly meeting', 'Event', 'Camp', 'Training', 'Other'];
const STATUSES = ['Present', 'Late', 'Absent', 'Excused'];

const bad = (res, message, status = 400, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const checkInput = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  bad(res, errors.array()[0].msg);
  return true;
};

// Which units this person may see and take registers for. null = all units.
async function unitScope(user) {
  if (MANAGERS.includes(user.role)) return null;
  const [rows] = await pool.query(
    `SELECT m.unit_id AS id FROM members m WHERE m.user_id = ? AND m.unit_id IS NOT NULL
     UNION SELECT la.unit_id FROM leadership_assignments la JOIN members m ON m.id = la.member_id
       WHERE m.user_id = ? AND la.is_active = 1 AND la.unit_id IS NOT NULL
     UNION SELECT u.id FROM units u WHERE u.leader_id = ?`,
    [user.id, user.id, user.id]
  );
  return rows.map(r => r.id);
}
const mayTake = (scope, unitId) => scope === null || (unitId != null && scope.includes(Number(unitId)));
const mayView = (scope, unitId) => scope === null || unitId == null || scope.includes(Number(unitId));
const NO_UNIT_MESSAGE = 'Your account is not linked to a unit yet. Ask an administrator to set your unit (your member record or a leadership position).';

// Active members expected at a register for this unit (null = whole group) on this date.
async function expectedMembers(unitId, date) {
  const params = [date];
  let sql = `SELECT m.id, m.member_code, m.first_name, m.last_name, m.unit_id, m.join_date, u.name AS unit_name
    FROM members m LEFT JOIN units u ON u.id = m.unit_id
    WHERE m.status = 'Active' AND (m.join_date IS NULL OR m.join_date <= ?)`;
  if (unitId != null) { sql += ' AND m.unit_id = ?'; params.push(unitId); }
  sql += ' ORDER BY m.first_name, m.last_name';
  const [rows] = await pool.query(sql, params);
  return rows;
}

const SESSION_SELECT = `
  SELECT s.*, u.name AS unit_name, e.title AS event_title,
         COALESCE(NULLIF(TRIM(CONCAT(IFNULL(us.first_name, ''), ' ', IFNULL(us.last_name, ''))), ''), us.email) AS recorded_by_name,
         SUM(a.status = 'Present') AS present, SUM(a.status = 'Late') AS late,
         SUM(a.status = 'Absent') AS absent, SUM(a.status = 'Excused') AS excused, COUNT(a.id) AS total
  FROM attendance_sessions s
  LEFT JOIN attendance a ON a.session_id = s.id
  LEFT JOIN units u ON u.id = s.unit_id
  LEFT JOIN events e ON e.id = s.event_id
  LEFT JOIN users us ON us.id = s.recorded_by`;

const withRate = (s) => {
  const c = { present: Number(s.present) || 0, late: Number(s.late) || 0, absent: Number(s.absent) || 0, excused: Number(s.excused) || 0 };
  return { ...s, ...c, total: Number(s.total) || 0, rate: rateOf(c) };
};

async function loadSession(id) {
  const [rows] = await pool.query(`${SESSION_SELECT} WHERE s.id = ? GROUP BY s.id`, [id]);
  return rows[0] ? withRate(rows[0]) : null;
}

// ---------- Lists ----------

// GET /sessions?from&to&unit_id&type&page&limit - registers, newest first, with their counts.
router.get('/sessions', authenticate, authorize(...TAKERS), async (req, res) => {
  try {
    const scope = await unitScope(req.user);
    const { from, to, unit_id, type } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const where = [];
    const params = [];
    if (scope !== null) {
      where.push(scope.length ? '(s.unit_id IN (?) OR s.unit_id IS NULL)' : 's.unit_id IS NULL');
      if (scope.length) params.push(scope);
    }
    if (from) { where.push('s.session_date >= ?'); params.push(from); }
    if (to) { where.push('s.session_date <= ?'); params.push(to); }
    if (unit_id === 'group') where.push('s.unit_id IS NULL');
    else if (unit_id) { where.push('s.unit_id = ?'); params.push(unit_id); }
    if (type) { where.push('s.session_type = ?'); params.push(type); }
    const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `${SESSION_SELECT}${whereSql} GROUP BY s.id ORDER BY s.session_date DESC, s.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM attendance_sessions s${whereSql}`, params);
    res.json({ success: true, data: { sessions: rows.map(withRate), total, page, limit, unit_scope: scope } });
  } catch (error) {
    console.error('Attendance sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /roster?date&unit_id - who must be marked on a new register.
router.get('/roster', authenticate, authorize(...TAKERS),
  [query('date').isISO8601().withMessage('Choose a date'), query('unit_id').optional({ values: 'falsy' }).isInt()],
  async (req, res) => {
    try {
      if (checkInput(req, res)) return;
      const scope = await unitScope(req.user);
      const unitId = req.query.unit_id ? Number(req.query.unit_id) : null;
      if (!mayTake(scope, unitId)) return bad(res, scope && scope.length === 0 ? NO_UNIT_MESSAGE : 'You can only take registers for your own unit.', 403);
      res.json({ success: true, data: { members: await expectedMembers(unitId, req.query.date) } });
    } catch (error) {
      console.error('Attendance roster error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

// GET /sessions/:id - one register with every expected member (unmarked ones included).
router.get('/sessions/:id', authenticate, authorize(...TAKERS), [param('id').isInt()], async (req, res) => {
  try {
    if (checkInput(req, res)) return;
    const session = await loadSession(req.params.id);
    if (!session) return bad(res, 'Register not found', 404);
    const scope = await unitScope(req.user);
    if (!mayView(scope, session.unit_id)) return bad(res, 'You can only open registers for your own unit.', 403);

    const [records] = await pool.query(
      `SELECT a.id, a.member_id, a.status, a.reason, m.member_code, m.first_name, m.last_name, m.unit_id, un.name AS unit_name
       FROM attendance a JOIN members m ON m.id = a.member_id LEFT JOIN units un ON un.id = m.unit_id
       WHERE a.session_id = ? ORDER BY m.first_name, m.last_name`,
      [session.id]
    );
    // Members who are expected but were not on the register when it was saved (e.g. joined since).
    const marked = new Set(records.map(r => r.member_id));
    const missing = (await expectedMembers(session.unit_id, session.session_date))
      .filter(m => !marked.has(m.id))
      .map(m => ({ id: null, member_id: m.id, status: null, reason: null, member_code: m.member_code, first_name: m.first_name, last_name: m.last_name, unit_id: m.unit_id, unit_name: m.unit_name }));
    res.json({ success: true, data: { session, records: [...records, ...missing], can_edit: mayTake(scope, session.unit_id) } });
  } catch (error) {
    console.error('Attendance session error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- Saving ----------

const sessionRules = [
  body('session_date').isISO8601().withMessage('Choose the date of the register')
    .custom(v => String(v).slice(0, 10) <= today()).withMessage('The date cannot be in the future'),
  body('session_type').isIn(TYPES).withMessage('Choose the type of register'),
  body('unit_id').optional({ values: 'null' }).isInt().withMessage('Choose a unit'),
  body('event_id').optional({ values: 'falsy' }).isInt().withMessage('Choose an event'),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('The title is too long (150 characters at most)'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('The notes are too long'),
  body('records').isArray({ min: 1 }).withMessage('There is nobody on this register'),
  body('records.*.member_id').isInt().withMessage('A member is missing'),
  body('records.*.status').isIn(STATUSES).withMessage('Every member must be marked Present, Late, Absent or Excused'),
  body('records.*.reason').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('A reason is too long (500 characters at most)'),
];

// The register must cover exactly the members expected (plus anyone already on it).
async function checkRecords(records, unitId, date, alreadyOn = []) {
  const expected = await expectedMembers(unitId, date);
  const allowed = new Set([...expected.map(m => m.id), ...alreadyOn]);
  const given = new Map();
  for (const r of records) {
    const id = Number(r.member_id);
    if (!allowed.has(id)) return { error: 'One of the members does not belong on this register (other unit, not active, or joined after this date).' };
    if (given.has(id)) return { error: 'A member appears twice on the register.' };
    given.set(id, r);
  }
  const notMarked = expected.filter(m => !given.has(m.id));
  if (notMarked.length) {
    const names = notMarked.slice(0, 3).map(m => `${m.first_name} ${m.last_name}`).join(', ');
    return { error: `${notMarked.length} member(s) are not marked yet: ${names}${notMarked.length > 3 ? '…' : ''}` };
  }
  return { given };
}

async function checkUnitAndEvent(unitId, eventId) {
  if (unitId != null) {
    const [u] = await pool.query('SELECT id FROM units WHERE id = ?', [unitId]);
    if (!u.length) return 'That unit does not exist.';
  }
  if (eventId) {
    const [e] = await pool.query('SELECT id FROM events WHERE id = ?', [eventId]);
    if (!e.length) return 'That event does not exist.';
  }
  return null;
}

async function findDuplicate({ session_date, session_type, unit_id, event_id }, exceptId = 0) {
  const [rows] = await pool.query(
    `SELECT id FROM attendance_sessions WHERE session_date = ? AND session_type = ? AND unit_id <=> ? AND event_id <=> ? AND id <> ? LIMIT 1`,
    [session_date, session_type, unit_id, event_id || null, exceptId]
  );
  return rows[0]?.id || null;
}

// After a save: members who have now missed ALERT_AFTER registers in a row (counting this one)
// are reported to their unit leader(s), or to the chief when the unit has no leader account.
async function absenceAlerts(newlyAbsentIds) {
  if (!newlyAbsentIds.length || !(await switchOn('attendance_required'))) return;
  const [members] = await pool.query(
    `SELECT m.id, m.first_name, m.last_name, m.unit_id, m.join_date, u.name AS unit_name
     FROM members m LEFT JOIN units u ON u.id = m.unit_id WHERE m.id IN (?)`, [newlyAbsentIds]
  );
  const { sessions, byMember } = await loadAttendance();
  for (const m of members) {
    const stats = memberStats(m, sessions, byMember.get(m.id) || new Map());
    if (stats.missed_in_a_row !== ALERT_AFTER) continue; // once, when the streak reaches 3
    const notification = {
      title: 'Member missing meetings',
      message: `${m.first_name} ${m.last_name}${m.unit_name ? ` (${m.unit_name})` : ''} has missed ${ALERT_AFTER} registers in a row. It may be worth checking in with them or their family.`,
      type: 'alert',
      link: `/dashboard/members/${m.id}`,
    };
    let leaders = [];
    if (m.unit_id) {
      const [rows] = await pool.query(
        `SELECT DISTINCT u.id FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN members lm ON lm.user_id = u.id
         LEFT JOIN leadership_assignments la ON la.member_id = lm.id AND la.is_active = 1
         LEFT JOIN units un ON un.leader_id = u.id
         WHERE r.name = 'unit_leader' AND u.is_active = 1 AND (lm.unit_id = ? OR la.unit_id = ? OR un.id = ?)`,
        [m.unit_id, m.unit_id, m.unit_id]
      );
      leaders = rows.map(r => r.id);
    }
    if (leaders.length) await notifyUsers(leaders, notification);
    else await notifyRoles(['chief', 'super_admin'], notification);
  }
}

// Save the rows of a register inside a transaction (all or nothing).
async function saveRows(conn, session, records, userId) {
  for (const r of records) {
    await conn.query(
      `INSERT INTO attendance (session_id, member_id, event_id, meeting_date, status, reason, recorded_by, unit_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), recorded_by = VALUES(recorded_by),
         event_id = VALUES(event_id), meeting_date = VALUES(meeting_date), unit_id = VALUES(unit_id)`,
      [session.id, r.member_id, session.event_id || null, session.session_date, r.status,
       ['Late', 'Excused', 'Absent'].includes(r.status) ? (String(r.reason || '').trim() || null) : null,
       userId, session.unit_id]
    );
  }
}

// POST /sessions - a new register.
router.post('/sessions', authenticate, authorize(...TAKERS), sessionRules, async (req, res) => {
  if (checkInput(req, res)) return;
  const b = req.body;
  const session = {
    session_date: String(b.session_date).slice(0, 10), session_type: b.session_type,
    unit_id: b.unit_id == null || b.unit_id === '' ? null : Number(b.unit_id),
    event_id: b.event_id ? Number(b.event_id) : null,
    title: (b.title || '').trim() || null, notes: (b.notes || '').trim() || null,
  };
  let conn;
  try {
    const scope = await unitScope(req.user);
    if (!mayTake(scope, session.unit_id)) return bad(res, scope && scope.length === 0 ? NO_UNIT_MESSAGE : 'You can only take registers for your own unit.', 403);
    const problem = await checkUnitAndEvent(session.unit_id, session.event_id);
    if (problem) return bad(res, problem);
    const existing = await findDuplicate(session);
    if (existing) return bad(res, 'A register for this date, type and unit already exists. Open it to make changes.', 409, { data: { session_id: existing } });
    const { error, given } = await checkRecords(b.records, session.unit_id, session.session_date);
    if (error) return bad(res, error);

    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [ins] = await conn.query(
      'INSERT INTO attendance_sessions (session_date, session_type, unit_id, event_id, title, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [session.session_date, session.session_type, session.unit_id, session.event_id, session.title, session.notes, req.user.id]
    );
    session.id = ins.insertId;
    await saveRows(conn, session, [...given.values()], req.user.id);
    await conn.commit();

    const counts = {};
    for (const r of given.values()) counts[r.status] = (counts[r.status] || 0) + 1;
    await logAction(req, 'attendance.session_created', 'attendance', session.id, { new: { ...session, counts } });
    await safely(absenceAlerts([...given.values()].filter(r => r.status === 'Absent').map(r => Number(r.member_id))), 'absence alert');
    res.status(201).json({ success: true, message: 'Register saved', data: await loadSession(session.id) });
  } catch (error) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('Save register error:', error);
    res.status(500).json({ success: false, message: 'Server error: nothing was saved' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /sessions/:id - change a register (details and marks). The unit cannot change.
router.put('/sessions/:id', authenticate, authorize(...TAKERS), [param('id').isInt(), ...sessionRules], async (req, res) => {
  if (checkInput(req, res)) return;
  let conn;
  try {
    const current = await loadSession(req.params.id);
    if (!current) return bad(res, 'Register not found', 404);
    const scope = await unitScope(req.user);
    if (!mayTake(scope, current.unit_id)) return bad(res, 'You can only change registers for your own unit.', 403);

    const b = req.body;
    const session = {
      id: current.id, unit_id: current.unit_id,
      session_date: String(b.session_date).slice(0, 10), session_type: b.session_type,
      event_id: b.event_id ? Number(b.event_id) : null,
      title: (b.title || '').trim() || null, notes: (b.notes || '').trim() || null,
    };
    const problem = await checkUnitAndEvent(null, session.event_id);
    if (problem) return bad(res, problem);
    const existing = await findDuplicate(session, current.id);
    if (existing) return bad(res, 'Another register for this date, type and unit already exists.', 409, { data: { session_id: existing } });

    const [oldRows] = await pool.query('SELECT member_id, status, reason FROM attendance WHERE session_id = ?', [current.id]);
    const before = new Map(oldRows.map(r => [r.member_id, r]));
    const { error, given } = await checkRecords(b.records, session.unit_id, session.session_date, [...before.keys()]);
    if (error) return bad(res, error);

    conn = await pool.getConnection();
    await conn.beginTransaction();
    await conn.query(
      'UPDATE attendance_sessions SET session_date = ?, session_type = ?, event_id = ?, title = ?, notes = ?, recorded_by = ? WHERE id = ?',
      [session.session_date, session.session_type, session.event_id, session.title, session.notes, req.user.id, current.id]
    );
    await saveRows(conn, session, [...given.values()], req.user.id);
    // Members taken off the register (e.g. moved unit) lose their row for it.
    const keep = [...given.keys()];
    await conn.query('DELETE FROM attendance WHERE session_id = ? AND member_id NOT IN (?)', [current.id, keep]);
    await conn.commit();

    const changed = [];
    for (const [id, r] of given) {
      const old = before.get(id);
      if (!old || old.status !== r.status) changed.push({ member_id: id, from: old?.status || null, to: r.status });
    }
    await logAction(req, 'attendance.session_updated', 'attendance', current.id, {
      old: { session_date: current.session_date, session_type: current.session_type, title: current.title },
      new: { session_date: session.session_date, session_type: session.session_type, title: session.title, changed },
    });
    await safely(absenceAlerts(changed.filter(c => c.to === 'Absent').map(c => c.member_id)), 'absence alert');
    res.json({ success: true, message: 'Register updated', data: await loadSession(current.id) });
  } catch (error) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('Update register error:', error);
    res.status(500).json({ success: false, message: 'Server error: nothing was changed' });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE /sessions/:id - remove a register taken by mistake (leaders who see every unit).
router.delete('/sessions/:id', authenticate, authorize(...MANAGERS), [param('id').isInt()], async (req, res) => {
  try {
    if (checkInput(req, res)) return;
    const current = await loadSession(req.params.id);
    if (!current) return bad(res, 'Register not found', 404);
    await pool.query('DELETE FROM attendance_sessions WHERE id = ?', [current.id]); // rows go with it
    await logAction(req, 'attendance.session_deleted', 'attendance', current.id, {
      old: { session_date: current.session_date, session_type: current.session_type, unit: current.unit_name || 'Whole group', present: current.present, late: current.late, absent: current.absent, excused: current.excused },
    });
    res.json({ success: true, message: 'Register deleted' });
  } catch (error) {
    console.error('Delete register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- Member numbers ----------

// GET /summary?from&to&unit_id - each member's attendance rate and missed-in-a-row.
router.get('/summary', authenticate, authorize(...TAKERS), async (req, res) => {
  try {
    const scope = await unitScope(req.user);
    const { from, to, unit_id } = req.query;
    const params = [];
    let sql = `SELECT m.id, m.member_code, m.first_name, m.last_name, m.unit_id, m.join_date, u.name AS unit_name
      FROM members m LEFT JOIN units u ON u.id = m.unit_id WHERE m.status = 'Active'`;
    if (scope !== null) {
      if (!scope.length) return res.json({ success: true, data: { members: [], message: NO_UNIT_MESSAGE } });
      sql += ' AND m.unit_id IN (?)'; params.push(scope);
    }
    if (unit_id) { sql += ' AND m.unit_id = ?'; params.push(unit_id); }
    sql += ' ORDER BY m.first_name, m.last_name';
    const [members] = await pool.query(sql, params);
    const { sessions, byMember } = await loadAttendance({ unitIds: scope });
    const rows = members.map(m => ({
      member_id: m.id, member_code: m.member_code, member_name: `${m.first_name} ${m.last_name}`, unit_id: m.unit_id, unit_name: m.unit_name,
      ...memberStats(m, sessions, byMember.get(m.id) || new Map(), { from, to }),
    }));
    res.json({ success: true, data: { members: rows, alert_after: ALERT_AFTER } });
  } catch (error) {
    console.error('Attendance summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /me - the signed-in member's own attendance.
router.get('/me', authenticate, async (req, res) => {
  try {
    const [[member]] = await pool.query(
      `SELECT m.id, m.first_name, m.last_name, m.unit_id, m.join_date, u.name AS unit_name
       FROM members m LEFT JOIN units u ON u.id = m.unit_id WHERE m.user_id = ? LIMIT 1`, [req.user.id]
    );
    if (!member) return res.json({ success: true, data: { member: null } });
    const [sessions] = await pool.query(
      `SELECT s.id, s.session_date, s.session_type, s.title, s.unit_id, un.name AS unit_name, e.title AS event_title, a.status, a.reason
       FROM attendance_sessions s
       LEFT JOIN attendance a ON a.session_id = s.id AND a.member_id = ?
       LEFT JOIN units un ON un.id = s.unit_id LEFT JOIN events e ON e.id = s.event_id
       WHERE (s.unit_id IS NULL OR s.unit_id = ?) AND (? IS NULL OR s.session_date >= ?)
       ORDER BY s.session_date DESC, s.id DESC`,
      [member.id, member.unit_id, member.join_date, member.join_date]
    );
    const statusBySession = new Map(sessions.filter(s => s.status).map(s => [s.id, s.status]));
    const stats = memberStats(member, sessions, statusBySession);
    res.json({ success: true, data: { member: { name: `${member.first_name} ${member.last_name}`, unit_name: member.unit_name }, stats, sessions: sessions.slice(0, 100) } });
  } catch (error) {
    console.error('My attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- Export ----------

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formulas
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /export?session_id | from&to&unit_id - CSV (opens in Excel).
router.get('/export', authenticate, authorize(...TAKERS), async (req, res) => {
  try {
    const scope = await unitScope(req.user);
    const { session_id, from, to, unit_id } = req.query;
    const where = [];
    const params = [];
    if (scope !== null) {
      where.push(scope.length ? '(s.unit_id IN (?) OR s.unit_id IS NULL)' : 's.unit_id IS NULL');
      if (scope.length) params.push(scope);
    }
    if (session_id) { where.push('s.id = ?'); params.push(session_id); }
    if (from) { where.push('s.session_date >= ?'); params.push(from); }
    if (to) { where.push('s.session_date <= ?'); params.push(to); }
    if (unit_id === 'group') where.push('s.unit_id IS NULL');
    else if (unit_id) { where.push('s.unit_id = ?'); params.push(unit_id); }
    const [rows] = await pool.query(
      `SELECT s.session_date, s.session_type, s.title, IFNULL(su.name, 'Whole group') AS register_unit, e.title AS event_title,
              m.member_code, CONCAT(m.first_name, ' ', m.last_name) AS member_name, mu.name AS member_unit, a.status, a.reason
       FROM attendance a
       JOIN attendance_sessions s ON s.id = a.session_id
       JOIN members m ON m.id = a.member_id
       LEFT JOIN units su ON su.id = s.unit_id LEFT JOIN units mu ON mu.id = m.unit_id LEFT JOIN events e ON e.id = s.event_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY s.session_date DESC, s.id DESC, m.first_name, m.last_name`,
      params
    );
    const header = ['Date', 'Type', 'Title', 'Register for', 'Event', 'Member code', 'Member', 'Member unit', 'Status', 'Reason'];
    const lines = [header, ...rows.map(r => [r.session_date, r.session_type, r.title, r.register_unit, r.event_title, r.member_code, r.member_name, r.member_unit, r.status, r.reason])]
      .map(cols => cols.map(csvCell).join(','));
    const name = session_id ? `attendance-register-${session_id}.csv` : `attendance-${from || 'all'}-to-${to || today()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send('﻿' + lines.join('\r\n')); // BOM so Excel reads names with accents correctly
  } catch (error) {
    console.error('Attendance export error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- Older endpoints (kept for other pages) ----------

// GET / - attendance rows (filters as before), limited to the person's units.
router.get('/', authenticate, authorize(...TAKERS), async (req, res) => {
  try {
    const scope = await unitScope(req.user);
    const { event_id, unit_id, date_from, date_to, member_id, page = 1, limit = 50 } = req.query;
    let sql = `SELECT a.*, CONCAT(m.first_name, ' ', m.last_name) as member_name, e.title as event_title, un.name as unit_name
      FROM attendance a LEFT JOIN members m ON a.member_id = m.id LEFT JOIN events e ON a.event_id = e.id
      LEFT JOIN units un ON a.unit_id = un.id WHERE 1=1`;
    const params = [];
    if (scope !== null) {
      sql += scope.length ? ' AND (a.unit_id IN (?) OR a.unit_id IS NULL)' : ' AND a.unit_id IS NULL';
      if (scope.length) params.push(scope);
    }
    if (event_id) { sql += ' AND a.event_id = ?'; params.push(event_id); }
    if (unit_id) { sql += ' AND a.unit_id = ?'; params.push(unit_id); }
    if (member_id) { sql += ' AND a.member_id = ?'; params.push(member_id); }
    if (date_from) { sql += ' AND a.meeting_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND a.meeting_date <= ?'; params.push(date_to); }
    sql += ' ORDER BY a.meeting_date DESC, m.first_name ASC LIMIT ? OFFSET ?';
    params.push(Math.min(parseInt(limit, 10) || 50, 500), (Math.max(parseInt(page, 10) || 1, 1) - 1) * (parseInt(limit, 10) || 50));
    const [records] = await pool.query(sql, params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Attendance list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /:id - change one member's mark.
router.patch('/:id', authenticate, authorize(...TAKERS),
  [param('id').isInt(), body('status').isIn(STATUSES).withMessage('Invalid status')],
  async (req, res) => {
    try {
      if (checkInput(req, res)) return;
      const [existing] = await pool.query('SELECT * FROM attendance WHERE id = ?', [req.params.id]);
      if (!existing.length) return bad(res, 'Attendance record not found', 404);
      const scope = await unitScope(req.user);
      if (!mayTake(scope, existing[0].unit_id)) return bad(res, 'You can only change registers for your own unit.', 403);
      const { status, reason } = req.body;
      await pool.query('UPDATE attendance SET status = ?, reason = ?, recorded_by = ? WHERE id = ?',
        [status, reason !== undefined ? (reason || null) : existing[0].reason, req.user.id, req.params.id]);
      await logAction(req, 'attendance.updated', 'attendance', Number(req.params.id), {
        old: { status: existing[0].status, reason: existing[0].reason }, new: { status, reason: reason ?? existing[0].reason },
      });
      if (status === 'Absent' && existing[0].status !== 'Absent') await safely(absenceAlerts([existing[0].member_id]), 'absence alert');
      res.json({ success: true, message: 'Attendance updated' });
    } catch (error) {
      console.error('Attendance update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

module.exports = router;
