// Dashboard notifications (the bell). One place to create them, so every part of the
// site writes them the same way.
const pool = require('../config/db');

// Types the dashboard knows how to show (icon and colour): application, alert, message,
// payment, member, content, system, info.

// Send one notification to each of these user ids.
async function notifyUsers(userIds, { title, message, type = 'info', link = null }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  for (const id of ids) {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [id, String(title).slice(0, 255), message, type, link]
    );
  }
  return ids.length;
}

// Send to every active user with one of these roles (e.g. the leaders who review applications).
async function notifyRoles(roles, notification) {
  const [users] = await pool.query(
    'SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN (?) AND u.is_active = 1',
    [roles]
  );
  return notifyUsers(users.map(u => u.id), notification);
}

// A notification is a side effect: if it fails, the main action (saving an application,
// recording a payment) must still succeed. Logs the problem instead of throwing.
async function safely(promise, what) {
  try {
    return await promise;
  } catch (error) {
    console.error(`[Notifications] Could not create "${what}":`, error.message);
    return 0;
  }
}

// Read notifications older than this are removed; unread ones are kept until read.
const KEEP_READ_DAYS = 90;

async function cleanupOldNotifications() {
  try {
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE is_read = 1 AND created_at < NOW() - INTERVAL ? DAY',
      [KEEP_READ_DAYS]
    );
    if (result.affectedRows) console.log(`[Notifications] Removed ${result.affectedRows} read notification(s) older than ${KEEP_READ_DAYS} days`);
  } catch (error) {
    console.error('[Notifications] Cleanup failed:', error.message);
  }
}

// Clean up at start, then once a day.
function startNotificationCleanup() {
  cleanupOldNotifications();
  const timer = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
  timer.unref();
}

module.exports = { notifyUsers, notifyRoles, safely, cleanupOldNotifications, startNotificationCleanup, KEEP_READ_DAYS };
