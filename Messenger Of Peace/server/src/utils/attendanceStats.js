// Attendance numbers, worked out the same way everywhere (register list, member table,
// member page, "my attendance", absence alerts).
//
//   attended   = Present + Late (late still came)
//   rate       = attended / (attended + Absent)   - Excused is left out: an excused absence
//                                                    is not held against the member
//   in a row   = Absent registers counted back from the most recent one; Present or Late
//                stops the count, Excused is skipped (neither a miss nor attendance)
//
// A member is only expected at a register for their own unit or for the whole group,
// and only from the day they joined.
const pool = require('../config/db');

const ATTENDED = new Set(['Present', 'Late']);
const ALERT_AFTER = 3; // missed in a row

// Does this register concern this member?
const expects = (session, member) =>
  (session.unit_id == null || session.unit_id === member.unit_id) &&
  (!member.join_date || session.session_date >= member.join_date);

function rateOf(c) {
  const counted = c.present + c.late + c.absent;
  return counted ? Math.round(((c.present + c.late) / counted) * 100) : null;
}

// sessions: [{ id, session_date, unit_id }] (any order); statusBySession: Map(session_id -> status)
function memberStats(member, sessions, statusBySession, { from, to } = {}) {
  const mine = sessions.filter(s => expects(s, member))
    .sort((a, b) => (a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : b.id - a.id));
  const c = { present: 0, late: 0, absent: 0, excused: 0, not_marked: 0, expected: 0 };
  let lastAttended = null;
  for (const s of mine) {
    const status = statusBySession.get(s.id);
    if (ATTENDED.has(status) && !lastAttended) lastAttended = s.session_date;
    if ((from && s.session_date < from) || (to && s.session_date > to)) continue;
    c.expected++;
    if (status === 'Present') c.present++;
    else if (status === 'Late') c.late++;
    else if (status === 'Absent') c.absent++;
    else if (status === 'Excused') c.excused++;
    else c.not_marked++;
  }
  // Missed in a row: always from the newest register, whatever dates are being looked at.
  let inARow = 0;
  for (const s of mine) {
    const status = statusBySession.get(s.id);
    if (status === 'Absent') inARow++;
    else if (status === 'Excused' || !status) continue;
    else break;
  }
  return { ...c, rate: rateOf(c), missed_in_a_row: inARow, needs_attention: inARow >= ALERT_AFTER, last_attended: lastAttended };
}

// Sessions (optionally only some units: unitIds = null means all) and every record in them.
async function loadAttendance({ unitIds = null } = {}) {
  let where = '';
  const params = [];
  if (unitIds) {
    // A unit leader also sees whole-group registers, as their members are expected there.
    where = unitIds.length ? 'WHERE (s.unit_id IN (?) OR s.unit_id IS NULL)' : 'WHERE s.unit_id IS NULL';
    if (unitIds.length) params.push(unitIds);
  }
  const [sessions] = await pool.query(`SELECT s.id, s.session_date, s.unit_id FROM attendance_sessions s ${where}`, params);
  const ids = sessions.map(s => s.id);
  const [records] = ids.length
    ? await pool.query('SELECT session_id, member_id, status FROM attendance WHERE session_id IN (?)', [ids])
    : [[]];
  const byMember = new Map();
  for (const r of records) {
    if (!byMember.has(r.member_id)) byMember.set(r.member_id, new Map());
    byMember.get(r.member_id).set(r.session_id, r.status);
  }
  return { sessions, byMember };
}

module.exports = { memberStats, loadAttendance, rateOf, expects, ALERT_AFTER, ATTENDED };
