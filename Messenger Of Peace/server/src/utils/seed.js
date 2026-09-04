const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'messengers_of_peace',
  charset: 'utf8mb4'
};

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database');

    const roles = [
      ['super_admin', 'Full system administrator'],
      ['chief', 'Chief de Group - full leadership'],
      ['deputy_chief', 'Deputy Chief - operational management'],
      ['secretary', 'Secretary - members, attendance, documents'],
      ['treasurer', 'Treasurer - finance and contributions'],
      ['discipline_officer', 'Discipline Officer - conduct and attendance follow-up'],
      ['unit_leader', 'Unit Leader - manage assigned unit'],
      ['media', 'Media/Communication - posts, gallery, portfolio'],
      ['member', 'Regular member'],
      ['applicant', 'Pending applicant']
    ];

    for (const [name, desc] of roles) {
      await connection.query('INSERT IGNORE INTO roles (name, description) VALUES (?, ?)', [name, desc]);
    }

    const permissions = [
      ['members.create', 'members'], ['members.read', 'members'], ['members.update', 'members'], ['members.delete', 'members'],
      ['leadership.create', 'leadership'], ['leadership.read', 'leadership'], ['leadership.update', 'leadership'], ['leadership.delete', 'leadership'],
      ['units.create', 'units'], ['units.read', 'units'], ['units.update', 'units'], ['units.delete', 'units'],
      ['attendance.create', 'attendance'], ['attendance.read', 'attendance'], ['attendance.update', 'attendance'],
      ['contributions.create', 'contributions'], ['contributions.read', 'contributions'], ['contributions.update', 'contributions'], ['contributions.approve', 'contributions'],
      ['finance.create', 'finance'], ['finance.read', 'finance'], ['finance.update', 'finance'], ['finance.approve', 'finance'],
      ['events.create', 'events'], ['events.read', 'events'], ['events.update', 'events'], ['events.delete', 'events'],
      ['portfolio.create', 'portfolio'], ['portfolio.read', 'portfolio'], ['portfolio.update', 'portfolio'], ['portfolio.approve', 'portfolio'],
      ['gallery.create', 'gallery'], ['gallery.read', 'gallery'], ['gallery.update', 'gallery'], ['gallery.approve', 'gallery'],
      ['announcements.create', 'announcements'], ['announcements.read', 'announcements'], ['announcements.update', 'announcements'], ['announcements.delete', 'announcements'],
      ['reports.view', 'reports'], ['reports.financial', 'reports'],
      ['settings.manage', 'settings'], ['users.manage', 'users']
    ];

    for (const [name, module] of permissions) {
      await connection.query('INSERT IGNORE INTO permissions (name, module) VALUES (?, ?)', [name, module]);
    }

    // Admin gets all permissions
    const [allPerms] = await connection.query('SELECT id FROM permissions');
    const [adminRole] = await connection.query('SELECT id FROM roles WHERE name = ?', ['super_admin']);
    if (adminRole[0]) {
      for (const perm of allPerms) {
        await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole[0].id, perm.id]);
      }
    }

    // Create default admin user
    const hash = await bcrypt.hash('Admin@123', 12);
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@mop.rw']);
    if (existing.length === 0) {
      await connection.query('INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)', ['admin@mop.rw', hash, adminRole[0].id]);
    }

    // Create default units
    const units = [
      ['Abatoni', 'abatoni', 'Umuryango w\'abana bato', 'Young Scouts', '🐾'],
      ['Inyesha', 'inyesha', 'Ubuyobozi n\'ubumenyi', 'Junior Scouts', '🏕️'],
      ['Abahizi', 'abahizi', 'Ubuyobozi n\'ubukorabikamye', 'Senior Scouts', '⚡']
    ];

    for (const [name, slug, desc, focus, icon] of units) {
      await connection.query('INSERT IGNORE INTO units (name, slug, description, focus_area, icon) VALUES (?, ?, ?, ?, ?)', [name, slug, desc, focus, icon]);
    }

    // Create default settings
    const settings = [
      ['group_name', 'Messengers of Peace Scout Group', 'text', 'general'],
      ['group_motto', 'Building Youth Capacity Through Education', 'text', 'general'],
      ['meeting_day', 'Sunday', 'text', 'general'],
      ['meeting_time', '13:30 - 16:30', 'text', 'general'],
      ['meeting_location', 'Camp Kigali, Nyarugenge, Kigali', 'text', 'general'],
      ['monthly_contribution', '500', 'number', 'finance'],
      ['whatsapp_contact', '+250722784670', 'text', 'contact'],
      ['phone_contact', '+250786188913', 'text', 'contact'],
      ['email_contact', 'info@mop.rw', 'text', 'contact'],
      ['min_age', '14', 'number', 'general'],
      ['mission', 'Guteza imbere impano, indimi, uburere mboneragihugu n\'indangagaciro.', 'textarea', 'about'],
      ['vision', 'Kubaka ubushobozi bw\'urubyiruko binyuze mu byo bigishwa.', 'textarea', 'about'],
      ['values', 'Kwicisha bugufi; Kubahiriza igihe; Kwiyubaha no kubaha Imana; Gukorera hamwe n\'urukundo; Isuku', 'textarea', 'about'],
      ['kirazira', 'Gusiba nta mpamvu; Kumena ibanga; Kwiyandarika; Kubiyobyabwenge; Kugenda nta kiranga; Kutubahiriza indangagaciro', 'textarea', 'about']
    ];

    for (const [key, value, type, cat] of settings) {
      await connection.query('INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, category) VALUES (?, ?, ?, ?)', [key, value, type, cat]);
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
