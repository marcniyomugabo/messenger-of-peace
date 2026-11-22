const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'messengers_of_peace',
  charset: 'utf8mb4'
};

// The first admin. Locally the defaults below are fine; on the live site ADMIN_PASSWORD must be
// set in .env to a strong password, because the default is written in the README for everyone.
const DEFAULT_ADMIN = { email: 'admin@mop.rw', password: 'Admin@123' };
const admin = {
  email: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN.email).trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN.password,
};

function adminPasswordProblem() {
  if (process.env.NODE_ENV !== 'production') return null;
  const p = process.env.ADMIN_PASSWORD || '';
  if (!p) return 'ADMIN_PASSWORD is not set.';
  if (p === DEFAULT_ADMIN.password) return 'ADMIN_PASSWORD is the public example password.';
  if (p.length < 12 || !/[a-zA-Z]/.test(p) || !/\d/.test(p)) return 'ADMIN_PASSWORD must have at least 12 characters, with letters and numbers.';
  return null;
}

async function seed() {
  const problem = adminPasswordProblem();
  if (problem) {
    console.error(`Seed stopped (nothing was changed): ${problem}`);
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env, then run "npm run seed" again.');
    process.exit(1);
  }
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
      ['finance.create', 'finance'], ['finance.read', 'finance'], ['finance.update', 'finance'], ['finance.delete', 'finance'], ['finance.approve', 'finance'],
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

    // Default permissions for other roles. Only adds what is missing, so changes
    // made later in Role Management are kept (removed defaults come back if seed runs again).
    const roleDefaults = {
      treasurer: ['finance.create', 'finance.update', 'finance.delete'],
      // The chief approves expenses; the treasurer records them (separation of duties).
      chief: ['finance.create', 'finance.update', 'finance.delete', 'finance.approve', 'reports.view'],
    };
    for (const [roleName, permNames] of Object.entries(roleDefaults)) {
      await connection.query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (?) WHERE r.name = ?`,
        [permNames, roleName]
      );
    }

    // Create the first admin (ADMIN_EMAIL / ADMIN_PASSWORD), only if it does not exist yet.
    // An existing admin and its password are never changed.
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [admin.email]);
    if (existing.length === 0) {
      const hash = await bcrypt.hash(admin.password, 12);
      await connection.query('INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)', [admin.email, hash, adminRole[0].id]);
      console.log(`Admin created: ${admin.email}`);
    } else {
      console.log(`Admin ${admin.email} already exists (password not changed)`);
    }

    // Create the four scout units (their descriptions, ages and activities come from `npm run seed:content`).
    // The slug is the value the Join Us form sends, so it must not change.
    const units = [
      ['Abatoni', 'abatoni', 'Cub Scouts', 1],
      ['Inkesha', 'inkesha', 'Scouts', 2],
      ['Abahizi', 'abahizi', 'Companions', 3],
      ['Ingenzi', 'ingenzi', 'Rovers', 4]
    ];

    for (const [name, slug, focus, order] of units) {
      await connection.query('INSERT IGNORE INTO units (name, slug, focus_area, display_order) VALUES (?, ?, ?, ?)', [name, slug, focus, order]);
    }

    // Create default settings
    const settings = [
      ['group_name', 'Messengers of Peace Scout Group', 'text', 'general'],
      ['group_motto', 'Building Youth Capacity Through Education', 'text', 'general'],
      ['meeting_day', 'Sunday', 'text', 'general'],
      ['meeting_time', '13:30 - 16:30', 'text', 'general'],
      ['meeting_location', 'Camp Kigali, Nyarugenge District, Kigali', 'text', 'general'],
      ['group_description', 'Building tomorrow\'s leaders through scouting values, community service, and the spirit of peace. Part of the Rwanda Scout Association.', 'textarea', 'general'],
      ['monthly_contribution', '500', 'number', 'finance'],
      ['whatsapp_contact', '+250 722 784 670', 'text', 'contact'],
      ['phone_contact', '+250 786 188 913', 'text', 'contact'],
      ['email_contact', 'info@mopscouts.rw', 'text', 'contact'],
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
