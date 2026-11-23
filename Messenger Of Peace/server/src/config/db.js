const mysql = require('mysql2/promise');
const { dbTimezone } = require('./env');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'messengers_of_peace',
};

const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Return date-only columns as 'YYYY-MM-DD' text. As Date objects they were shifted
  // into UTC and showed one day early (e.g. 2026-11-01 became 2026-10-31T22:00:00Z).
  dateStrings: ['DATE'],
  // Dates sent to and read from the database are in Kigali time (DB_TIMEZONE, default +02:00).
  timezone: dbTimezone,
});

// The database's own clock (NOW(), CURDATE(), "this month") also uses Kigali time, even when
// the database server itself runs on UTC, as most hosted databases do.
pool.on('connection', (connection) => {
  connection.query(`SET time_zone = '${dbTimezone}'`);
});

// Called once at startup (server.js): the API must not run without its real database.
pool.checkConnection = async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log(`[MySQL] Connected to "${config.database}" at ${config.host}:${config.port}`);
  } catch (err) {
    console.error(`[MySQL] Cannot connect to "${config.database}" at ${config.host}:${config.port} (${err.code || err.message}).`);
    console.error('Start MySQL (XAMPP Control Panel -> MySQL -> Start), check DB_* in server/.env,');
    console.error('and run "npm run migrate" if the database is new.');
    throw err;
  }
};

module.exports = pool;
