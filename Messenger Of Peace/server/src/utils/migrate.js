const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
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

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  focus_area VARCHAR(200),
  icon VARCHAR(100),
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

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  event_id INT NULL,
  meeting_date DATE NOT NULL,
  status ENUM('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
  reason TEXT,
  recorded_by INT NULL,
  unit_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES members(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  contribution_month INT NOT NULL,
  contribution_year INT NOT NULL,
  status ENUM('Pending','Paid','Partial','Exempted','Rejected') DEFAULT 'Pending',
  payment_method VARCHAR(50),
  receipt_number VARCHAR(100),
  reference_number VARCHAR(100),
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('Deposit','Withdrawal','Adjustment','Contribution') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(255),
  member_id INT NULL,
  reference_number VARCHAR(100),
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_achieved DATE,
  category VARCHAR(100),
  member_id INT NULL,
  unit_id INT NULL,
  status ENUM('Draft','Published') DEFAULT 'Draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  category ENUM('Minutes','Policy','Report','Other') DEFAULT 'Other',
  is_public BOOLEAN DEFAULT FALSE,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  school VARCHAR(200),
  location VARCHAR(255),
  motivation TEXT,
  unit_preference VARCHAR(100),
  parent_name VARCHAR(200),
  parent_phone VARCHAR(20),
  status ENUM('Pending','Reviewed','Approved','Rejected') DEFAULT 'Pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
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
`;

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
