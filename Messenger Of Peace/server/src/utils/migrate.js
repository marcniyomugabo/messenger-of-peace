const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4'
};

const dbName = process.env.DB_NAME || 'messengers_of_peace';

const schema = `
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  refresh_token TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- "Forgot password" links. Only a hash of the token is stored, so a copy of the database
-- cannot be used to reset anyone's password. A link works once and for 30 minutes.
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- "Report a Concern" (safeguarding). Only the chief, the discipline officer and the super admin
-- can read these. The reporter may stay anonymous (all contact fields empty).
CREATE TABLE IF NOT EXISTS concerns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(20) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  happened_on VARCHAR(100) NULL,
  location VARCHAR(255) NULL,
  people_involved TEXT NULL,
  child_in_danger TINYINT(1) NOT NULL DEFAULT 0,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 1,
  reporter_name VARCHAR(150) NULL,
  reporter_contact VARCHAR(150) NULL,
  reporter_relation VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'New',
  handler_notes TEXT NULL,
  handled_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (status),
  FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  focus_area VARCHAR(200),
  icon VARCHAR(100),
  min_age INT NULL,
  max_age INT NULL,
  color VARCHAR(20) NULL,
  activities TEXT NULL,
  leader_id INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  member_code VARCHAR(20) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  school VARCHAR(200),
  location VARCHAR(255),
  photo VARCHAR(500),
  unit_id INT NULL,
  role_in_group VARCHAR(100),
  skills TEXT,
  talents TEXT,
  status ENUM('Applicant','Active','Inactive','Suspended','Alumni') DEFAULT 'Applicant',
  join_date DATE,
  photo_consent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS member_guardians (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  guardian_name VARCHAR(200) NOT NULL,
  relationship VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_emergency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS unit_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  member_id INT NOT NULL,
  role VARCHAR(100),
  joined_date DATE,
  left_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY (unit_id, member_id),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leadership_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  position VARCHAR(150) NOT NULL,
  unit_id INT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category ENUM('Training','Debate','Community Service','Visit','Meeting','Celebration','Camp','Talent/Arts','Other') DEFAULT 'Other',
  description TEXT,
  venue VARCHAR(255),
  start_date DATETIME NOT NULL,
  end_date DATETIME,
  organizer VARCHAR(200),
  budget DECIMAL(12,2) DEFAULT 0,
  status ENUM('Draft','Published','Ongoing','Completed','Cancelled') DEFAULT 'Draft',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern VARCHAR(100),
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- One row per signed-in device (see utils/sessions.js). Only a hash of the key is kept.
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  expires_at DATETIME NOT NULL,
  UNIQUE KEY user_sessions_token (token_hash),
  INDEX idx_user_sessions_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- One register: a meeting, event, camp or training on one day, for one unit
-- (unit_id NULL = the whole group).
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_date DATE NOT NULL,
  session_type VARCHAR(30) NOT NULL DEFAULT 'Weekly meeting',
  unit_id INT NULL,
  event_id INT NULL,
  title VARCHAR(150) NULL,
  notes TEXT NULL,
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_date (session_date),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- One row per member per register. meeting_date and unit_id repeat the session's
-- values so older reports and the member page keep working.
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NULL,
  member_id INT NOT NULL,
  event_id INT NULL,
  meeting_date DATE NOT NULL,
  status ENUM('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
  reason TEXT,
  recorded_by INT NULL,
  unit_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY attendance_session_member (session_id, member_id),
  INDEX idx_attendance_member (member_id),
  CONSTRAINT attendance_session_fk FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS event_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  member_id INT NOT NULL,
  status ENUM('Registered','Attended','Cancelled') DEFAULT 'Registered',
  UNIQUE KEY (event_id, member_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  objective TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  team VARCHAR(255),
  beneficiaries VARCHAR(255),
  activities TEXT,
  results TEXT,
  status ENUM('Draft','Submitted','Reviewed','Published','Archived') DEFAULT 'Draft',
  is_featured BOOLEAN DEFAULT FALSE,
  created_by INT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  content TEXT,
  excerpt TEXT,
  category VARCHAR(100),
  featured_image VARCHAR(500),
  status ENUM('Draft','Published','Archived') DEFAULT 'Draft',
  published_at TIMESTAMP NULL,
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  file_path VARCHAR(500) NOT NULL,
  file_type ENUM('Photo','Video','Document') DEFAULT 'Photo',
  mime_type VARCHAR(100),
  file_size INT,
  caption TEXT,
  alt_text VARCHAR(255),
  event_id INT NULL,
  project_id INT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES portfolio_projects(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS member_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_code VARCHAR(30) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  second_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(255),
  district VARCHAR(100),
  sector VARCHAR(100),
  cell VARCHAR(100),
  unit VARCHAR(50),
  studying BOOLEAN DEFAULT FALSE,
  school_name VARCHAR(200),
  school_location VARCHAR(200),
  has_job BOOLEAN,
  job VARCHAR(200),
  company VARCHAR(200),
  current_activity VARCHAR(255),
  parent_first_name VARCHAR(100),
  parent_second_name VARCHAR(100),
  parent_phone VARCHAR(20),
  status ENUM('Pending','Reviewed','Approved','Rejected') DEFAULT 'Pending',
  admin_notes TEXT,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50),
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'text',
  category VARCHAR(50) DEFAULT 'general',
  description VARCHAR(255),
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  replied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  color VARCHAR(20),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  short_description TEXT,
  cover_image VARCHAR(500),
  location VARCHAR(255),
  organizer VARCHAR(200),
  category_id INT NULL,
  start_date DATE,
  end_date DATE,
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  status VARCHAR(30) DEFAULT 'Draft',
  is_featured BOOLEAN DEFAULT FALSE,
  registration_enabled BOOLEAN DEFAULT FALSE,
  registration_deadline DATE NULL,
  max_participants INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES activity_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gallery_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  cover_image VARCHAR(500),
  status VARCHAR(30) DEFAULT 'Draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  album_id INT NULL,
  media_id INT NULL,
  title VARCHAR(255),
  caption TEXT,
  description TEXT,
  image_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_cover BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  author VARCHAR(200),
  file_path VARCHAR(500),
  cover_image VARCHAR(500),
  file_type VARCHAR(50),
  file_size BIGINT,
  tags VARCHAR(500),
  download_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'Draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS information_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'Guide',
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  status VARCHAR(30) DEFAULT 'Published',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  priority VARCHAR(20) DEFAULT 'Medium',
  target_audience VARCHAR(50) DEFAULT 'All',
  status VARCHAR(30) DEFAULT 'Draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hero_slides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  subtitle VARCHAR(255),
  description TEXT,
  background_image VARCHAR(500),
  button_text VARCHAR(100),
  button_link VARCHAR(255),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  section_type VARCHAR(50),
  image VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  settings TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS about_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100),
  title VARCHAR(255),
  content TEXT,
  image VARCHAR(500),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  url VARCHAR(255),
  parent_id INT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  opens_new_tab BOOLEAN DEFAULT FALSE,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  keywords TEXT,
  og_image VARCHAR(500),
  canonical_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contribution_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  monthly_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RWF',
  effective_from DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contribution_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contribution_id INT NULL,
  member_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  contribution_month INT NOT NULL,
  contribution_year INT NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  payment_date DATE,
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(30) DEFAULT 'Completed',
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finance_income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  source VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  reference VARCHAR(100),
  attachment VARCHAR(500),
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  vendor VARCHAR(255),
  reference VARCHAR(100),
  attachment VARCHAR(500),
  approved_by INT NULL,
  recorded_by INT NULL,
  status VARCHAR(30) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

// Columns the routes use that were added after the tables above were first created.
// CREATE TABLE IF NOT EXISTS never changes an existing table, so these are added
// one by one, only when missing (works on both MySQL and MariaDB).
const columnUpgrades = [
  ['users', 'first_name', 'VARCHAR(100) NULL'],
  ['users', 'last_name', 'VARCHAR(100) NULL'],
  ['users', 'phone', 'VARCHAR(20) NULL'],
  ['members', 'monthly_contribution', 'DECIMAL(10,2) NULL'],
  ['leadership_assignments', 'display_order', 'INT NOT NULL DEFAULT 100'],
  ['members', 'gender', 'VARCHAR(10) NULL'],
  ['member_applications', 'gender', 'VARCHAR(10) NULL'],
  ['member_applications', 'date_of_birth', 'DATE NULL'],
  ['member_applications', 'email', 'VARCHAR(255) NULL'],
  ['member_applications', 'emergency_name', 'VARCHAR(150) NULL'],
  ['member_applications', 'emergency_phone', 'VARCHAR(30) NULL'],
  ['member_applications', 'emergency_relation', 'VARCHAR(60) NULL'],
  ['units', 'min_age', 'INT NULL'],
  ['units', 'max_age', 'INT NULL'],
  ['units', 'color', 'VARCHAR(20) NULL'],
  ['units', 'activities', 'TEXT NULL'],
  ['audit_logs', 'user_name', 'VARCHAR(255) NULL'],
  ['contact_messages', 'status', "VARCHAR(20) DEFAULT 'Unread'"],
  ['contact_messages', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
  ['attendance', 'session_id', 'INT NULL AFTER id'],
  // When an announcement was first published, sent to the bell and emailed (each happens once).
  ['announcements', 'published_at', 'DATETIME NULL'],
  ['announcements', 'notified_at', 'DATETIME NULL'],
  ['announcements', 'emailed_at', 'DATETIME NULL'],
];

async function upgradeColumns(connection) {
  for (const [table, column, definition] of columnUpgrades) {
    const [rows] = await connection.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
      [dbName, table, column]
    );
    if (rows.length === 0) {
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`Added column ${table}.${column}`);
    }
  }
}

// Extra indexes for lists that grow (added once, by name).
const indexUpgrades = [
  // The bell asks "how many unread for this user" every 30 seconds.
  ['notifications', 'idx_notifications_user_read', '(user_id, is_read, created_at)'],
];

async function upgradeIndexes(connection) {
  for (const [table, name, columns] of indexUpgrades) {
    const [rows] = await connection.query(
      'SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
      [dbName, table, name]
    );
    if (rows.length === 0) {
      await connection.query(`ALTER TABLE ${table} ADD INDEX ${name} ${columns}`);
      console.log(`Added index ${table}.${name}`);
    }
  }
}

// attendance.recorded_by first pointed to members, but the code stores the id of the
// logged-in user (like every other *_by column). Re-point it to users on older databases.
async function upgradeForeignKeys(connection) {
  const [fks] = await connection.query(
    `SELECT constraint_name AS name, referenced_table_name AS target FROM information_schema.key_column_usage
     WHERE table_schema = ? AND table_name = 'attendance' AND column_name = 'recorded_by' AND referenced_table_name IS NOT NULL`,
    [dbName]
  );
  if (fks.some(fk => fk.target === 'users')) return;
  for (const fk of fks) {
    await connection.query(`ALTER TABLE attendance DROP FOREIGN KEY \`${fk.name}\``);
  }
  // Old values were member ids, which mean nothing as user ids; clear any that are not users.
  await connection.query('UPDATE attendance SET recorded_by = NULL WHERE recorded_by IS NOT NULL AND recorded_by NOT IN (SELECT id FROM users)');
  await connection.query('ALTER TABLE attendance ADD CONSTRAINT attendance_recorded_by_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL');
  console.log('Pointed attendance.recorded_by to users');
}

// Tables replaced by newer ones (applications -> member_applications, contributions ->
// contribution_payments, financial_transactions -> finance_income/finance_expenses) or never
// used (documents, achievements). Dropped only when empty, so no data is ever lost.
const oldTables = ['applications', 'contributions', 'financial_transactions', 'documents', 'achievements'];

async function dropOldTables(connection) {
  for (const table of oldTables) {
    const [exists] = await connection.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
      [dbName, table]
    );
    if (exists.length === 0) continue;
    const [[{ count }]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    if (count > 0) {
      console.warn(`Kept old table ${table}: it still has ${count} row(s). Move or delete them, then run migrate again.`);
      continue;
    }
    await connection.query(`DROP TABLE \`${table}\``);
    console.log(`Dropped old empty table ${table}`);
  }
}

// Sign-ins used to be one key per account (users.refresh_token). Each existing key becomes a
// device session, so nobody is signed out by the upgrade; the old column is then emptied.
async function upgradeSessions(connection) {
  const crypto = require('crypto');
  const [rows] = await connection.query('SELECT id, refresh_token FROM users WHERE refresh_token IS NOT NULL');
  for (const u of rows) {
    const hash = crypto.createHash('sha256').update(String(u.refresh_token)).digest('hex');
    await connection.query(
      'INSERT IGNORE INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL 7 DAY)',
      [u.id, hash]
    );
    await connection.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [u.id]);
  }
  if (rows.length) console.log(`Moved ${rows.length} sign-in(s) to device sessions`);
}

// Attendance is kept per register (session), so a weekly meeting and an event on the same
// day no longer overwrite each other. Older databases kept one row per member per day:
// their rows are grouped into sessions (one per date, unit and event) and nothing is lost.
async function upgradeAttendanceSessions(connection) {
  const hasIndex = async (name) => {
    const [rows] = await connection.query(
      'SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
      [dbName, 'attendance', name]
    );
    return rows.length > 0;
  };

  // 1. Give every old row a session.
  const [groups] = await connection.query(
    `SELECT meeting_date, unit_id, event_id, MAX(recorded_by) AS recorded_by, COUNT(*) AS n
       FROM attendance WHERE session_id IS NULL GROUP BY meeting_date, unit_id, event_id`
  );
  for (const g of groups) {
    const [s] = await connection.query(
      'INSERT INTO attendance_sessions (session_date, session_type, unit_id, event_id, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [g.meeting_date, g.event_id ? 'Event' : 'Weekly meeting', g.unit_id, g.event_id, g.recorded_by]
    );
    await connection.query(
      `UPDATE attendance SET session_id = ? WHERE session_id IS NULL AND meeting_date = ?
         AND unit_id <=> ? AND event_id <=> ?`,
      [s.insertId, g.meeting_date, g.unit_id, g.event_id]
    );
  }
  if (groups.length) console.log(`Grouped old attendance into ${groups.length} session(s)`);

  // 2. The member foreign key needs its own index before the old per-day rule can go.
  if (!(await hasIndex('idx_attendance_member'))) {
    await connection.query('ALTER TABLE attendance ADD INDEX idx_attendance_member (member_id)');
  }
  if (await hasIndex('attendance_member_day')) {
    await connection.query('ALTER TABLE attendance DROP INDEX attendance_member_day');
    console.log('Removed the old one-row-per-day attendance rule');
  }
  if (!(await hasIndex('attendance_session_member'))) {
    await connection.query('ALTER TABLE attendance ADD UNIQUE KEY attendance_session_member (session_id, member_id)');
  }

  // 3. Deleting a session deletes its rows.
  const [fk] = await connection.query(
    `SELECT 1 FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = 'attendance'
       AND column_name = 'session_id' AND referenced_table_name = 'attendance_sessions'`,
    [dbName]
  );
  if (fk.length === 0) {
    await connection.query(
      'ALTER TABLE attendance ADD CONSTRAINT attendance_session_fk FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE'
    );
    console.log('Linked attendance rows to their sessions');
  }
}

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL successfully');

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database "${dbName}" created/verified`);
    await connection.query(`USE ${dbName}`);

    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await connection.query(stmt);
    }

    await upgradeColumns(connection);
    await upgradeIndexes(connection);
    await upgradeForeignKeys(connection);
    await upgradeAttendanceSessions(connection);
    await upgradeSessions(connection);
    await dropOldTables(connection);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
