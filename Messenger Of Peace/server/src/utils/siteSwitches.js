// On/off switches from Dashboard > Settings > System.
const pool = require('../config/db');

async function switchOn(key, defaultOn = true) {
  try {
    const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
    if (rows.length === 0 || rows[0].setting_value == null || rows[0].setting_value === '') return defaultOn;
    return String(rows[0].setting_value).toLowerCase() !== 'false';
  } catch {
    return defaultOn;
  }
}

// "Email Notifications": emails to applicants when their application is approved or rejected.
// Concern alerts to the safeguarding leaders are always sent (child safety), whatever this says.
const emailsToApplicantsOn = () => switchOn('email_notifications');

module.exports = { switchOn, emailsToApplicantsOn };
