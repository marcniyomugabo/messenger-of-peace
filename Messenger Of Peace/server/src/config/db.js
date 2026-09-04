const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

let useInMemory = false;
let pool;

class InMemoryDB {
  constructor() {
    this.tables = {};
    this.autoIncrement = {};
  }

  createTable(name, columns) {
    this.tables[name] = [];
    this.autoIncrement[name] = 1;
    this.tables[name]._columns = columns;
  }

  insert(table, row) {
    if (!this.tables[table]) this.tables[table] = [];
    const id = this.autoIncrement[table] || this.tables[table].length + 1;
    row.id = id;
    row.created_at = row.created_at || new Date().toISOString();
    row.updated_at = row.updated_at || new Date().toISOString();
    this.tables[table].push(row);
    this.autoIncrement[table] = id + 1;
    return { insertId: id, affectedRows: 1 };
  }

  select(table, where = {}) {
    if (!this.tables[table]) return [];
    return this.tables[table].filter(row => matchWhere(row, where));
  }

  update(table, set, where = {}) {
    if (!this.tables[table]) return { affectedRows: 0 };
    let count = 0;
    this.tables[table].forEach(row => {
      const match = Object.entries(where).every(([k, v]) => row[k] == v);
      if (match) {
        Object.entries(set).forEach(([k, v]) => { row[k] = v; });
        row.updated_at = new Date().toISOString();
        count++;
      }
    });
    return { affectedRows: count };
  }

  delete(table, where = {}) {
    if (!this.tables[table]) return { affectedRows: 0 };
    const before = this.tables[table].length;
    this.tables[table] = this.tables[table].filter(row => {
      return !Object.entries(where).every(([k, v]) => row[k] == v);
    });
    return { affectedRows: before - this.tables[table].length };
  }

  count(table, where = {}) { return this.select(table, where).length; }
  sum(table, field, where = {}) { return this.select(table, where).reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0); }
  findById(table, id) { if (!this.tables[table]) return null; return this.tables[table].find(row => row.id == id) || null; }
}

const db = new InMemoryDB();

async function seedInMemory() {
  db.createTable('roles', ['id', 'name', 'description']);
  db.createTable('permissions', ['id', 'name', 'module']);
  db.createTable('role_permissions', ['role_id', 'permission_id']);
  db.createTable('users', ['id', 'email', 'password_hash', 'role_id', 'is_active', 'last_login', 'refresh_token']);
  db.createTable('members', ['id', 'user_id', 'member_code', 'first_name', 'last_name', 'phone', 'email', 'whatsapp', 'school', 'location', 'date_of_birth', 'photo', 'status', 'unit_id', 'join_date', 'notes', 'monthly_contribution']);
  db.createTable('units', ['id', 'name', 'slug', 'description', 'focus_area', 'icon', 'is_active']);
  db.createTable('unit_members', ['id', 'unit_id', 'member_id', 'role', 'is_active']);
  db.createTable('events', ['id', 'title', 'category', 'description', 'venue', 'start_date', 'end_date', 'status', 'budget', 'created_by']);
  db.createTable('event_participants', ['id', 'event_id', 'member_id', 'status']);
  db.createTable('attendance', ['id', 'member_id', 'event_id', 'meeting_date', 'status', 'unit_id', 'recorded_by']);
  db.createTable('applications', ['id', 'application_code', 'first_name', 'last_name', 'email', 'phone', 'whatsapp', 'date_of_birth', 'age_at_application', 'location', 'unit_preference', 'recommended_unit', 'education_status', 'school_name', 'study_level', 'field_of_study', 'employment_status', 'company_name', 'job_title', 'occupation', 'business_name', 'business_description', 'other_description', 'motivation', 'parent_guardian_name', 'parent_guardian_phone', 'status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']);
  db.createTable('member_applications', ['id', 'application_code', 'first_name', 'second_name', 'phone', 'location', 'district', 'sector', 'cell', 'unit', 'studying', 'school_name', 'school_location', 'has_job', 'job', 'company', 'current_activity', 'parent_first_name', 'parent_second_name', 'parent_phone', 'status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']);
  db.createTable('contributions', ['id', 'member_id', 'amount', 'contribution_month', 'contribution_year', 'status', 'payment_method']);
  db.createTable('financial_transactions', ['id', 'type', 'amount', 'description', 'member_id', 'status', 'created_at']);
  db.createTable('portfolio_projects', ['id', 'title', 'description', 'status', 'created_by', 'created_at']);
  db.createTable('posts', ['id', 'title', 'slug', 'content', 'status', 'created_by']);
  db.createTable('media', ['id', 'title', 'file_path', 'file_type', 'category', 'caption', 'alt_text', 'mime_type', 'file_size', 'is_approved', 'is_public', 'event_id', 'project_id', 'uploaded_by', 'created_at']);
  db.createTable('settings', ['id', 'setting_key', 'setting_value', 'setting_type', 'category', 'updated_by']);
  db.createTable('leadership_assignments', ['id', 'member_id', 'position', 'unit_id', 'is_active', 'start_date', 'end_date']);
  db.createTable('documents', ['id', 'title', 'description', 'file_path', 'category']);
  db.createTable('contact_messages', ['id', 'name', 'email', 'phone', 'subject', 'message', 'status', 'is_read', 'replied', 'created_at', 'updated_at']);
  db.createTable('finance_income', ['id', 'date', 'amount', 'source', 'category', 'description', 'reference', 'attachment', 'recorded_by', 'created_at']);
  db.createTable('finance_expenses', ['id', 'date', 'amount', 'category', 'description', 'vendor', 'reference', 'attachment', 'approved_by', 'recorded_by', 'status', 'created_at']);
  db.createTable('notifications', ['id', 'user_id', 'title', 'message', 'type', 'is_read', 'link', 'created_at']);
  db.createTable('audit_logs', ['id', 'user_id', 'user_name', 'action', 'module', 'record_id', 'old_value', 'new_value', 'ip_address', 'created_at']);
  db.createTable('member_guardians', ['id', 'member_id', 'guardian_name', 'phone', 'email']);
  db.createTable('contribution_settings', ['id', 'monthly_amount', 'currency', 'effective_from', 'created_at', 'updated_at']);
  db.createTable('member_contributions', ['id', 'member_id', 'contribution_month', 'contribution_year', 'required_amount', 'total_paid', 'balance', 'status', 'created_at', 'updated_at']);
  db.createTable('contribution_payments', ['id', 'contribution_id', 'member_id', 'amount', 'contribution_month', 'contribution_year', 'payment_method', 'payment_date', 'reference_number', 'notes', 'status', 'recorded_by', 'created_at', 'updated_at']);

  db.createTable('activities', ['id', 'title', 'slug', 'description', 'short_description', 'cover_image', 'location', 'organizer', 'category_id', 'start_date', 'end_date', 'start_time', 'end_time', 'status', 'is_featured', 'registration_enabled', 'registration_deadline', 'max_participants', 'created_by', 'created_at', 'updated_at']);
  db.createTable('activity_categories', ['id', 'name', 'slug', 'description', 'color', 'icon', 'is_active']);
  db.createTable('gallery_albums', ['id', 'title', 'slug', 'description', 'cover_image', 'status', 'created_by', 'created_at', 'updated_at']);
  db.createTable('gallery_images', ['id', 'album_id', 'media_id', 'title', 'caption', 'description', 'image_url', 'sort_order', 'is_cover', 'created_at']);
  db.createTable('library_resources', ['id', 'title', 'slug', 'description', 'category', 'author', 'file_path', 'cover_image', 'file_type', 'file_size', 'tags', 'download_count', 'is_featured', 'status', 'created_by', 'created_at', 'updated_at']);
  db.createTable('hero_slides', ['id', 'title', 'subtitle', 'description', 'background_image', 'button_text', 'button_link', 'sort_order', 'is_active', 'created_at', 'updated_at']);
  db.createTable('homepage_sections', ['id', 'title', 'content', 'section_type', 'image', 'sort_order', 'is_active', 'settings', 'created_at', 'updated_at']);
  db.createTable('about_content', ['id', 'section_key', 'title', 'content', 'image', 'sort_order', 'is_active', 'created_at', 'updated_at']);
  db.createTable('navigation_items', ['id', 'label', 'url', 'parent_id', 'sort_order', 'is_active', 'opens_new_tab', 'icon', 'created_at', 'updated_at']);
  db.createTable('seo_settings', ['id', 'page_slug', 'title', 'description', 'keywords', 'og_image', 'canonical_url', 'created_at', 'updated_at']);

  const roles = [
    { name: 'super_admin', description: 'Full system administrator' },
    { name: 'chief', description: 'Chief de Group' },
    { name: 'deputy_chief', description: 'Deputy Chief' },
    { name: 'secretary', description: 'Secretary' },
    { name: 'treasurer', description: 'Treasurer' },
    { name: 'unit_leader', description: 'Unit Leader' },
    { name: 'media', description: 'Media/Communication' },
    { name: 'member', description: 'Regular member' },
  ];
  roles.forEach(r => db.insert('roles', r));

  const perms = [
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
  perms.forEach(([name, module]) => db.insert('permissions', { name, module }));

  const allPerms = db.tables.permissions;
  allPerms.forEach(p => db.insert('role_permissions', { role_id: 1, permission_id: p.id }));

  const hash = await bcrypt.hash('Admin@123', 12);
  db.insert('users', { email: 'admin@mop.rw', password_hash: hash, role_id: 1, is_active: 1 });

  db.insert('units', { name: 'Abatoni', slug: 'abatoni', description: 'Cub Scouts - Ages 6-12', focus_area: 'Cub Scouts', icon: '\uD83C\uDFD5\uFE0F', is_active: 1 });
  db.insert('units', { name: 'Inkesha', slug: 'inkesha', description: 'Scouts - Ages 13-16', focus_area: 'Scouts', icon: '\uD83E\uDDED', is_active: 1 });
  db.insert('units', { name: 'Abahizi', slug: 'abahizi', description: 'Companions - Ages 17-20', focus_area: 'Companions', icon: '\uD83E\uDD1D', is_active: 1 });
  db.insert('units', { name: 'Ingenzi', slug: 'inganzi', description: 'Rovers - Ages 21-25', focus_area: 'Rovers', icon: '\uD83C\uDF1F', is_active: 1 });

  const memberNames = [
    ['Jean', 'Uwimana', 'Active', 1, '2025-01-10'], ['Marie', 'Ingabire', 'Active', 2, '2025-02-15'],
    ['Pierre', 'Nkurunziza', 'Active', 3, '2025-03-20'], ['Claude', 'Mukamana', 'Active', 1, '2025-01-25'],
    ['Grace', 'Uwizeyimana', 'Active', 2, '2025-04-05'], ['Emmanuel', 'Hakizimana', 'Active', 3, '2025-05-12'],
    ['Diane', 'Ishimwe', 'Active', 1, '2025-06-18'], ['Patrick', 'Bizimana', 'Active', 2, '2025-07-01'],
    ['Josiane', 'Nyirahabimana', 'Applicant', null, '2026-08-10'], ['Kevin', 'Ndayisaba', 'Active', 3, '2025-08-22'],
    ['Assumpta', 'Kamana', 'Active', 1, '2025-09-03'], ['Dieudonne', 'Sindayigaya', 'Active', 2, '2025-10-14'],
    ['Immaculee', 'Gwladys', 'Active', 3, '2025-11-08'], ['Thierry', 'Manzi', 'Active', 1, '2026-01-06'],
    ['Chantal', 'Uwitonze', 'Inactive', 2, '2025-03-10'], ['Fidele', 'Nsengimana', 'Active', 3, '2026-02-14'],
    ['Sandrine', 'Mukarugwiza', 'Active', 1, '2026-03-01'], ['Benjamin', 'Kazungu', 'Active', 2, '2026-04-08'],
    ['Ange', 'Ikuzwe', 'Active', 3, '2026-05-20'], ['Yvette', 'Muvunanyambo', 'Active', 1, '2026-06-15'],
    ['Blaise', 'Niyongira', 'Active', 2, '2026-07-10'], ['Solange', 'Uwamahoro', 'Active', 3, '2025-01-15'],
    ['Eric', 'Habimana', 'Active', 1, '2025-04-22'], ['Odette', 'Nyirarukundo', 'Applicant', null, '2026-08-12'],
    ['Arnauld', 'Rukundo', 'Active', 2, '2025-06-30'], ['Doris', 'Niyonsaba', 'Active', 3, '2025-08-05'],
    ['Francois', 'Birindwa', 'Active', 1, '2025-10-18'], ['Helene', 'Dusabe', 'Active', 2, '2025-12-01'],
    ['Cesar', 'Nshimiyimana', 'Active', 3, '2026-01-20'], ['Vestine', 'Nyinawumuntu', 'Active', 1, '2026-04-12'],
  ];
  memberNames.forEach(([first, last, status, unitId, joinDate], i) => {
    db.insert('members', {
      user_id: i === 0 ? 1 : null, member_code: 'MOP-' + String(i + 1).padStart(4, '0'),
      first_name: first, last_name: last, status, unit_id: unitId,
      phone: '+250788' + String(100000 + i).slice(-6),
      join_date: joinDate, monthly_contribution: 500
    });
  });

  db.tables.members.filter(m => m.unit_id).forEach(m => {
    db.insert('unit_members', { unit_id: m.unit_id, member_id: m.id, role: 'Member', is_active: 1 });
  });

  const events = [
    { title: 'Weekly Meeting - January', category: 'Meeting', venue: 'Camp Kigali', start_date: '2026-01-05T13:30:00', status: 'Completed', budget: 0 },
    { title: 'First Aid Training', category: 'Training', venue: 'Camp Kigali', start_date: '2026-02-15T09:00:00', status: 'Completed', budget: 50000 },
    { title: 'Environmental Cleanup', category: 'Community Service', venue: 'Nyarugenge District', start_date: '2026-03-20T08:00:00', status: 'Completed', budget: 25000 },
    { title: 'Youth Leadership Workshop', category: 'Training', venue: 'Kigali Marriott', start_date: '2026-04-10T09:00:00', status: 'Completed', budget: 100000 },
    { title: 'Camp Fire Night', category: 'Camp', venue: 'Camp Kigali', start_date: '2026-05-25T17:00:00', status: 'Completed', budget: 30000 },
    { title: 'Scout Camp 2026', category: 'Camp', venue: 'Nyungwe Forest', start_date: '2026-07-15T08:00:00', status: 'Completed', budget: 500000 },
    { title: 'Peace Day Celebration', category: 'Celebration', venue: 'Camp Kigali', start_date: '2026-09-21T10:00:00', status: 'Published', budget: 75000 },
    { title: 'Annual General Meeting', category: 'Meeting', venue: 'Camp Kigali', start_date: '2026-12-14T09:00:00', status: 'Published', budget: 20000 },
    { title: 'Tree Planting Campaign', category: 'Community Service', venue: 'Nyarugenge Hills', start_date: '2026-08-20T08:00:00', status: 'Published', budget: 40000 },
    { title: 'Scouting Skills Competition', category: 'Training', venue: 'Camp Kigali', start_date: '2026-10-15T09:00:00', status: 'Published', budget: 60000 },
  ];
  events.forEach(e => db.insert('events', { ...e, created_by: 1 }));

  db.insert('applications', { application_code: 'MOP-APP-0001', first_name: 'Josiane', last_name: 'Nyirahabimana', phone: '+250788000001', location: 'Nyarugenge', unit_preference: 'Abatoni', recommended_unit: 'Abatoni', age_at_application: 14, education_status: 'student', school_name: 'Ecole Sainte Marie', study_level: 'Secondary 2', status: 'Pending', created_at: '2026-08-10T10:00:00Z' });
  db.insert('applications', { application_code: 'MOP-APP-0002', first_name: 'Odette', last_name: 'Nyirarukundo', phone: '+250788000002', location: 'Gasabo', unit_preference: 'Inkesha', recommended_unit: 'Inkesha', age_at_application: 15, education_status: 'student', school_name: 'Lycée de Kigali', study_level: 'Secondary 3', status: 'Pending', created_at: '2026-08-12T10:00:00Z' });
  db.insert('applications', { application_code: 'MOP-APP-0003', first_name: 'Fabrice', last_name: 'Hagenimana', phone: '+250788000003', location: 'Huye', unit_preference: 'Abahizi', recommended_unit: 'Abahizi', age_at_application: 18, education_status: 'student', school_name: 'University of Rwanda', study_level: 'Year 2', field_of_study: 'Computer Science', status: 'Reviewed', created_at: '2026-08-05T10:00:00Z' });
  db.insert('applications', { application_code: 'MOP-APP-0004', first_name: 'Aline', last_name: 'Uwimana', phone: '+250788000004', location: 'Muhanga', unit_preference: 'Abatoni', recommended_unit: 'Abatoni', age_at_application: 10, education_status: 'student', school_name: 'Ecole Primaire Muhanga', study_level: 'Primary 5', status: 'Approved', created_at: '2026-07-20T10:00:00Z' });

  db.insert('member_applications', { application_code: 'MOP-APP-0001', first_name: 'Jean', second_name: 'Mutabazi', phone: '+250781001001', location: 'Kicukiro', district: 'Kicukiro', sector: 'Gatenga', cell: 'Kagarama', unit: 'inkesha', studying: 1, school_name: 'GS Kicukiro', school_location: 'Kicukiro, Gatenga', parent_first_name: 'Emmanuel', parent_second_name: 'Mutabazi', parent_phone: '+250782001001', status: 'Pending', created_at: '2026-08-01T09:00:00Z' });
  db.insert('member_applications', { application_code: 'MOP-APP-0002', first_name: 'Claudine', second_name: 'Uwimana', phone: '+250781001002', location: 'Nyarugenge', district: 'Nyarugenge', sector: 'Gitega', cell: 'Nyamirambo', unit: 'abahizi', studying: 1, school_name: 'University of Rwanda', school_location: 'Nyarugenge, Gitega', parent_first_name: 'Pierre', parent_second_name: 'Uwimana', parent_phone: '+250782001002', status: 'Pending', created_at: '2026-08-05T10:00:00Z' });
  db.insert('member_applications', { application_code: 'MOP-APP-0003', first_name: 'Patrick', second_name: 'Nshimiyimana', phone: '+250781001003', location: 'Huye', district: 'Huye', sector: 'Ngoma', cell: 'Karama', unit: 'ingenzi', studying: 0, has_job: 1, job: 'Teacher', company: 'GS Ngoma', parent_first_name: 'Jean', parent_second_name: 'Nshimiyimana', parent_phone: '+250782001003', status: 'Reviewed', created_at: '2026-08-08T11:00:00Z' });
  db.insert('member_applications', { application_code: 'MOP-APP-0004', first_name: 'Esperance', second_name: 'Iradukunda', phone: '+250781001004', location: 'Gasabo', district: 'Gasabo', sector: 'Kimironko', cell: 'Bibare', unit: 'abatoni', studying: 1, school_name: 'Ecole Kimironko', school_location: 'Gasabo, Kimironko', parent_first_name: 'David', parent_second_name: 'Iradukunda', parent_phone: '+250782001004', status: 'Pending', created_at: '2026-08-12T08:00:00Z' });
  db.insert('member_applications', { application_code: 'MOP-APP-0005', first_name: 'Sylvestre', second_name: 'Niyonzima', phone: '+250781001005', location: 'Muhanga', district: 'Muhanga', sector: 'Nyabikenke', cell: 'Cyumba', unit: 'inkesha', studying: 0, has_job: 0, current_activity: 'Looking for a job and doing volunteer work', parent_first_name: 'Jean', parent_second_name: 'Niyonzima', parent_phone: '+250782001005', status: 'Approved', created_at: '2026-07-28T14:00:00Z' });

  for (let m = 1; m <= 8; m++) {
    for (let month = 1; month <= 8; month++) {
      if (Math.random() > 0.2) {
        db.insert('contributions', {
          member_id: m, amount: 500, contribution_month: month, contribution_year: 2026,
          status: Math.random() > 0.1 ? 'Paid' : 'Pending', payment_method: 'Mobile Money'
        });
      }
    }
  }

  const txTypes = ['Deposit', 'Contribution', 'Withdrawal'];
  for (let i = 0; i < 15; i++) {
    const type = txTypes[i % 3];
    db.insert('financial_transactions', {
      type, amount: (Math.floor(Math.random() * 20) + 1) * 10000,
      description: type === 'Deposit' ? 'Monthly contribution collection' : type === 'Withdrawal' ? 'Event supplies purchase' : 'Member contribution',
      status: 'Approved',
      created_at: new Date(2026, Math.floor(Math.random() * 8), Math.floor(Math.random() * 28) + 1).toISOString()
    });
  }

  const projects = [
    { title: 'Tree Planting Initiative', description: 'Community-wide tree planting campaign', status: 'Published' },
    { title: 'Health Awareness Campaign', description: 'Health education sessions in local communities', status: 'Published' },
    { title: 'School Supply Drive', description: 'Collecting school supplies for underprivileged students', status: 'Published' },
    { title: 'Youth Leadership Workshop', description: 'Building leadership skills among senior scouts', status: 'Published' },
  ];
  projects.forEach(p => db.insert('portfolio_projects', { ...p, created_by: 1 }));

  db.insert('posts', { title: 'Welcome to MOP Scout Group', slug: 'welcome-mop', content: 'Building tomorrow leaders.', status: 'Published', created_by: 1 });
  db.insert('posts', { title: 'Annual Scout Camp 2026', slug: 'scout-camp-2026', content: 'Join us for the annual camp.', status: 'Published', created_by: 1 });

  for (let i = 1; i <= 10; i++) {
    db.insert('media', { title: 'Gallery Photo ' + i, file_path: '/images/gallery/photo' + i + '.jpeg', file_type: 'Photo', is_approved: 1, uploaded_by: 1, category: ['Camping', 'Community Service', 'Training', 'Environment'][i % 4] });
  }

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
  ];
  settings.forEach(([key, value, type, cat]) => db.insert('settings', { setting_key: key, setting_value: value, setting_type: type, category: cat }));

  db.insert('leadership_assignments', { member_id: 1, position: 'Chief de Group', unit_id: null, is_active: 1, start_date: '2025-01-01' });
  db.insert('leadership_assignments', { member_id: 2, position: 'Secretary', unit_id: null, is_active: 1, start_date: '2025-01-01' });
  db.insert('leadership_assignments', { member_id: 3, position: 'Treasurer', unit_id: null, is_active: 1, start_date: '2025-01-01' });

  const contactNames = ['Jean Mugabo', 'Marie Claire Uwimana', 'Patrick Ndayisaba', 'Grace Umutoni', 'Eric Habimana'];
  const contactSubjects = ['Membership Inquiry', 'Event Collaboration Request', 'Volunteer Opportunity', 'Donation Inquiry', 'Partnership Proposal'];
  const contactMsgs = [
    'I would like to know more about joining the scout group. My son is 14 years old.',
    'Our organization would like to collaborate on an upcoming community service event.',
    'I am interested in volunteering as a scout leader. I have previous experience.',
    'We would like to make a donation to support your scouting activities.',
    'Our company would like to explore a partnership opportunity with your group.',
  ];
  for (let i = 0; i < 5; i++) {
    db.insert('contact_messages', {
      name: contactNames[i], email: contactNames[i].toLowerCase().replace(/ /g, '.') + '@example.com',
      subject: contactSubjects[i], message: contactMsgs[i],
      status: i < 2 ? 'Read' : 'Unread',
      created_at: new Date(2026, 0, 10 + i * 3).toISOString()
    });
  }

  const announcements = [
    { title: 'Annual General Meeting', content: 'The Annual General Meeting will be held on March 15, 2026 at Camp Kigali. All members and parents are invited to attend.', priority: 'High', status: 'Published', target_audience: 'All' },
    { title: 'New Uniform Distribution', content: 'New scout uniforms are now available. All members are required to wear the updated uniform starting February 2026.', priority: 'Medium', status: 'Published', target_audience: 'Members' },
    { title: 'Easter Camp Registration Open', content: 'Registration for the Easter Scout Camp 2026 is now open. Register before March 20, 2026. Limited spots available.', priority: 'High', status: 'Published', target_audience: 'All' },
    { title: 'Monthly Contribution Reminder', content: 'Please ensure your monthly contribution of 500 RWF is submitted before the end of each month. Contact the treasurer for any issues.', priority: 'Low', status: 'Draft', target_audience: 'Members' },
    { title: 'First Aid Training Workshop', content: 'A first aid training workshop will be conducted on April 5, 2026. All patrol leaders are required to attend.', priority: 'Medium', status: 'Published', target_audience: 'Leaders' },
  ];
  announcements.forEach(a => db.insert('announcements', { ...a, created_by: 1, created_at: new Date().toISOString() }));

  db.insert('contribution_settings', { monthly_amount: 500, currency: 'RWF', effective_from: '2025-01-01' });

  const activeMembers = db.tables.members.filter(m => m.status === 'Active');
  activeMembers.forEach(member => {
    const joinDate = new Date(member.join_date);
    const joinMonth = joinDate.getMonth() + 1;
    const joinYear = joinDate.getFullYear();
    const currentMonth = 8;
    const currentYear = 2026;
    for (let y = joinYear; y <= currentYear; y++) {
      const startM = y === joinYear ? joinMonth : 1;
      const endM = y === currentYear ? currentMonth : 12;
      for (let month = startM; month <= endM; month++) {
        const mc = member.monthly_contribution || 500;
        const hasPaid = Math.random() > 0.25;
        const paidAmount = hasPaid ? mc : (Math.random() > 0.7 ? Math.floor(mc * 0.5) : 0);
        const status = paidAmount >= mc ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';
        const contrib = db.insert('member_contributions', {
          member_id: member.id, contribution_month: month, contribution_year: y,
          required_amount: mc, total_paid: paidAmount, balance: mc - paidAmount, status
        });
        if (paidAmount > 0) {
          const methods = ['Cash', 'Mobile Money', 'Bank'];
          const day = Math.floor(Math.random() * 25) + 1;
          db.insert('contribution_payments', {
            contribution_id: contrib.insertId, member_id: member.id, amount: paidAmount,
            contribution_month: month, contribution_year: y,
            payment_method: methods[Math.floor(Math.random() * methods.length)],
            payment_date: `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            status: 'Completed', recorded_by: 1
          });
        }
      }
    }
  });

  const incomeRecords = [
    { date: '2026-01-15', amount: 50000, source: 'Monthly Contributions', category: 'Contributions', description: 'January member contributions collection', reference: 'INC-001', recorded_by: 1 },
    { date: '2026-02-10', amount: 75000, source: 'Donation - Kigali Chamber', category: 'Donations', description: 'Corporate donation for scout activities', reference: 'INC-002', recorded_by: 1 },
    { date: '2026-02-20', amount: 55000, source: 'Monthly Contributions', category: 'Contributions', description: 'February member contributions', reference: 'INC-003', recorded_by: 1 },
    { date: '2026-03-05', amount: 200000, source: 'Government Grant', category: 'Grants', description: 'Youth development program grant', reference: 'INC-004', recorded_by: 1 },
    { date: '2026-03-18', amount: 60000, source: 'Monthly Contributions', category: 'Contributions', description: 'March member contributions', reference: 'INC-005', recorded_by: 1 },
    { date: '2026-04-10', amount: 30000, source: 'Event Revenue', category: 'Events', description: 'Fundraising dinner proceeds', reference: 'INC-006', recorded_by: 1 },
    { date: '2026-05-12', amount: 100000, source: 'Donation - UNICEF', category: 'Donations', description: 'Child welfare program support', reference: 'INC-007', recorded_by: 1 },
    { date: '2026-06-01', amount: 65000, source: 'Monthly Contributions', category: 'Contributions', description: 'June member contributions', reference: 'INC-008', recorded_by: 1 },
    { date: '2026-07-15', amount: 45000, source: 'Camp Fees', category: 'Events', description: 'Scout camp 2026 registration fees', reference: 'INC-009', recorded_by: 1 },
    { date: '2026-08-01', amount: 70000, source: 'Monthly Contributions', category: 'Contributions', description: 'August member contributions', reference: 'INC-010', recorded_by: 1 },
  ];
  incomeRecords.forEach(r => db.insert('finance_income', r));

  const expenseRecords = [
    { date: '2026-01-20', amount: 35000, category: 'Supplies', description: 'First aid kit supplies and materials', vendor: 'Pharmacie de la Paix', reference: 'EXP-001', recorded_by: 1, status: 'Approved', approved_by: 1 },
    { date: '2026-02-25', amount: 80000, category: 'Training', description: 'First Aid Training facilitator fees', vendor: 'Red Cross Rwanda', reference: 'EXP-002', recorded_by: 1, status: 'Approved', approved_by: 1 },
    { date: '2026-03-10', amount: 15000, category: 'Supplies', description: 'Environmental cleanup bags and gloves', vendor: 'Rwanda Waste Management', reference: 'EXP-003', recorded_by: 1, status: 'Approved', approved_by: 1 },
    { date: '2026-04-05', amount: 120000, category: 'Events', description: 'Youth Leadership Workshop venue and catering', vendor: 'Kigali Marriott Hotel', reference: 'EXP-004', recorded_by: 1, status: 'Approved', approved_by: 1 },
    { date: '2026-05-20', amount: 25000, category: 'Uniforms', description: 'New uniform patches and badges', vendor: 'Scout Uniforms Rwanda', reference: 'EXP-005', recorded_by: 1, status: 'Approved', approved_by: 1 },
    { date: '2026-06-30', amount: 450000, category: 'Camp', description: 'Nyungwe Forest camp site fees and transport', vendor: 'Nyungwe Eco Lodge', reference: 'EXP-006', recorded_by: 1, status: 'Approved', approved_by: 1 },
    { date: '2026-07-10', amount: 10000, category: 'Admin', description: 'Office supplies and printing', vendor: 'Vision Print House', reference: 'EXP-007', recorded_by: 1, status: 'Pending', approved_by: null },
    { date: '2026-08-05', amount: 35000, category: 'Transport', description: 'Monthly meeting transport costs', vendor: 'Kigali Bus Service', reference: 'EXP-008', recorded_by: 1, status: 'Approved', approved_by: 1 },
  ];
  expenseRecords.forEach(r => db.insert('finance_expenses', r));

  const auditEntries = [
    { user_id: 1, user_name: 'admin@mop.rw', action: 'member.created', module: 'members', record_id: 1, new_value: '{"first_name":"Jean","last_name":"Uwimana"}', ip_address: '127.0.0.1', created_at: '2026-01-10T10:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'member.created', module: 'members', record_id: 2, new_value: '{"first_name":"Marie","last_name":"Ingabire"}', ip_address: '127.0.0.1', created_at: '2026-02-15T10:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'payment.recorded', module: 'contributions', record_id: 1, new_value: '{"amount":50000,"member_id":1}', ip_address: '127.0.0.1', created_at: '2026-01-15T14:30:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'application.approved', module: 'applications', record_id: 4, old_value: '{"status":"Pending"}', new_value: '{"status":"Approved"}', ip_address: '127.0.0.1', created_at: '2026-07-20T11:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'user.login', module: 'auth', record_id: 1, ip_address: '192.168.1.10', created_at: '2026-08-01T08:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'content.published', module: 'announcements', record_id: 1, new_value: '{"title":"Annual General Meeting","status":"Published"}', ip_address: '127.0.0.1', created_at: '2026-01-05T09:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'event.created', module: 'events', record_id: 1, new_value: '{"title":"Weekly Meeting - January"}', ip_address: '127.0.0.1', created_at: '2026-01-02T10:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'finance.income_recorded', module: 'finance', record_id: 1, new_value: '{"amount":50000,"source":"Monthly Contributions"}', ip_address: '127.0.0.1', created_at: '2026-01-15T15:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'finance.expense_approved', module: 'finance', record_id: 1, old_value: '{"status":"Pending"}', new_value: '{"status":"Approved"}', ip_address: '127.0.0.1', created_at: '2026-01-21T09:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'member.updated', module: 'members', record_id: 5, old_value: '{"status":"Active"}', new_value: '{"status":"Active","unit_id":2}', ip_address: '127.0.0.1', created_at: '2026-04-05T10:30:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'leadership.assigned', module: 'leadership', record_id: 1, new_value: '{"member_id":1,"position":"Chief de Group"}', ip_address: '127.0.0.1', created_at: '2026-01-01T08:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'media.uploaded', module: 'media', record_id: 1, new_value: '{"title":"Gallery Photo 1"}', ip_address: '127.0.0.1', created_at: '2026-03-10T14:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'settings.updated', module: 'settings', record_id: 1, old_value: '{"setting_value":"previous_name"}', new_value: '{"setting_value":"Messengers of Peace Scout Group"}', ip_address: '127.0.0.1', created_at: '2026-01-03T10:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'application.reviewed', module: 'applications', record_id: 3, old_value: '{"status":"Pending"}', new_value: '{"status":"Reviewed"}', ip_address: '127.0.0.1', created_at: '2026-08-05T11:00:00Z' },
    { user_id: 1, user_name: 'admin@mop.rw', action: 'user.login', module: 'auth', record_id: 1, ip_address: '192.168.1.10', created_at: '2026-08-19T07:30:00Z' },
  ];
  auditEntries.forEach(r => db.insert('audit_logs', r));

  const notifEntries = [
    { user_id: 1, title: 'New Application Received', message: 'Josiane Nyirahabimana has submitted a membership application.', type: 'info', is_read: 0, link: '/applications', created_at: '2026-08-10T10:00:00Z' },
    { user_id: 1, title: 'Monthly Contributions Reminder', message: 'August contributions are due. 80% of members have not paid yet.', type: 'warning', is_read: 0, link: '/contributions', created_at: '2026-08-01T08:00:00Z' },
    { user_id: 1, title: 'Event Approaching', message: 'Tree Planting Campaign is scheduled for August 20, 2026.', type: 'info', is_read: 0, link: '/events', created_at: '2026-08-15T09:00:00Z' },
    { user_id: 1, title: 'Expense Pending Approval', message: 'Office supplies expense of 10,000 RWF needs approval.', type: 'warning', is_read: 0, link: '/finance', created_at: '2026-08-05T10:00:00Z' },
    { user_id: 1, title: 'New Application Received', message: 'Odette Nyirarukundo has submitted a membership application.', type: 'info', is_read: 1, link: '/applications', created_at: '2026-08-12T10:00:00Z' },
    { user_id: 1, title: 'Camp Registration Open', message: 'Scout Camp 2026 registration is now open. 12 members registered so far.', type: 'info', is_read: 1, link: '/events', created_at: '2026-07-01T08:00:00Z' },
    { user_id: 1, title: 'Donation Received', message: 'UNICEF donation of 100,000 RWF has been recorded.', type: 'success', is_read: 1, link: '/finance', created_at: '2026-05-12T14:00:00Z' },
    { user_id: 1, title: 'System Backup Complete', message: 'Monthly system backup completed successfully.', type: 'success', is_read: 1, link: null, created_at: '2026-08-01T02:00:00Z' },
  ];
  notifEntries.forEach(r => db.insert('notifications', r));

  const activityCategories = [
    { name: 'Community Service', slug: 'community-service', description: 'Community outreach and service projects', color: '#6B21A8', icon: 'Heart', is_active: 1 },
    { name: 'Training', slug: 'training', description: 'Skills development and training workshops', color: '#7C3AED', icon: 'BookOpen', is_active: 1 },
    { name: 'Environment', slug: 'environment', description: 'Environmental conservation activities', color: '#059669', icon: 'Tree', is_active: 1 },
    { name: 'Peace Building', slug: 'peace-building', description: 'Peace education and conflict resolution', color: '#2563EB', icon: 'Globe', is_active: 1 },
    { name: 'Camping', slug: 'camping', description: 'Outdoor camping and adventure activities', color: '#D97706', icon: 'Tent', is_active: 1 },
    { name: 'Celebration', slug: 'celebration', description: 'Cultural events and celebrations', color: '#DC2626', icon: 'Star', is_active: 1 },
  ];
  activityCategories.forEach(c => db.insert('activity_categories', c));

  const activities = [
    { title: 'Peace Building Workshop', slug: 'peace-building-workshop', description: 'A comprehensive workshop on peace building techniques and conflict resolution for youth leaders. Participants will learn practical skills for promoting peace in their communities.', short_description: 'Learn peace building techniques and conflict resolution skills.', cover_image: '/images/activities/activity1.jpeg', location: 'Camp Kigali', organizer: 'MOP Scout Group', category_id: 4, start_date: '2026-09-15', end_date: '2026-09-15', start_time: '09:00', end_time: '16:00', status: 'Published', is_featured: 1, registration_enabled: 1, registration_deadline: '2026-09-10', max_participants: 50, created_by: 1 },
    { title: 'Community Cleanup Drive', slug: 'community-cleanup-drive', description: 'Join us for a community cleanup exercise at Nyarugenge District. Together we can make our community cleaner and greener.', short_description: 'Help us clean and beautify our community.', cover_image: '/images/activities/activity2.jpeg', location: 'Nyarugenge District', organizer: 'MOP Scout Group', category_id: 1, start_date: '2026-10-01', end_date: '2026-10-01', start_time: '07:00', end_time: '12:00', status: 'Published', is_featured: 0, registration_enabled: 1, registration_deadline: '2026-09-28', max_participants: 100, created_by: 1 },
    { title: 'First Aid Training Program', slug: 'first-aid-training', description: 'Essential first aid training for all scout members. Learn CPR, wound care, and emergency response techniques.', short_description: 'Learn essential first aid and emergency response skills.', cover_image: '/images/activities/activity3.jpeg', location: 'Camp Kigali', organizer: 'Red Cross Rwanda', category_id: 2, start_date: '2026-10-15', end_date: '2026-10-16', start_time: '08:00', end_time: '17:00', status: 'Published', is_featured: 1, registration_enabled: 1, registration_deadline: '2026-10-10', max_participants: 40, created_by: 1 },
    { title: 'Tree Planting Campaign', slug: 'tree-planting-campaign', description: 'Environmental conservation through tree planting. Help us plant 500 trees across Nyarugenge hills.', short_description: 'Join our environmental conservation tree planting initiative.', cover_image: '/images/activities/activity4.jpeg', location: 'Nyarugenge Hills', organizer: 'MOP Scout Group', category_id: 3, start_date: '2026-11-05', end_date: '2026-11-05', start_time: '06:30', end_time: '13:00', status: 'Published', is_featured: 0, registration_enabled: 1, registration_deadline: '2026-11-01', max_participants: 80, created_by: 1 },
    { title: 'Annual Scout Camp', slug: 'annual-scout-camp', description: 'The annual Messengers of Peace Scout Camp featuring outdoor activities, leadership workshops, and team building exercises in the beautiful Nyungwe Forest.', short_description: 'Our flagship annual camping and adventure event.', cover_image: '/images/activities/activity1.jpeg', location: 'Nyungwe Forest', organizer: 'MOP Scout Group', category_id: 5, start_date: '2026-12-20', end_date: '2026-12-25', start_time: '08:00', end_time: '17:00', status: 'Draft', is_featured: 1, registration_enabled: 1, registration_deadline: '2026-12-15', max_participants: 60, created_by: 1 },
  ];
  activities.forEach(a => db.insert('activities', a));

  const galleryAlbums = [
    { title: 'Community Service 2026', slug: 'community-service-2026', description: 'Photos from our community service activities in 2026', cover_image: '/images/gallery/photo1.jpeg', status: 'Published', created_by: 1 },
    { title: 'Scout Camp 2026', slug: 'scout-camp-2026', description: 'Memories from the annual scout camp', cover_image: '/images/gallery/photo2.jpeg', status: 'Published', created_by: 1 },
    { title: 'Training Sessions', slug: 'training-sessions', description: 'Photos from various training workshops and sessions', cover_image: '/images/gallery/photo3.jpeg', status: 'Published', created_by: 1 },
    { title: 'Peace Day Celebration', slug: 'peace-day-celebration', description: 'International Peace Day celebration events', cover_image: '/images/gallery/photo4.jpeg', status: 'Draft', created_by: 1 },
  ];
  galleryAlbums.forEach(a => db.insert('gallery_albums', a));

  for (let i = 1; i <= 12; i++) {
    db.insert('gallery_images', { album_id: ((i - 1) % 4) + 1, media_id: i, title: 'Photo ' + i, caption: 'Gallery photo ' + i + ' from activity', sort_order: i, is_cover: i <= 4 ? 1 : 0 });
  }

  const libraryResources = [
    { title: 'Scout Leadership Handbook', slug: 'scout-leadership-handbook', description: 'Comprehensive guide for scout leaders covering leadership principles, outdoor skills, and community engagement strategies.', category: 'Guidelines', author: 'MOP Leadership Team', file_path: '/introduction/1-introduction-to-the-scout-movement.pdf', file_type: 'PDF', file_size: 2450000, tags: 'leadership,handbook,guide', download_count: 45, is_featured: 1, status: 'Published', created_by: 1 },
    { title: 'First Aid Manual', slug: 'first-aid-manual', description: 'Complete first aid reference manual for scouts. Covers emergency response, wound care, CPR, and medical basics.', category: 'Training', author: 'Red Cross Rwanda', file_path: '/introduction/2-introduction-to-scouting.pdf', file_type: 'PDF', file_size: 1800000, tags: 'first-aid,training,safety', download_count: 32, is_featured: 1, status: 'Published', created_by: 1 },
    { title: 'Environmental Conservation Guide', slug: 'environmental-conservation-guide', description: 'Guide to environmental conservation activities and projects for scout groups.', category: 'Training', author: 'MOP Environmental Team', file_path: '/introduction/3-scout-law-and-promise.pdf', file_type: 'PDF', file_size: 980000, tags: 'environment,conservation,guide', download_count: 18, is_featured: 0, status: 'Published', created_by: 1 },
    { title: 'Annual Report 2025', slug: 'annual-report-2025', description: 'Annual report of Messengers of Peace Scout Group for the year 2025, including activities, achievements, and financial summary.', category: 'Reports', author: 'MOP Secretary', file_path: '/introduction/4-scout-uniform.pdf', file_type: 'PDF', file_size: 3200000, tags: 'annual-report,2025,summary', download_count: 22, is_featured: 0, status: 'Published', created_by: 1 },
    { title: 'Youth Peace Education Curriculum', slug: 'youth-peace-education', description: 'Educational curriculum focused on peace education for youth. Includes lesson plans, activities, and assessment tools.', category: 'Publications', author: 'Peace Education Committee', file_path: '/introduction/5-scout-signs-and-salutes.pdf', file_type: 'PDF', file_size: 1500000, tags: 'peace,education,youth,curriculum', download_count: 28, is_featured: 1, status: 'Published', created_by: 1 },
  ];
  libraryResources.forEach(r => db.insert('library_resources', r));

  const heroSlides = [
    { title: 'Building Tomorrow\'s Leaders', subtitle: 'Messengers of Peace Scout Group', description: 'Empowering youth through peace, service, education, and leadership development in Rwanda.', background_image: '/images/image/1.jpeg', button_text: 'Join Us Today', button_link: '/join-us', sort_order: 1, is_active: 1 },
    { title: 'Serve Your Community', subtitle: 'Making a Difference Together', description: 'Join our community service initiatives and help build a better world for everyone.', background_image: '/images/image/2.jpeg', button_text: 'Our Activities', button_link: '/activities', sort_order: 2, is_active: 1 },
    { title: 'Peace Starts With You', subtitle: 'Messengers of Peace', description: 'Be a messenger of peace in your family, school, and community. Every action counts.', background_image: '/images/image/3.jpeg', button_text: 'Learn More', button_link: '/about', sort_order: 3, is_active: 1 },
    { title: 'Explore Our Library', subtitle: 'Knowledge is Power', description: 'Access our collection of educational resources, guides, and publications.', background_image: '/images/image/4.jpeg', button_text: 'Browse Library', button_link: '/portfolio', sort_order: 4, is_active: 1 },
    { title: 'Adventure Awaits', subtitle: 'Scout Camping & Outdoor Activities', description: 'Experience the beauty of Rwanda through our outdoor adventures and camping activities.', background_image: '/images/image/5.jpeg', button_text: 'View Gallery', button_link: '/gallery', sort_order: 5, is_active: 1 },
    { title: 'Get In Touch', subtitle: 'We Would Love to Hear From You', description: 'Have questions? Want to collaborate? Reach out to us and let\'s work together for peace.', background_image: '/images/image/6.jpeg', button_text: 'Contact Us', button_link: '/contact', sort_order: 6, is_active: 1 },
  ];
  heroSlides.forEach(s => db.insert('hero_slides', s));

  const homepageSections = [
    { title: 'Who We Are', content: 'Messengers of Peace Scout Group is a youth community organization dedicated to promoting peace, service, education, leadership, and positive change in Rwanda.', section_type: 'hero', image: '/images/logo-transparent.png', sort_order: 1, is_active: 1, settings: '{}' },
    { title: 'Our Impact', content: 'We have empowered over 200 young people through various programs and activities.', section_type: 'stats', image: null, sort_order: 2, is_active: 1, settings: JSON.stringify({ stats: [{ label: 'Members', value: '200+' }, { label: 'Activities', value: '50+' }, { label: 'Community Projects', value: '30+' }, { label: 'Years Active', value: '5+' }] }) },
    { title: 'Get Involved', content: 'Join us in making a difference. Whether as a member, volunteer, or partner, there are many ways to contribute.', section_type: 'cta', image: null, sort_order: 3, is_active: 1, settings: '{}' },
  ];
  homepageSections.forEach(s => db.insert('homepage_sections', s));

  const aboutSections = [
    { section_key: 'mission', title: 'Our Mission', content: 'To empower young people through peace education, community service, leadership development, and scouting activities, creating a generation of responsible citizens who contribute positively to their communities and the world.', image: '/images/logo-transparent.png', sort_order: 1, is_active: 1 },
    { section_key: 'vision', title: 'Our Vision', content: 'A world where young people are active agents of peace, driving positive change in their communities through service, education, and leadership.', image: '/images/image/1.jpeg', sort_order: 2, is_active: 1 },
    { section_key: 'objectives', title: 'Our Objectives', content: '1. Promote peace education and conflict resolution skills among youth.\n2. Develop leadership capabilities in young people.\n3. Engage youth in community service and environmental conservation.\n4. Provide educational resources and training opportunities.\n5. Build a supportive community of young peace messengers.', image: null, sort_order: 3, is_active: 1 },
    { section_key: 'history', title: 'Our History', content: 'Messengers of Peace Scout Group was established as part of the Rwanda Scout Association, operating from Camp Kigali in Nyarugenge District, Kigali. Since our founding, we have been committed to developing youth leadership and promoting peace through various scouting activities and community service projects.', image: '/images/image/2.jpeg', sort_order: 4, is_active: 1 },
    { section_key: 'values', title: 'Our Values', content: 'Peace - We promote understanding and harmony.\nService - We serve our community selflessly.\nEducation - We value learning and knowledge sharing.\nLeadership - We develop future leaders.\nIntegrity - We act with honesty and respect.\nInclusion - We welcome all young people regardless of background.', image: null, sort_order: 5, is_active: 1 },
  ];
  aboutSections.forEach(s => db.insert('about_content', s));

  const navItems = [
    { label: 'Home', url: '/', parent_id: null, sort_order: 1, is_active: 1, opens_new_tab: 0, icon: 'Home' },
    { label: 'About Us', url: '/about', parent_id: null, sort_order: 2, is_active: 1, opens_new_tab: 0, icon: 'Info' },
    { label: 'Activities', url: '/activities', parent_id: null, sort_order: 3, is_active: 1, opens_new_tab: 0, icon: 'Calendar' },
    { label: 'Library', url: '/portfolio', parent_id: null, sort_order: 4, is_active: 1, opens_new_tab: 0, icon: 'BookOpen' },
    { label: 'Information', url: '/information', parent_id: null, sort_order: 5, is_active: 1, opens_new_tab: 0, icon: 'FileText' },
    { label: 'Board Members', url: '/leadership', parent_id: null, sort_order: 6, is_active: 1, opens_new_tab: 0, icon: 'Users' },
    { label: 'Gallery', url: '/gallery', parent_id: null, sort_order: 7, is_active: 1, opens_new_tab: 0, icon: 'Image' },
    { label: 'Contact Us', url: '/contact', parent_id: null, sort_order: 8, is_active: 1, opens_new_tab: 0, icon: 'Mail' },
    { label: 'Join Us', url: '/join-us', parent_id: null, sort_order: 9, is_active: 1, opens_new_tab: 0, icon: 'UserPlus' },
  ];
  navItems.forEach(n => db.insert('navigation_items', n));

  const seoPages = [
    { page_slug: 'home', title: 'Messengers of Peace Scout Group - Building Youth Leaders', description: 'Official website of Messengers of Peace Scout Group. Empowering youth through peace, service, education, and leadership development in Rwanda.', keywords: 'scout,peace,youth,rwanda,leadership,service,messengers of peace', og_image: '/images/logo-transparent.png', canonical_url: 'https://mop.rw' },
    { page_slug: 'about', title: 'About Us - Messengers of Peace Scout Group', description: 'Learn about our mission, vision, objectives, and history. Messengers of Peace is dedicated to youth empowerment through scouting.', keywords: 'about,mission,vision,messengers of peace,scout,rwanda', og_image: '/images/image/1.jpeg', canonical_url: 'https://mop.rw/about' },
    { page_slug: 'activities', title: 'Our Activities - Messengers of Peace Scout Group', description: 'Explore our community service activities, training programs, peace building workshops, and environmental conservation projects.', keywords: 'activities,community service,training,peace building,environment', og_image: '/images/activities/activity1.jpeg', canonical_url: 'https://mop.rw/activities' },
    { page_slug: 'gallery', title: 'Photo Gallery - Messengers of Peace Scout Group', description: 'Browse photos from our activities, events, camping trips, and community service projects.', keywords: 'gallery,photos,activities,events,camping', og_image: '/images/gallery/photo1.jpeg', canonical_url: 'https://mop.rw/gallery' },
    { page_slug: 'contact', title: 'Contact Us - Messengers of Peace Scout Group', description: 'Get in touch with Messengers of Peace Scout Group. Visit us at Camp Kigali or send us a message.', keywords: 'contact,phone,email,address,camp kigali', og_image: '/images/logo-transparent.png', canonical_url: 'https://mop.rw/contact' },
  ];
  seoPages.forEach(s => db.insert('seo_settings', s));

  console.log('[InMemory] Database seeded with default data');
}

// ─── SQL Expression Evaluator ───
function evalExpr(expr, row, alias) {
  const trimmed = expr.trim();

  // CASE WHEN ... THEN ... ELSE ... END
  const caseMatch = trimmed.match(/^CASE\s+WHEN\s+(.+?)\s+THEN\s+(.+?)(?:\s+ELSE\s+(.+?))?\s+END$/i);
  if (caseMatch) {
    const [, cond, thenVal, elseVal] = caseMatch;
    const condResult = evalCondition(cond.trim(), row);
    return condResult ? evalValue(thenVal.trim(), row) : (elseVal ? evalValue(elseVal.trim(), row) : null);
  }

  // CONCAT(a, ' ', b)
  const concatMatch = trimmed.match(/^CONCAT\((.+)\)$/i);
  if (concatMatch) {
    const args = splitArgs(concatMatch[1]);
    return args.map(a => evalValue(a.trim(), row)).filter(v => v != null).join('');
  }

  // COUNT(*)
  if (/^COUNT\s*\(\s*\*\s*\)$/i.test(trimmed)) return 1;

  // COUNT(CASE WHEN ... THEN 1 END)
  const countCaseMatch = trimmed.match(/^COUNT\s*\(\s*CASE\s+WHEN\s+(.+?)\s+THEN\s+1(?:\s+ELSE\s+0)?\s+END\s*\)$/i);
  if (countCaseMatch) {
    return evalCondition(countCaseMatch[1].trim(), row) ? 1 : 0;
  }

  // COUNT(col)
  const countColMatch = trimmed.match(/^COUNT\s*\(\s*(\w+)\s*\)$/i);
  if (countColMatch) {
    return row[countColMatch[1]] != null ? 1 : 0;
  }

  // SUM(CASE WHEN ... THEN ... ELSE 0 END)
  const sumCaseMatch = trimmed.match(/^SUM\s*\(\s*CASE\s+WHEN\s+(.+?)\s+THEN\s+(.+?)(?:\s+ELSE\s+(.+?))?\s+END\s*\)$/i);
  if (sumCaseMatch) {
    const condResult = evalCondition(sumCaseMatch[1].trim(), row);
    return condResult ? evalValue(sumCaseMatch[2].trim(), row) : (sumCaseMatch[3] ? evalValue(sumCaseMatch[3].trim(), row) : 0);
  }

  // SUM(col)
  const sumColMatch = trimmed.match(/^SUM\s*\(\s*(\w+)\s*\)$/i);
  if (sumColMatch) {
    return parseFloat(row[sumColMatch[1]]) || 0;
  }

  // COALESCE(expr, default)
  const coalesceMatch = trimmed.match(/^COALESCE\((.+?)\s*,\s*(.+?)\)$/i);
  if (coalesceMatch) {
    const val = evalValue(coalesceMatch[1].trim(), row);
    return val != null && val !== '' ? val : evalValue(coalesceMatch[2].trim(), row);
  }

  // YEAR(CURDATE())
  if (/^YEAR\s*\(\s*CURDATE\s*\(\s*\)\s*\)$/i.test(trimmed)) return new Date().getFullYear();

  // YEAR(col)
  const yearColMatch = trimmed.match(/^YEAR\s*\(\s*(\w+)\s*\)$/i);
  if (yearColMatch) {
    const v = row[yearColMatch[1]];
    return v ? new Date(v).getFullYear() : null;
  }

  // DATE_FORMAT(col, fmt)
  const dfMatch = trimmed.match(/^DATE_FORMAT\s*\(\s*(\w+)\s*,\s*'([^']+)'\s*\)$/i);
  if (dfMatch) {
    const v = row[dfMatch[1]];
    if (!v) return null;
    const d = new Date(v);
    return dfMatch[2].replace('%Y', d.getFullYear()).replace('%m', String(d.getMonth() + 1).padStart(2, '0')).replace('%d', String(d.getDate()).padStart(2, '0'));
  }

  // 'string literal'
  const literalMatch = trimmed.match(/^'([^']*)'$/);
  if (literalMatch) return literalMatch[1];

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);

  // Column reference
  if (/^\w+$/.test(trimmed) && trimmed in row) return row[trimmed];

  // Column reference with table alias (a.col)
  const dotMatch = trimmed.match(/^\w+\.(\w+)$/);
  if (dotMatch && dotMatch[1] in row) return row[dotMatch[1]];

  // Unknown column reference — return null instead of literal string
  if (/^\w+\.\w+$/.test(trimmed) || /^\w+$/.test(trimmed)) return null;
}

function evalValue(val, row) {
  return evalExpr(val, row);
}

function evalCondition(cond, row) {
  // AND conditions
  const andParts = splitTopLevel(cond, /\s+AND\s+/i);
  if (andParts.length > 1) return andParts.every(p => evalCondition(p.trim(), row));

  // OR conditions
  const orParts = splitTopLevel(cond, /\s+OR\s+/i);
  if (orParts.length > 1) return orParts.some(p => evalCondition(p.trim(), row));

  // col = value
  const eqMatch = cond.match(/^(.+?)\s*=\s*(.+)$/);
  if (eqMatch) {
    const l = evalValue(eqMatch[1].trim(), row);
    const r = evalValue(eqMatch[2].trim(), row);
    return l == r;
  }

  // col != value or col <> value
  const neqMatch = cond.match(/^(.+?)\s*(!=|<>)\s*(.+)$/);
  if (neqMatch) {
    const l = evalValue(neqMatch[1].trim(), row);
    const r = evalValue(neqMatch[2].trim(), row);
    return l != r;
  }

  // col > value
  const gtMatch = cond.match(/^(.+?)\s*>\s*(.+)$/);
  if (gtMatch) {
    return evalValue(gtMatch[1].trim(), row) > evalValue(gtMatch[2].trim(), row);
  }

  // col < value
  const ltMatch = cond.match(/^(.+?)\s*<\s*(.+)$/);
  if (ltMatch) {
    return evalValue(ltMatch[1].trim(), row) < evalValue(ltMatch[2].trim(), row);
  }

  // col >= value
  const gteMatch = cond.match(/^(.+?)\s*>=\s*(.+)$/);
  if (gteMatch) {
    return evalValue(gteMatch[1].trim(), row) >= evalValue(gteMatch[2].trim(), row);
  }

  // col <= value
  const lteMatch = cond.match(/^(.+?)\s*<=\s*(.+)$/);
  if (lteMatch) {
    return evalValue(lteMatch[1].trim(), row) <= evalValue(lteMatch[2].trim(), row);
  }

  // col LIKE pattern
  const likeMatch = cond.match(/^(.+?)\s+LIKE\s+(.+)$/i);
  if (likeMatch) {
    const l = String(evalValue(likeMatch[1].trim(), row) || '');
    let r = String(evalValue(likeMatch[2].trim(), row) || '');
    r = r.replace(/%/g, '.*');
    return new RegExp('^' + r + '$', 'i').test(l);
  }

  // IS NULL
  const isNullMatch = cond.match(/^(.+?)\s+IS\s+NULL$/i);
  if (isNullMatch) {
    return evalValue(isNullMatch[1].trim(), row) == null;
  }

  // IS NOT NULL
  const isNotNullMatch = cond.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    return evalValue(isNotNullMatch[1].trim(), row) != null;
  }

  // col IN (...)
  const inMatch = cond.match(/^(.+?)\s+IN\s*\((.+)\)$/i);
  if (inMatch) {
    const l = evalValue(inMatch[1].trim(), row);
    const vals = splitArgs(inMatch[2]).map(v => evalValue(v.trim(), row));
    return vals.includes(l);
  }

  return false;
}

function splitArgs(str) {
  const args = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inString) {
      current += c;
      if (c === stringChar && str[i - 1] !== '\\') inString = false;
    } else if (c === "'" || c === '"') {
      inString = true;
      stringChar = c;
      current += c;
    } else if (c === '(') { depth++; current += c; }
    else if (c === ')') { depth--; current += c; }
    else if (c === ',' && depth === 0) { args.push(current); current = ''; }
    else { current += c; }
  }
  if (current.trim()) args.push(current);
  return args;
}

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let current = '';
  const sepStr = sep.source || sep;
  const regex = new RegExp(sepStr, 'gi');
  let lastIdx = 0;
  let m;

  // Manual split respecting parens and strings
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inString) {
      if (c === stringChar && str[i - 1] !== '\\') inString = false;
    } else if (c === "'" || c === '"') {
      inString = true; stringChar = c;
    } else if (c === '(') depth++;
    else if (c === ')') depth--;
  }
  // Simple approach: split on the separator regex
  return str.split(/\s+AND\s+/i).length > 1 ? str.split(/\s+AND\s+/i) : str.split(/\s+OR\s+/i).length > 1 ? str.split(/\s+OR\s+/i) : [str];
}

// ─── Wildcard Expansion ───
function expandSelectColumns(selectExpr, flatRow, aliasMap) {
  const parts = splitArgs(selectExpr);
  const expanded = [];

  for (const part of parts) {
    const trimmed = part.trim();
    const asMatch = trimmed.match(/^(.+?)\s+AS\s+(\w+)$/i);
    const expr = asMatch ? asMatch[1].trim() : trimmed;
    const alias = asMatch ? asMatch[2] : null;

    // Check for wildcard: table.* or alias.*
    const wildMatch = expr.match(/^(\w+)\.\*$/);
    if (wildMatch) {
      const tblAlias = wildMatch[1];
      const realTable = aliasMap[tblAlias] || tblAlias;
      const cols = Object.keys(flatRow).filter(k => {
        if (k.startsWith(tblAlias + '.')) return true;
        if (realTable !== tblAlias && k.startsWith(realTable + '.')) return true;
        return false;
      });
      if (cols.length === 0) {
        // Try all non-prefixed keys as well
        Object.keys(flatRow).forEach(k => {
          if (!k.includes('.')) expanded.push({ expr: k, alias: null, key: k });
        });
      } else {
        for (const col of cols) {
          const shortCol = col.split('.').pop();
          expanded.push({ expr: col, alias: null, key: shortCol });
        }
      }
      continue;
    }

    const key = alias || extractColumnName(expr);
    expanded.push({ expr, alias, key });
  }

  return expanded;
}

function projectRow(flatRow, columns) {
  const out = {};
  for (const col of columns) {
    let val;
    if (col.key === 'count') val = 1;
    else val = evalExpr(col.expr, flatRow);
    out[col.key] = val;
  }
  return out;
}

// ─── Generic JOIN + WHERE + ORDER + LIMIT handler ───
function handleGenericJoin(sql, params) {
  const flatRows = resolveJoinRows(sql, params);
  let filtered = flatRows;

  // WHERE
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    if (whereClause !== '1=1') {
      const where = parseWhereClause(whereClause, params);
      filtered = filtered.filter(row => matchWhereAdvanced(row, where, params));
    }
  }

  // ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
  if (orderMatch) {
    const orderParts = orderMatch[1].split(',').map(p => p.trim());
    filtered.sort((a, b) => {
      for (const part of orderParts) {
        const pieces = part.split(/\s+/);
        const rawCol = pieces[0];
        const dir = (pieces[1] || 'ASC').toUpperCase();
        const col = rawCol.replace(/^\w+\./, '');
        const aVal = a[col] != null ? a[col] : a[rawCol] != null ? a[rawCol] : '';
        const bVal = b[col] != null ? b[col] : b[rawCol] != null ? b[rawCol] : '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  // LIMIT / OFFSET
  const limitMatch = sql.match(/LIMIT\s+(\?|\d+)(?:\s+OFFSET\s+(\?|\d+))?/i);
  if (limitMatch) {
    const limit = limitMatch[1] === '?' ? parseInt(params[0] || 50) : parseInt(limitMatch[1]);
    const offset = limitMatch[2] ? (limitMatch[2] === '?' ? parseInt(params[1] || 0) : parseInt(limitMatch[2])) : 0;
    filtered = filtered.slice(offset, offset + limit);
  }

  // SELECT column projection (expand wildcards and aliased expressions)
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+/i);
  if (selectMatch) {
    const selectExpr = selectMatch[1];
    const fromMatch = sql.match(/FROM\s+(\w+)\s+(\w+)/i);
    const aliasMap = {};
    if (fromMatch) aliasMap[fromMatch[2]] = fromMatch[1];
    const joinAliases = sql.match(/(?:LEFT|INNER)\s+JOIN\s+(\w+)\s+(\w+)/gi) || [];
    for (const ja of joinAliases) {
      const m = ja.match(/(?:LEFT|INNER)\s+JOIN\s+(\w+)\s+(\w+)/i);
      if (m) aliasMap[m[2]] = m[1];
    }

    // Always project if there are wildcards or aliases
    const hasWildcard = /\.\*/.test(selectExpr);
    const hasAlias = /\s+AS\s+/i.test(selectExpr);
    if (hasWildcard || hasAlias) {
      const columns = expandSelectColumns(selectExpr, filtered[0] || {}, aliasMap);
      filtered = filtered.map(row => projectRow(row, columns));
    }
  }

  return [filtered, []];
}

// ─── Main Query Parser ───
function parseSimpleQuery(sql, params = []) {
  const normalized = sql.replace(/\s+/g, ' ').trim();

  // ON DUPLICATE KEY UPDATE (INSERT ... ON DUPLICATE KEY UPDATE)
  if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(normalized)) {
    return handleInsertOnDuplicate(normalized, params);
  }

  // SELECT
  if (/^\s*SELECT/i.test(normalized)) {
    if (/GROUP\s+BY/i.test(normalized)) return handleGroupByQuery(normalized, params);
    if (/JOIN/i.test(normalized)) return handleJoinQuery(normalized, params);
    if (/\bCOUNT\s*\(|\bSUM\s*\(|\bCOALESCE\s*\(/i.test(normalized)) return handleAggregateQuery(normalized, params);
    return handleSimpleSelect(normalized, params);
  }

  // INSERT
  if (/^\s*INSERT/i.test(normalized)) return handleInsert(normalized, params);

  // UPDATE
  if (/^\s*UPDATE/i.test(normalized)) return handleUpdate(normalized, params);

  // DELETE
  if (/^\s*DELETE/i.test(normalized)) return handleDelete(normalized, params);

  return [[], []];
}

function handleSimpleSelect(sql, params) {
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+AS\s+\w+)?/i);
  if (!selectMatch) return [[], []];

  const tableName = selectMatch[2];
  const rows = [...(db.tables[tableName] || [])];

  // WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
  let filtered = rows;
  if (whereMatch) {
    const where = parseWhereClause(whereMatch[1], params);
    filtered = rows.filter(row => matchWhereAdvanced(row, where, params));
  }

  // ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
  if (orderMatch) {
    const orderParts = orderMatch[1].split(',').map(p => p.trim());
    filtered.sort((a, b) => {
      for (const part of orderParts) {
        const [col, dir] = part.split(/\s+/);
        const aVal = a[col] || '';
        const bVal = b[col] || '';
        const cmp = String(aVal).localeCompare(String(bVal));
        if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  // LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\?|\d+)(?:\s+OFFSET\s+(\?|\d+))?/i);
  if (limitMatch) {
    const limit = limitMatch[1] === '?' ? parseInt(params[parseInt(limitMatch[1])] || 20) : parseInt(limitMatch[1]);
    const offset = limitMatch[2] ? (limitMatch[2] === '?' ? parseInt(params[parseInt(limitMatch[2])] || 0) : parseInt(limitMatch[2])) : 0;
    filtered = filtered.slice(offset, offset + limit);
  }

  return [filtered, []];
}

function resolveJoinRows(sql, params) {
  const lower = sql.toLowerCase();

  // Parse FROM and JOINs to get all tables
  const fromMatch = sql.match(/FROM\s+(\w+)(?:\s+(\w+))?\s/i);
  if (!fromMatch) return [];
  const mainTable = fromMatch[1];
  const mainAlias = fromMatch[2] || mainTable;
  const mainRows = [...(db.tables[mainTable] || [])];

  // Find all LEFT/INNER JOINs
  const joinRegex = /(?:LEFT|INNER)\s+JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
  const joins = [];
  let jm;
  while ((jm = joinRegex.exec(sql)) !== null) {
    joins.push({
      table: jm[1], alias: jm[2] || jm[1],
      leftAlias: jm[3], leftCol: jm[4], rightAlias: jm[5], rightCol: jm[6]
    });
  }

  // Flatten main rows with alias prefix
  let flatRows = mainRows.map(r => {
    const out = {};
    Object.entries(r).forEach(([k, v]) => {
      out[mainAlias + '.' + k] = v;
      out[k] = v;
    });
    return out;
  });

  // Apply JOINs
  // ON leftAlias.leftCol = rightAlias.rightCol
  // Determine which side references the main table to get the lookup value
  for (const j of joins) {
    const joinTable = db.tables[j.table] || [];
    const newFlat = [];
    for (const row of flatRows) {
      let mainVal, matchCol;
      if (j.leftAlias === mainAlias) {
        mainVal = row[j.leftAlias + '.' + j.leftCol] != undefined ? row[j.leftAlias + '.' + j.leftCol] : row[j.leftCol];
        matchCol = j.rightCol;
      } else {
        mainVal = row[j.rightAlias + '.' + j.rightCol] != undefined ? row[j.rightAlias + '.' + j.rightCol] : row[j.rightCol];
        matchCol = j.leftCol;
      }
      const matches = joinTable.filter(r => r[matchCol] == mainVal);
      if (matches.length === 0) {
        const out = { ...row };
        Object.keys(joinTable[0] || {}).forEach(k => {
          out[j.alias + '.' + k] = null;
          if (out[k] === undefined) out[k] = null;
        });
        newFlat.push(out);
      } else {
        for (const m of matches) {
          const out = { ...row };
          Object.entries(m).forEach(([k, v]) => {
            out[j.alias + '.' + k] = v;
            if (out[k] === undefined || (typeof out[k] === 'object' && out[k] === null)) out[k] = v;
          });
          newFlat.push(out);
        }
      }
    }
    flatRows = newFlat;
  }

  return flatRows;
}

function handleGroupByQuery(sql, params) {
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+(\w+))?\s/i);
  if (!selectMatch) return [[], []];

  const tableName = selectMatch[2];
  const alias = selectMatch[3] || tableName;
  const selectExpr = selectMatch[1];
  const lower = sql.toLowerCase();

  // If query has JOINs, resolve them first
  let rows;
  if (/JOIN/i.test(sql)) {
    rows = resolveJoinRows(sql, params);
  } else {
    rows = [...(db.tables[tableName] || [])];
  }

  // WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    if (whereClause !== '1=1') {
      const where = parseWhereClause(whereClause, params);
      rows = rows.filter(row => matchWhereAdvanced(row, where, params));
    }
  }

  // GROUP BY
  const groupMatch = sql.match(/GROUP\s+BY\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
  if (!groupMatch) return [rows, []];

  const groupCols = groupMatch[1].split(',').map(c => c.trim().replace(/^\w+\./, ''));

  // Build alias map from FROM and JOIN clauses
  const aliasMap = {};
  const fromClause = sql.match(/FROM\s+(\w+)\s+(\w+)/i);
  if (fromClause) aliasMap[fromClause[2]] = fromClause[1];
  const joinClauses = sql.match(/(?:LEFT|INNER)\s+JOIN\s+(\w+)\s+(\w+)/gi) || [];
  for (const jc of joinClauses) {
    const jm = jc.match(/(?:LEFT|INNER)\s+JOIN\s+(\w+)\s+(\w+)/i);
    if (jm) aliasMap[jm[2]] = jm[1];
  }

  // Expand wildcards in selectExpr before splitting
  let expandedSelectExpr = selectExpr;
  if (/\.\*/.test(selectExpr)) {
    const firstRow = rows[0] || {};
    const expandedParts = [];
    const rawParts = splitArgs(selectExpr);
    for (const part of rawParts) {
      const trimmed = part.trim();
      const wildMatch = trimmed.match(/^(\w+)\.\*$/i);
      if (wildMatch) {
        const tblAlias = wildMatch[1];
        const tableCols = Object.keys(firstRow).filter(k => k.startsWith(tblAlias + '.'));
        if (tableCols.length > 0) {
          for (const tc of tableCols) {
            expandedParts.push(tc);
          }
        } else {
          // Fallback: include all non-alias columns
          Object.keys(firstRow).forEach(k => {
            if (!k.includes('.')) expandedParts.push(k);
          });
        }
      } else {
        expandedParts.push(trimmed);
      }
    }
    expandedSelectExpr = expandedParts.join(', ');
  }

  // Split select expressions
  const selectParts = splitArgs(expandedSelectExpr);

  // Group rows
  const groups = {};
  rows.forEach(row => {
    const key = groupCols.map(c => row[c] !== undefined ? row[c] : '').join('|||');
    if (!groups[key]) groups[key] = { _rows: [], _first: row };
    groups[key]._rows.push(row);
  });

  // Aggregate
  const result = Object.values(groups).map(group => {
    const out = {};
    groupCols.forEach(c => { out[c] = group._first[c]; });

    selectParts.forEach(expr => {
      const trimmed = expr.trim();
      const aliasMatch = trimmed.match(/^(.+?)\s+AS\s+(\w+)$/i);
      const exprStr = aliasMatch ? aliasMatch[1].trim() : trimmed;
      const aliasName = aliasMatch ? aliasMatch[2] : null;

      const val = evalAggregateExpr(exprStr, group._rows);
      const outKey = aliasName || extractColumnName(exprStr);
      out[outKey] = val;
    });

    return out;
  });

  // ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
  if (orderMatch) {
    const orderParts = orderMatch[1].split(',').map(p => p.trim());
    result.sort((a, b) => {
      for (const part of orderParts) {
        const [rawCol, dir] = part.split(/\s+/);
        const col = rawCol.replace(/^\w+\./, '');
        const aVal = a[col] || '';
        const bVal = b[col] || '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        if (cmp !== 0) return (dir || 'ASC').toUpperCase() === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  // LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\?|\d+)/i);
  if (limitMatch) {
    const limit = limitMatch[1] === '?' ? parseInt(params[0] || 20) : parseInt(limitMatch[1]);
    return [result.slice(0, limit), []];
  }

  return [result, []];
}

function evalAggregateExpr(expr, rows) {
  const trimmed = expr.trim();

  // COUNT(*)
  if (/^COUNT\s*\(\s*\*\s*\)$/i.test(trimmed)) return rows.length;

  // COUNT(CASE WHEN ... THEN 1 ELSE 0 END) or COUNT(CASE WHEN ... THEN 1 END)
  const countCaseMatch = trimmed.match(/^COUNT\s*\(\s*CASE\s+WHEN\s+(.+?)\s+THEN\s+1(?:\s+ELSE\s+0)?\s+END\s*\)$/i);
  if (countCaseMatch) {
    return rows.filter(r => evalCondition(countCaseMatch[1].trim(), r)).length;
  }

  // COUNT(col) or COUNT(alias.col)
  const countColMatch = trimmed.match(/^COUNT\s*\(\s*(\w+(?:\.\w+)?)\s*\)$/i);
  if (countColMatch) {
    const colRef = countColMatch[1];
    const shortCol = colRef.includes('.') ? colRef.split('.').pop() : colRef;
    return rows.filter(r => (r[colRef] != null && r[colRef] !== 'COUNT(' + colRef + ')') || (r[shortCol] != null)).length;
  }

  // SUM(CASE WHEN ... THEN ... ELSE 0 END)
  const sumCaseMatch = trimmed.match(/^SUM\s*\(\s*CASE\s+WHEN\s+(.+?)\s+THEN\s+(.+?)(?:\s+ELSE\s+(.+?))?\s+END\s*\)$/i);
  if (sumCaseMatch) {
    return rows.filter(r => evalCondition(sumCaseMatch[1].trim(), r)).reduce((s, r) => s + (parseFloat(evalValue(sumCaseMatch[2].trim(), r)) || 0), 0);
  }

  // SUM(col)
  const sumColMatch = trimmed.match(/^SUM\s*\(\s*(\w+)\s*\)$/i);
  if (sumColMatch) {
    return rows.reduce((s, r) => s + (parseFloat(r[sumColMatch[1]]) || 0), 0);
  }

  // CONCAT(a, ' ', b)
  const concatMatch = trimmed.match(/^CONCAT\((.+)\)$/i);
  if (concatMatch) {
    const args = splitArgs(concatMatch[1]);
    return args.map(a => {
      const v = evalExpr(a.trim(), rows[0]);
      return (v != null && typeof v === 'string' && !v.match(/^\w+\.\w+$/)) ? v : '';
    }).join('');
  }

  // COUNT(*) as count (alias detection)
  const countStar = trimmed.match(/^COUNT\s*\(\s*\*\s*\)/i);
  if (countStar) return rows.length;

  // Simple column reference - return value from first row (try alias.col first, then col)
  const colName = trimmed.replace(/^\w+\./, '');
  const aliasDotCol = trimmed.includes('.') ? trimmed : null;
  if (rows[0]) {
    if (aliasDotCol && aliasDotCol in rows[0]) return rows[0][aliasDotCol];
    if (colName in rows[0] && rows[0][colName] !== 'COUNT(' + colName + ')' && rows[0][colName] !== 'un.name') return rows[0][colName];
  }

  // 'string literal'
  const litMatch = trimmed.match(/^'([^']*)'$/);
  if (litMatch) return litMatch[1];

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);

  // CASE WHEN
  if (/^CASE\s+/i.test(trimmed)) return evalExpr(trimmed, rows[0]);

  return trimmed;
}

function extractColumnName(expr) {
  const asMatch = expr.match(/AS\s+(\w+)$/i);
  if (asMatch) return asMatch[1];
  const countMatch = expr.match(/COUNT\s*\(\s*(?:\*|(\w+))\s*\)/i);
  if (countMatch) return countMatch[1] || 'count';
  const sumMatch = expr.match(/SUM\s*\(\s*(\w+)\s*\)/i);
  if (sumMatch) return 'total_' + sumMatch[1];
  const clean = expr.replace(/^\w+\./, '').replace(/[^a-zA-Z0-9_]/g, '_');
  return clean;
}

function handleInsert(sql, params) {
  const match = sql.match(/INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES/i);
  if (!match) return [[], []];
  const tableName = match[1];
  const cols = match[2].split(',').map(c => c.trim().replace(/^\w+\./, ''));
  const row = {};
  cols.forEach((col, i) => { row[col] = params[i] !== undefined ? params[i] : null; });
  const result = db.insert(tableName, row);
  return [[result], []];
}

function handleInsertOnDuplicate(sql, params) {
  const match = sql.match(/INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)\s*ON\s+DUPLICATE\s+KEY\s+UPDATE\s+(.+)/i);
  if (!match) return handleInsert(sql, params);

  const tableName = match[1];
  const cols = match[2].split(',').map(c => c.trim().replace(/^\w+\./, ''));
  const row = {};
  let paramIdx = 0;
  cols.forEach((col) => { row[col] = params[paramIdx] !== undefined ? params[paramIdx] : null; paramIdx++; });

  // Check if row already exists (by setting_key for settings table)
  if (tableName === 'settings' && row.setting_key) {
    const existing = (db.tables.settings || []).find(s => s.setting_key === row.setting_key);
    if (existing) {
      existing.setting_value = row.setting_value;
      existing.updated_by = row.updated_by || existing.updated_by;
      return [[{ affectedRows: 2 }], []]; // MySQL returns 2 for ON DUPLICATE KEY UPDATE
    }
  }

  const result = db.insert(tableName, row);
  return [[result], []];
}

function handleUpdate(sql, params) {
  const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
  if (!match) return [[], []];

  const tableName = match[1];
  const setPairs = {};
  let paramIdx = 0;

  // Parse SET clause - handle NOW() and ? placeholders
  const setParts = match[2].split(',');
  setParts.forEach(part => {
    const kvMatch = part.trim().match(/(\w+)\s*=\s*(.+)/);
    if (kvMatch) {
      const [, col, valExpr] = kvMatch;
      const trimmedVal = valExpr.trim();
      if (/^NOW\(\)$/i.test(trimmedVal)) {
        setPairs[col] = new Date().toISOString();
      } else if (trimmedVal === '?') {
        setPairs[col] = params[paramIdx++];
      } else {
        setPairs[col] = trimmedVal.replace(/^['']|['']$/g, '');
      }
    }
  });

  // Parse WHERE clause
  const remainingParams = params.slice(paramIdx);
  const where = parseWhereClause(match[3], remainingParams);

  const result = db.update(tableName, setPairs, where);
  return [[result], []];
}

function handleDelete(sql, params) {
  const match = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
  if (!match) return [[], []];
  const where = parseWhereClause(match[2], params);
  const result = db.delete(match[1], where);
  return [[result], []];
}

function parseWhereClause(clause, params = []) {
  const conditions = [];
  let paramIdx = 0;
  let current = '';

  // Split on AND, respecting parens and strings
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < clause.length; i++) {
    const c = clause[i];
    if (inString) {
      current += c;
      if (c === stringChar && clause[i - 1] !== '\\') inString = false;
    } else if (c === "'" || c === '"') {
      inString = true; stringChar = c; current += c;
    } else if (c === '(') { depth++; current += c; }
    else if (c === ')') { depth--; current += c; }
    else if (/a/i.test(c) && clause.substring(i, i + 4).toUpperCase() === ' AND' && depth === 0) {
      conditions.push(current.trim());
      current = '';
      i += 3;
    } else {
      current += c;
    }
  }
  if (current.trim()) conditions.push(current.trim());

  const result = {};
  conditions.forEach(cond => {
    const trimmed = cond.trim();
    if (trimmed === '1=1') return;

    // col = ? (parameterized)
    let m = trimmed.match(/^(?:\w+\.)?(\w+)\s*=\s*\?$/);
    if (m) { result[m[1]] = params[paramIdx++]; return; }

    // col = 'literal'
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*=\s*'([^']*)'$/);
    if (m) { result[m[1]] = m[2]; return; }

    // col LIKE ?
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s+LIKE\s*\?$/i);
    if (m) { result[m[1] + '_like'] = params[paramIdx++]; return; }

    // col LIKE 'pattern'
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s+LIKE\s*'([^']*)'$/i);
    if (m) { result[m[1] + '_like'] = m[2]; return; }

    // col >= NOW()
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*>=\s*NOW\(\)/i);
    if (m) { result[m[1] + '_op'] = '>='; result[m[1] + '_value'] = new Date().toISOString(); return; }

    // col >= ?
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*>=\s*\?$/);
    if (m) { result[m[1] + '_op'] = '>='; result[m[1] + '_value'] = params[paramIdx++]; return; }

    // col <= ?
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*<=\s*\?$/);
    if (m) { result[m[1] + '_op'] = '<='; result[m[1] + '_value'] = params[paramIdx++]; return; }

    // col > ?
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*>\s*\?$/);
    if (m) { result[m[1] + '_op'] = '>'; result[m[1] + '_value'] = params[paramIdx++]; return; }

    // col < ?
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*<\s*\?$/);
    if (m) { result[m[1] + '_op'] = '<'; result[m[1] + '_value'] = params[paramIdx++]; return; }

    // col IS NULL
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s+IS\s+NULL$/i);
    if (m) { result[m[1] + '_null'] = true; return; }

    // col IS NOT NULL
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s+IS\s+NOT\s+NULL$/i);
    if (m) { result[m[1] + '_notnull'] = true; return; }

    // col != ?
    m = trimmed.match(/^(?:\w+\.)?(\w+)\s*!=\s*\?$/);
    if (m) { result[m[1] + '_neq'] = params[paramIdx++]; return; }
  });

  return result;
}

function matchWhereAdvanced(row, where, params = []) {
  return Object.entries(where).every(([key, val]) => {
    if (key.endsWith('_op')) return true;
    if (key.endsWith('_value')) return true;
    if (key.endsWith('_like')) {
      const pattern = val.replace(/%/g, '.*');
      return new RegExp('^' + pattern + '$', 'i').test(String(row[key.replace('_like', '')] || ''));
    }
    if (key.endsWith('_null')) return row[key.replace('_null', '')] == null;
    if (key.endsWith('_notnull')) return row[key.replace('_notnull', '')] != null;
    if (key.endsWith('_neq')) return row[key.replace('_neq', '')] != val;
    const opKey = key + '_op';
    const valKey = key + '_value';
    if (where[opKey]) {
      const op = where[opKey];
      const compareVal = where[valKey];
      if (op === '>=') return row[key] >= compareVal;
      if (op === '<=') return row[key] <= compareVal;
      if (op === '>') return row[key] > compareVal;
      if (op === '<') return row[key] < compareVal;
    }
    return row[key] == val;
  });
}

// Keep backward compat alias
const matchWhere = matchWhereAdvanced;

// ─── Specialized Handler for JOIN queries ───
function handleJoinQuery(sql, params) {
  const lower = sql.toLowerCase();

  // Auth: SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r
  if (lower.includes('from users') && lower.includes('join roles')) {
    const whereMatch = sql.match(/WHERE\s+u\.email\s*=\s*\?/i);
    const email = whereMatch ? params[0] : null;
    const users = db.select('users', email ? { email } : {});
    const result = users.map(u => {
      const role = db.findById('roles', u.role_id);
      return { ...u, role_name: role ? role.name : 'member' };
    }).filter(u => u.is_active == 1);
    return [result, []];
  }

  // Auth: SELECT u.id, u.email, u.is_active, r.name as role_name
  if (lower.includes('from users u') && lower.includes('role_name') && lower.includes('where u.id')) {
    const userId = params[0];
    const user = db.findById('users', userId);
    if (!user) return [[], []];
    const role = db.findById('roles', user.role_id);
    return [[{ id: user.id, email: user.email, is_active: user.is_active, role_name: role ? role.name : 'member', role_id: user.role_id }], []];
  }

  // Permissions query
  if (lower.includes('from permissions p') && lower.includes('role_permissions')) {
    const roleId = params[0];
    const rp = db.select('role_permissions', { role_id: roleId });
    const result = rp.map(r => { const perm = db.findById('permissions', r.permission_id); return perm ? { name: perm.name } : null; }).filter(Boolean);
    return [result, []];
  }

  // Members query with unit name and leadership (single member by user_id)
  if (lower.includes('from members m') && lower.includes('units u') && lower.includes('leadership') && lower.includes('m.user_id')) {
    const userId = params[0];
    const members = db.select('members', { user_id: userId });
    const result = members.map(m => {
      const unit = m.unit_id ? db.findById('units', m.unit_id) : null;
      const la = (db.tables.leadership_assignments || []).find(l => l.member_id == m.id && l.is_active == 1);
      return { ...m, unit_name: unit ? unit.name : null, leadership_position: la ? la.position : null };
    });
    return [result, []];
  }

  // Applications with CONCAT for reviewed_by_name
  if (lower.includes('from applications') && lower.includes('concat')) {
    let apps = [...(db.tables.applications || [])];
    // WHERE 1=1
    if (lower.includes("'pending'")) apps = apps.filter(a => a.status === 'Pending');
    const result = apps.map(a => ({
      ...a,
      reviewed_by_name: a.reviewed_by ? (() => { const m = db.findById('members', a.reviewed_by); return m ? m.first_name + ' ' + m.last_name : null; })() : null
    }));
    result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return [result, []];
  }

  // Reports: Membership - units with member counts via JOIN
  if (lower.includes('from units u') && lower.includes('members m') && lower.includes('group by')) {
    const units = (db.tables.units || []).filter(u => u.is_active == 1 || u.is_active == '1');
    const members = db.tables.members || [];
    const result = units.map(u => ({
      id: u.id,
      unit_name: u.name,
      active_count: members.filter(m => m.unit_id == u.id && m.status === 'Active').length,
      total_count: members.filter(m => m.unit_id == u.id).length,
    }));
    result.sort((a, b) => (a.unit_name || '').localeCompare(b.unit_name || ''));
    return [result, []];
  }

  // Reports: Attendance with unit name
  if (lower.includes('from attendance a') && lower.includes('units u') && lower.includes('group by')) {
    const records = db.tables.attendance || [];
    const groups = {};
    records.forEach(a => {
      const unit = a.unit_id ? db.findById('units', a.unit_id) : null;
      const key = `${unit ? unit.name : 'Unknown'}|${a.meeting_date || ''}|${a.status || ''}`;
      if (!groups[key]) groups[key] = { unit_name: unit ? unit.name : 'Unknown', meeting_date: a.meeting_date, status: a.status, count: 0 };
      groups[key].count++;
    });
    const result = Object.values(groups);
    result.sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));
    return [result, []];
  }

  // Reports: Top attendees - members with attendance via JOIN
  if (lower.includes('from members m') && lower.includes('attendance a') && lower.includes('group by m.id') && lower.includes('sessions_present')) {
    const members = (db.tables.members || []).filter(m => m.status === 'Active');
    const attendance = db.tables.attendance || [];
    const result = members.map(m => {
      const memberAtt = attendance.filter(a => a.member_id == m.id);
      const unit = m.unit_id ? db.findById('units', m.unit_id) : null;
      return {
        name: m.first_name + ' ' + m.last_name,
        unit_name: unit ? unit.name : null,
        sessions_present: memberAtt.filter(a => a.status === 'Present').length,
        total_sessions: memberAtt.length,
      };
    }).filter(r => r.total_sessions > 0).sort((a, b) => b.sessions_present - a.sessions_present).slice(0, 10);
    return [result, []];
  }

  // Reports: Events participation
  if (lower.includes('from events e') && lower.includes('event_participants') && lower.includes('group by')) {
    const events = (db.tables.events || []).filter(e => e.status === 'Published');
    const participants = db.tables.event_participants || [];
    const result = events.map(e => ({
      title: e.title,
      start_date: e.start_date,
      registered: participants.filter(p => p.event_id == e.id).length,
    })).sort((a, b) => b.registered - a.registered).slice(0, 10);
    return [result, []];
  }

  // Unit leader - members in unit
  if (lower.includes('from members m') && lower.includes('unit_members um')) {
    const unitId = params[0];
    const unitMembers = db.select('unit_members', { unit_id: unitId });
    const result = unitMembers.filter(um => um.is_active == 1).map(um => {
      const member = db.findById('members', um.member_id);
      return member && member.status === 'Active' ? { id: member.id, member_code: member.member_code, first_name: member.first_name, last_name: member.last_name, photo: member.photo, status: member.status } : null;
    }).filter(Boolean);
    return [result, []];
  }

  // Recent members (dashboard - simple query without JOINs)
  if (lower.includes('from members') && !lower.includes('join') && (lower.includes('join_date desc') || lower.includes('order by') && lower.includes('desc'))) {
    const members = (db.tables.members || []).filter(m => m.status === 'Active');
    members.sort((a, b) => (b.join_date || '').localeCompare(a.join_date || ''));
    return [members.slice(0, 5), []];
  }

  // Upcoming events (dashboard - simple query without JOINs)
  if (lower.includes('from events') && !lower.includes('join') && lower.includes('start_date >= now()')) {
    const events = (db.tables.events || []).filter(e => e.status === 'Published' && new Date(e.start_date) >= new Date());
    events.sort((a, b) => a.start_date.localeCompare(b.start_date));
    return [events.slice(0, 5), []];
  }

  // Pending applications (dashboard - simple query without JOINs)
  if (lower.includes('from applications') && !lower.includes('join') && lower.includes("'pending'")) {
    const apps = (db.tables.applications || []).filter(a => a.status === 'Pending');
    apps.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return [apps.slice(0, 5), []];
  }

  // Recent transactions with member name
  if (lower.includes('from financial_transactions') && lower.includes('members m')) {
    const txs = (db.tables.financial_transactions || []).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 10);
    const result = txs.map(t => {
      const member = t.member_id ? db.findById('members', t.member_id) : null;
      return { ...t, member_name: member ? member.first_name + ' ' + member.last_name : null };
    });
    return [result, []];
  }

  // Attendance with member name and event title
  if (lower.includes('from attendance a') && lower.includes('members m') && !lower.includes('units u')) {
    const memberId = params[0] || 0;
    const records = (db.tables.attendance || []).filter(a => a.member_id == memberId);
    records.sort((a, b) => (b.meeting_date || '').localeCompare(a.meeting_date || ''));
    const result = records.slice(0, 10).map(a => {
      const event = a.event_id ? db.findById('events', a.event_id) : null;
      return { ...a, event_title: event ? event.title : null };
    });
    return [result, []];
  }

  // Fallback: generic JOIN handler
  return handleGenericJoin(sql, params);
}

// ─── Aggregate Query Handler (legacy compat) ───
function handleAggregateQuery(sql, params) {
  const lower = sql.toLowerCase();

  // Members aggregate
  if (lower.includes('from members')) {
    const members = db.tables.members || [];
    return [[{
      total: members.length,
      active: members.filter(m => m.status === 'Active').length,
      inactive: members.filter(m => m.status === 'Inactive').length,
      applicants: members.filter(m => m.status === 'Applicant').length,
      alumni: members.filter(m => m.status === 'Alumni').length,
      suspended: members.filter(m => m.status === 'Suspended').length,
    }], []];
  }

  // Events aggregate
  if (lower.includes('from events') && lower.includes('count')) {
    const events = db.tables.events || [];
    return [[{
      total: events.length,
      upcoming: events.filter(e => e.status === 'Published' && new Date(e.start_date) >= new Date()).length,
      completed: events.filter(e => e.status === 'Completed').length,
    }], []];
  }

  // Applications aggregate
  if (lower.includes('from applications')) {
    const apps = db.tables.applications || [];
    return [[{
      total: apps.length,
      pending: apps.filter(a => a.status === 'Pending').length,
      approved: apps.filter(a => a.status === 'Approved').length,
      rejected: apps.filter(a => a.status === 'Rejected').length,
    }], []];
  }

  // Financial transactions aggregate
  if (lower.includes('from financial_transactions')) {
    const txs = db.tables.financial_transactions || [];
    const year = new Date().getFullYear();
    const yearTxs = txs.filter(t => new Date(t.created_at).getFullYear() === year);
    return [[{
      approved_total: yearTxs.filter(t => t.status === 'Approved').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
      pending_total: yearTxs.filter(t => t.status === 'Pending').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0),
    }], []];
  }

  // Contributions aggregate
  if (lower.includes('from contributions')) {
    const contribs = db.tables.contributions || [];
    const year = new Date().getFullYear();
    const yearContribs = contribs.filter(c => c.contribution_year == year);
    return [[{
      total_collected: yearContribs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
      contributing_members: new Set(yearContribs.filter(c => c.status === 'Paid').map(c => c.member_id)).size,
      paid_total: yearContribs.filter(c => c.status === 'Paid').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
      pending_total: yearContribs.filter(c => c.status === 'Pending').reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
    }], []];
  }

  // Treasurer contributions
  if (lower.includes('from contributions') && lower.includes('month_collected')) {
    const contribs = db.tables.contributions || [];
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const yearContribs = contribs.filter(c => c.contribution_year == year);
    return [[{
      month_collected: yearContribs.filter(c => c.contribution_month == month).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
      year_collected: yearContribs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0),
      paying_members: new Set(yearContribs.filter(c => c.status === 'Paid').map(c => c.member_id)).size,
    }], []];
  }

  // Monthly finance
  if (lower.includes('from contributions') && lower.includes('contribution_month as month')) {
    const contribs = db.tables.contributions || [];
    const year = new Date().getFullYear();
    const yearContribs = contribs.filter(c => c.contribution_year == year);
    const monthly = {};
    yearContribs.forEach(c => {
      const m = c.contribution_month;
      if (!monthly[m]) monthly[m] = { month: m, total: 0, paid: 0 };
      monthly[m].total += parseFloat(c.amount) || 0;
      if (c.status === 'Paid') monthly[m].paid += parseFloat(c.amount) || 0;
    });
    return [Object.values(monthly).sort((a, b) => a.month - b.month), []];
  }

  // Unit member counts
  if (lower.includes('from units') && lower.includes('member_count')) {
    const units = (db.tables.units || []).filter(u => u.is_active == 1);
    const unitMembers = db.tables.unit_members || [];
    const result = units.map(u => ({
      ...u,
      member_count: unitMembers.filter(um => um.unit_id == u.id && um.is_active == 1).length
    }));
    return [result, []];
  }

  return [[], []];
}

// ─── MySQL Connection with In-Memory Fallback ───
async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'messengers_of_peace',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });

    const conn = await pool.getConnection();
    conn.release();
    console.log('[MySQL] Connected successfully');
    useInMemory = false;
    return pool;
  } catch (err) {
    console.log('[MySQL] Not available, using in-memory database');
    console.log('[MySQL] Error:', err.message);
    useInMemory = true;
    await seedInMemory();

    const wrapper = {
      query: async (sql, params = []) => {
        return parseSimpleQuery(sql, params);
      },
      getConnection: async () => ({
        release: () => {},
        query: async (sql, params = []) => parseSimpleQuery(sql, params),
      })
    };
    return wrapper;
  }
}

const dbPromise = initDB();

const poolProxy = {
  query: async (sql, params) => {
    const p = await dbPromise;
    return p.query(sql, params);
  },
  getConnection: async () => {
    const p = await dbPromise;
    return p.getConnection();
  }
};

module.exports = poolProxy;
