const pool = require('../config/db');

// Next member code (MOP-0001, MOP-0002, ...): the highest number used so far + 1.
// Counting members instead would reuse an existing code once a member is deleted.
const nextMemberCode = async () => {
  const [rows] = await pool.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(member_code, 5) AS UNSIGNED)), 0) AS last FROM members WHERE member_code LIKE 'MOP-%'"
  );
  return 'MOP-' + String(Number(rows[0].last) + 1).padStart(4, '0');
};

module.exports = { nextMemberCode };
