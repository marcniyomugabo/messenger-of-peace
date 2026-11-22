// One-time import of the public content that used to be written into the website code
// (board members, information documents, About sections, units, contact settings and the menu), so it can be managed from the dashboard.
// Safe to run again: anything already imported is skipped.  Run: npm run seed:content
const pool = require('../config/db');
const { today } = require('./dates');
const { nextMemberCode } = require('./memberCode');

// Board members, in website order (the first is shown large).
const LEADERS = [
  ['Nshimiyimana Jackson', 'Chief of Groupe', '/images/leaders/board/chief.jpeg', 'Leading the Messengers of Peace Scout Group with dedication and vision. Overseeing all group activities and ensuring the achievement of scouting objectives.'],
  ['Nkusi Jeanette', 'Deputy Chief', '/images/leaders/board/deputy.PNG', 'Supporting the Chief of Groupe in managing group operations and coordinating between units.'],
  ['Iradukunda Cyusa Samillah', 'Secretary', '/images/leaders/board/secretary.PNG', 'Managing group communications, records, and organizational documentation.'],
  ['Sugira Cammille', 'Deputy Secretary', '/images/leaders/board/deputy-secretary.PNG', 'Assisting the secretary in managing administrative tasks and documentation.'],
  ['Musinga', 'Chief of Disciplinary', '/images/leaders/board/musinga.JPEG', 'Leading disciplinary efforts across all units, ensuring scouts uphold the highest standards of conduct.'],
  ['Uwineza Shella', 'Disciplinary', '/images/leaders/board/disciplinary-member.PNG', 'Supporting disciplinary operations and maintaining order across the group.'],
  ['Munezero Yakin', 'Logistics', '/images/leaders/board/logistics.PNG', 'Managing equipment, supplies, and logistics for all scouting events and expeditions.'],
  ['Wetu Ezekiel', 'Charge Spokesperson', '/images/leaders/board/spokesperson-group.PNG', 'Leading group communications and spokesperson operations, coordinating media relations and public representation.'],
  ['Ihirwe Richess', 'Spokesperson', '/images/leaders/board/spokesperson.PNG', 'Representing the group publicly and managing communications with media and partners.'],
  ['Uwabakurikiza Anitha', 'Social Affairs', '/images/leaders/board/socially.PNG', 'Coordinating social activities and welfare programs for all group members.'],
  ['Uwase Chanella', 'Formatrice', '/images/leaders/board/formatrice.PNG', 'Developing and delivering training programs to build scout skills and leadership abilities.'],
  ['Akijuru Belle Hervine', 'Board Member', '/images/leaders/board/board1.PNG', 'Supporting group governance and contributing to strategic planning and decision-making.'],
  ['Kwizera Prince', 'Board Member', '/images/leaders/board/board2.PNG', 'Contributing to group leadership and ensuring the achievement of scouting goals.'],
];

// Information documents (the two duplicate copies of the old list are left out).
const DOCUMENTS = [
  ['FA Posters Rwanda', 'First Aid posters for Rwanda scouting activities.', 'Safety', '2020_032_Posters-FA_A2_Rwanda_RW_LR.pdf'],
  ['ABAHIZI Draft 4', 'ABAHIZI draft document - version 4.', 'Guide', '3. ABAHIZI  -DRAFT 4.pdf'],
  ['ABAHIZI Volume 3 Edition 2', 'ABAHIZI publication volume 3, edition 2.', 'Guide', 'ABAHIZI%20%20Vol3,ed2.pdf.pdf'],
  ['Counselling Guide', 'Counselling guide for scout leaders and members.', 'Training', 'Consouling.pdf'],
  ['Religious Dimension of Scouting Pedagogy', 'Exploring the religious and spiritual dimensions of the scouting educational method.', 'Guide', 'DIMENSION-RELIGIEUSE-DE-LA-PEDAGOGIE-SCOUTE (1).pdf'],
  ['Growth and Social Impact', 'RSA presentation on growth and social impact - October 2025.', 'Training', 'Growth and Social Impact. RSA Oct 2025 - Copy.pptx'],
  ['GUTEGURA IGIKORWA', 'GUTEGURA IGIKORWA operational guide.', 'Service', 'GUTEGURA IGIKORWA (1).doc'],
  ['Ifirimbi', 'Ifirimbi scouting publication.', 'Official', 'ifirimbi.pdf'],
  ['Heritage from the Liberation War', 'Discussion on heritage from the liberation war and stopping genocide.', 'Official', 'Ikiganiro umurage tuvoma mu rugamba rwo kubohora u Rwanda, guhagarika jenoside(2).pdf'],
  ['Ikoraniro', 'Ikoraniro scouting activity guide.', 'Skills', 'ikoraniro.pdf'],
  ['Les Journees Mondiales', 'World days official document.', 'Official', 'LES JOURNEES MONDIALES.docx'],
  ['Rover Guidelines', 'Rover scout official guidelines.', 'Guide', 'Rover Guidelines EN.pdf'],
  ['Youth Programme Educational Activities', 'Session guide for educational activities within the Youth Programme.', 'Training', 'Session -Educ Activities  (Youth Programme).pdf'],
  ['Urubuto Protocol Agency Concept Note', 'Concept note for the Urubuto Protocol Agency initiative.', 'Service', 'urubuto_protocol_agency_concept_note.pdf'],
  ['World Days Calendar', 'Complete calendar of international and scouting world days.', 'Official', 'World_Days_Calendar_Full.pdf'],
];

// About page sections (key, title, content, image), in page order. The writing format is
// explained in client/src/config/aboutSections.js (paragraphs, "- items", "A | B | C" cards).
const ABOUT = [
  ['intro', 'Messengers of Peace | Who We Are & What We Aim To Be',
    "Messengers of Peace Scout Group ni umuryango urera kandi ukigisha urubyiruko n'abana b'abaskuti muri G.S. CAMP KIGALI. Muri iki gihe, uyu muryango ugizwe n'abanyamuryango bari hagati ya 50 na 100, abenshi bakaba ari urubyiruko ruza kwiga no gukora ibikorwa bitandukanye mu mashuri yisumbuye no mu muryango.\n\n" +
    'Messengers of Peace Scout Group is a group that trains and teaches youth and young scouts at G.S. CAMP KIGALI. Currently, the group is composed of between 50 and 100 members, most of whom are young people who come to learn and participate in various activities in secondary schools and in the group.\n\n' +
    'In collaboration with PLP Family.', '/images/scout.JPEG'],
  ['glance', 'Our Group at a Glance',
    "Intego Nkuru: Kubaka ubushobozi bw'urubyiruko | Main Goal: Building youth capacity through education and training\n" +
    'Buri ku Cyumweru, Saa 13:30 – 16:30 | Every Sunday, 1:30 PM – 4:30 PM\n' +
    'Youth aged 14 and above | Urubyiruko kuva ku myaka 14 kuzamura\n' +
    'G.S. Camp Kigali | Aho dukorera – Where we operate'],
  ['focus', 'Icyo Twibandaho | What We Focus On',
    "Impano n'Umuco | Talent & Gifts: Traditional dance (Intore), modern dances, singing and other talents.\n" +
    'Indimi | Languages: Teaching and promoting Kinyarwanda, French, English, and Swahili.\n' +
    'Uburere Mboneragihugu | Patriotism: Loving the country, drill, and Rwandan cultural values.\n' +
    'Ibicurangisho | Badges: Earning traditional and modern scouting badges.\n' +
    'Kwihangira Imirimo | Self-reliance: Teaching youth to work, develop skills, and find opportunities.'],
  ['benefits', "Inyungu Z'Abarizwa mu Muryango", ''],
  ['benefits_youth', 'Inyungu ku Mwana / Urubyiruko | Benefits for Youth / Young People',
    '- Gaining knowledge and skills to be self-reliant\n- Following national programs and opportunities for youth\n- Creating opportunities to learn and grow in life'],
  ['benefits_parents', 'Inyungu ku Babyeyi | Benefits for Parents',
    "- Having a well-mannered child with good character and Rwandan culture\n- Instilling good behavior and respect for God (respecting each person's beliefs)\n- Good cooperation between parents and educators in monitoring the child"],
  ['values', "Indangagaciro Z'Umunyamuryango | Member Values",
    'The core principles that guide every member of Messengers of Peace\n\n' +
    "Kwicisha Bugufi | Humility | Kudakirita n'ubwitonzi mu byo ukora vyose. Being humble in all we do, serving with a humble heart.\n" +
    "Kubahiriza igihe | Punctuality | Kwita ku masaha mu bitaramo, inama n'imyitozo. Respecting time and being reliable in every commitment.\n" +
    "Kwiyubaha no kubaha Imana | Respect & Faith | Kuguha agaciro ubwawe n'imyemerere. Honoring God and showing respect to all people.\n" +
    "Gukorera hamwe n'Urukundo | Love & Teamwork | Unité n'ubatabazi muri twe. Working together with love and compassion for one another.\n" +
    "Isuku | Cleanliness | Isuku y'umubiri, ku myambarire n'aho dukorera. Maintaining hygiene and cleanliness in mind, body, and environment."],
  ['kirazira', 'Kirazira | Be Prepared',
    '"Kirazira " is more than just a motto — it is a way of life for every scout in our group. It means being ready at all times to face challenges, to serve others, and to do what is right even when no one is watching.\n\n' +
    'This principle teaches our scouts to plan ahead, to develop the skills they need, and to maintain the moral courage to act when duty calls. Whether it is helping a neighbor, responding to an emergency, or standing up for what is right, a prepared scout is always ready.\n\n' +
    "- Physically and mentally prepared for any challenge\n- Ready to serve the community at a moment's notice\n- Prepared with the skills learned through scouting\n- Morally ready to make the right decision"],
  ['mission', 'Our Mission',
    'To train youth in scouting skills and values that promote peace, leadership, and community development, preparing them to be responsible citizens who contribute positively to society.'],
  ['vision', 'Our Vision',
    'To be a leading scout group in Rwanda that produces responsible, skilled, and peace-loving citizens who are committed to serving their communities and the nation.'],
  ['pillars', "Inkingi n'Ingamba Zizafasha mu Kuzamura Group | Pillars & Strategies to Help Grow the Group",
    'From the General Assembly of members held at Camp Kigali on April 12, 2026 (21 members attended):\n\n' +
    'Ibikorwa by\'Urukundo | Acts of Service | Organizing ongoing activities like "Kakawette" and other support initiatives to help one another.\n' +
    "Amarushanwa n'Ibiganiro | Competitions & Debates | Organizing debate competitions and public speaking events to build confidence and critical thinking.\n" +
    'Umusanzu wa Buri Kwezi | Monthly Contribution | Establishing a regular monthly contribution of 500 Frw per member each month to fund group activities.\n' +
    'Kwita ku Banyamuryango | Member Welfare | Organizing birthday celebrations for members (during holidays or when they are out of school).'],
  ['talent_units', 'Inite (Units) Zashyizweho | Specialized Units Established by Members Based on Their Talents',
    "Inite Amasonga | Lead: Joyce & Sandra | Umuco Nyarwanda, Imbyino gakondo n'Amateka y'Igihugu. | Rwandan Culture, Traditional Dance & National History.\n" +
    "Inite Carbians | Lead: Jord & Djibril | Imbyino zigezweho, Umuduri n'Ibihangano bishya. | Modern Dance, Drumming & New Creativity.\n" +
    "Inite The Impact | Lead: Miguel | Gutoza n'ugufasha abifuza kumenya uko umuyobozi mwiza yitwara. | Leadership Training & Development.\n\n" +
    'Note: Additional units will be established based on growing membership and emerging talents.'],
  ['annual', "Intego n'Ibikorwa Ngarukamwaka | Annual Goals & Activities", ''],
  ['annual_goals', 'Goals to Achieve Before December',
    'Saving Account | Opening savings bank accounts (to help in emergencies for the group).\n' +
    'Scout Uniforms | Getting proper uniforms for all members.\n' +
    'Member Visits | Setting up a program to visit and support members in the group and in daily life.\n' +
    'Community Service | Organizing community service (Umuganda) at national level in known and nearby locations.\n' +
    'Group Identity | Having three (3) flags representing Messengers of Peace Scout Group by December.'],
  ['contributions_use', 'Using Contributions & Resources',
    'The monthly contribution (500 Frw) will be used to achieve the goals we have committed to. Special activities such as supporting a member who lost a loved one or helping a member in emergency will require special contributions when needed.'],
  ['annual_activities', 'Annual Activities (Ibikorwa Ngarukamwaka)',
    'The group commits to ongoing annual activities and regular evaluation:\n\n' +
    '- Visiting and helping patients in hospitals and homes\n- Visiting and supporting vulnerable people in the community'],
  ['objectives', 'Our Objectives',
    '- Train youth in scouting skills and leadership\n- Promote peace, tolerance, and understanding among young people\n- Develop community service and environmental conservation awareness\n' +
    '- Provide first aid, survival, and outdoor skills training\n- Foster patriotism and love for Rwanda\n- Build character through the Scout Law and Promise\n' +
    '- Encourage academic excellence alongside scouting activities\n- Prepare young people to be responsible citizens'],
  ['handbook', 'Download Our Handbook',
    'Get the complete Messengers of Peace Scout Group Handbook with all information about our group, values, and activities.'],
  ['credits', 'MESSENGERS OF PEACE SCOUT GROUP',
    'G.S. CAMP KIGALI | Nyarugenge | Kigali\n+250 722 784 670 | +250 786 188 913\n' +
    'Prepared by: Uwineza Shella – Umuyobozi Ushinzwe Imyitwarire | Approved by: Nshimiyimana Jackson – Chief de Group (C.G)'],
];

// The four scout units, as the public Units page showed them:
// [name, slug, English name, min age, max age, colour, icon, description, activities]
const UNITS = [
  ['Abatoni', 'abatoni', 'Cub Scouts', 6, 12, '#6B21A8', '🏕️',
    'The youngest section of our scout group. Abatoni provides a fun and nurturing environment where children learn the basics of scouting through games, songs, nature walks, and simple community activities.',
    ['Nature exploration and environmental games', 'Basic first aid and safety awareness', 'Storytelling and scouting songs', 'Simple craft and art projects', 'Introduction to the Scout Promise', 'Fun outdoor activities and picnics']],
  ['Inkesha', 'inkesha', 'Scouts', 13, 16, '#1D4ED8', '🧭',
    'The scout section where young people begin to develop real scouting skills. Inkesha focuses on teamwork, outdoor survival, and community engagement under the guidance of experienced leaders.',
    ['Camping and outdoor survival skills', 'First aid training and emergency response', 'Community service projects', 'Map reading and compass navigation', 'Environmental conservation activities', 'Inter-patrol competitions and challenges']],
  ['Abahizi', 'abahizi', 'Companions', 17, 20, '#15803D', '🤝',
    'The companion section where young leaders take on real challenges. Abahizi focuses on leadership development, project management, and making a measurable difference in the community.',
    ['Leadership and project management training', 'Community impact projects', 'Advanced first aid and rescue skills', 'Peer mentoring and youth empowerment', 'Scout advancement and badge earning', 'Regional and national scouting events']],
  ['Ingenzi', 'ingenzi', 'Rovers', 21, 25, '#6B21A8', '🌟',
    'The rover section for young adults who lead by example. Ingenzi members serve as mentors and role models, driving scouting initiatives and community development projects.',
    ['Mentoring younger scout units', 'Community development projects', 'Advanced leadership and life skills', 'Event planning and coordination', 'Public speaking and advocacy', 'National and international scout events']],
];

// Website contact details. The first database had placeholder values that differ from
// what the website shows; a setting still holding its placeholder gets the website value.
// [key, website value, old placeholder or null, type, category]
const SETTINGS = [
  ['email_contact', 'info@mopscouts.rw', 'info@mop.rw', 'text', 'contact'],
  ['phone_contact', '+250 786 188 913', '+250786188913', 'text', 'contact'],
  ['whatsapp_contact', '+250 722 784 670', '+250722784670', 'text', 'contact'],
  ['meeting_location', 'Camp Kigali, Nyarugenge District, Kigali', 'Camp Kigali, Nyarugenge, Kigali', 'text', 'general'],
  ['group_description', 'Building tomorrow\'s leaders through scouting values, community service, and the spirit of peace. Part of the Rwanda Scout Association.', null, 'textarea', 'general'],
];

async function importSettings() {
  let changed = 0;
  for (const [key, value, placeholder, type, category] of SETTINGS) {
    const [[row]] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
    if (!row) {
      await pool.query('INSERT INTO settings (setting_key, setting_value, setting_type, category) VALUES (?, ?, ?, ?)', [key, value, type, category]);
      changed++;
    } else if (placeholder !== null && row.setting_value === placeholder) {
      await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
      changed++;
    }
  }
  return changed;
}

// The site menu (dashboard: Navigation), as the Navbar showed it. Only added when the menu is empty.
const MENU = [
  ['Home', '/'], ['About Us', '/about'], ['News', '/news'], ['Units', '/units'], ['Activities', '/activities'], ['Library', '/portfolio'],
  ['Information', '/information'], ['Board Members', '/leadership'], ['Members', '/members'], ['Gallery', '/gallery'], ['Contact Us', '/contact'],
  ['Report a Concern', '/report-concern'],
];

// Links added later to sites that already had a menu: [label, url, placed after this url (or at the end)].
const NEW_MENU_LINKS = [
  ['News', '/news', '/about'],
  ['Report a Concern', '/report-concern', null],
];

async function importMenu() {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM navigation_items');
  if (count === 0) {
    for (const [index, [label, url]] of MENU.entries()) {
      await pool.query('INSERT INTO navigation_items (label, url, sort_order, is_active, opens_new_tab) VALUES (?, ?, ?, 1, 0)', [label, url, index + 1]);
    }
    return MENU.length;
  }
  // A link is only added when it is missing. (Run once per site: if an admin removes one of
  // these links on purpose and the import is run again, the link comes back.)
  let added = 0;
  for (const [label, url, after] of NEW_MENU_LINKS) {
    const [[existing]] = await pool.query('SELECT id FROM navigation_items WHERE url = ?', [url]);
    if (existing) continue;
    const [[anchor]] = after ? await pool.query('SELECT sort_order FROM navigation_items WHERE url = ?', [after]) : [[null]];
    let position;
    if (anchor) {
      position = anchor.sort_order + 1;
      await pool.query('UPDATE navigation_items SET sort_order = sort_order + 1 WHERE sort_order >= ?', [position]);
    } else {
      const [[{ last }]] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) AS last FROM navigation_items');
      position = last + 1;
    }
    await pool.query('INSERT INTO navigation_items (label, url, sort_order, is_active, opens_new_tab) VALUES (?, ?, ?, 1, 0)', [label, url, position]);
    added++;
  }
  return added;
}

// Home page hero slideshow (dashboard: Home Content > Hero Slides). Only added when there are no slides.
// [title, description, background image]
const SLIDES = [
  ['Messengers of Peace', 'We are a community of young people committed to peace, service, and positive change.', '/images/first1.PNG'],
  ['Building Tomorrow’s Leaders', 'Training youth in scouting values, leadership, and community development.', '/images/bg2.jpeg'],
  ['Community Service First', 'Our scouts lead environmental cleanup campaigns across Rwanda.', '/images/community.JPEG'],
  ['First Aid & Emergency Training', 'Life-saving skills for every scout through professional training.', '/images/bg4.jpeg'],
  ['Annual Scout Camps', 'Outdoor survival, teamwork, and leadership challenges at Camp Kigali.', '/images/bg5.jpeg'],
  ['Inspiring Hope Together', 'Part of the Rwanda Scout Association — spreading peace across communities.', '/images/bg6.jpeg'],
];

async function importSlides() {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM hero_slides');
  if (count > 0) return 0;
  for (const [index, [title, description, image]] of SLIDES.entries()) {
    await pool.query(
      `INSERT INTO hero_slides (title, subtitle, description, background_image, button_text, button_link, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [title, 'Building Peace • Inspiring Hope', description, image, 'Learn More', '/about', index + 1]
    );
  }
  return SLIDES.length;
}

// The numbers on the Home page (dashboard: Home Content > Page Sections, type "Numbers").
// One "value | label" per line; the "Scout Units" number is always the real count of units.
const HOME_NUMBERS = '105 | Active Members\n4 | Scout Units\n50+ | Activities Per Year\n500+ | Community Service Hours';

async function importHomeNumbers() {
  const [[existing]] = await pool.query("SELECT id FROM homepage_sections WHERE section_type = 'stats' LIMIT 1");
  if (existing) return 0;
  await pool.query(
    "INSERT INTO homepage_sections (title, content, section_type, sort_order, is_active) VALUES ('Home numbers', ?, 'stats', 10, 1)",
    [HOME_NUMBERS]
  );
  return 1;
}

// Adds missing units and fills in units that were never imported (no ages yet).
// A unit already edited in the dashboard is left as it is.
async function importUnits() {
  let changed = 0;
  // The first database spelled Inkesha as "Inyesha", so applications for it never found their unit.
  const [[oldName]] = await pool.query("SELECT id FROM units WHERE slug = 'inyesha'");
  const [[newName]] = await pool.query("SELECT id FROM units WHERE slug = 'inkesha'");
  if (oldName && !newName) {
    await pool.query("UPDATE units SET name = 'Inkesha', slug = 'inkesha' WHERE id = ?", [oldName.id]);
    changed++;
  }
  for (const [index, [name, slug, english, minAge, maxAge, color, icon, description, activities]] of UNITS.entries()) {
    const values = [name, english, minAge, maxAge, color, icon, description, activities.join('\n'), index + 1];
    const [[unit]] = await pool.query('SELECT id, min_age FROM units WHERE slug = ?', [slug]);
    if (!unit) {
      await pool.query(
        `INSERT INTO units (name, focus_area, min_age, max_age, color, icon, description, activities, display_order, slug)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...values, slug]);
      changed++;
    } else if (unit.min_age === null) {
      await pool.query(
        `UPDATE units SET name = ?, focus_area = ?, min_age = ?, max_age = ?, color = ?, icon = ?, description = ?,
         activities = ?, display_order = ? WHERE id = ?`, [...values, unit.id]);
      changed++;
    }
  }
  return changed;
}

async function importAbout() {
  let added = 0;
  for (const [index, [key, title, content, image]] of ABOUT.entries()) {
    const [[existing]] = await pool.query('SELECT id FROM about_content WHERE section_key = ?', [key]);
    if (existing) continue;
    await pool.query(
      'INSERT INTO about_content (section_key, title, content, image, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [key, title, content, image || null, (index + 1) * 10]
    );
    added++;
  }
  return added;
}

async function importLeaders() {
  let added = 0;
  for (const [index, [fullName, position, photo, description]] of LEADERS.entries()) {
    const [first, ...rest] = fullName.split(' ');
    const last = rest.join(' ');
    let [[member]] = await pool.query('SELECT id FROM members WHERE first_name = ? AND last_name = ? AND photo = ?', [first, last, photo]);
    if (!member) {
      const [result] = await pool.query(
        `INSERT INTO members (member_code, first_name, last_name, photo, photo_consent, role_in_group, status, join_date)
         VALUES (?, ?, ?, ?, 1, ?, 'Active', ?)`,
        [await nextMemberCode(), first, last, photo, position, today()]
      );
      member = { id: result.insertId };
    }
    const [[assignment]] = await pool.query(
      'SELECT id FROM leadership_assignments WHERE member_id = ? AND position = ? AND is_active = 1', [member.id, position]
    );
    if (!assignment) {
      await pool.query(
        `INSERT INTO leadership_assignments (member_id, position, start_date, description, display_order)
         VALUES (?, ?, ?, ?, ?)`,
        [member.id, position, today(), description, index + 1]
      );
      added++;
    }
  }
  return added;
}

async function importDocuments() {
  let added = 0;
  for (const [title, description, category, fileName] of DOCUMENTS) {
    const filePath = `/information/${fileName}`;
    const [[existing]] = await pool.query('SELECT id FROM information_documents WHERE file_path = ?', [filePath]);
    if (existing) continue;
    await pool.query(
      `INSERT INTO information_documents (title, description, category, file_name, file_path, status)
       VALUES (?, ?, ?, ?, ?, 'Published')`,
      [title, description, category, fileName, filePath]
    );
    added++;
  }
  return added;
}

// The public Library page used to show these files from its own code, so they could not be
// changed from the dashboard. They now live in the Library like any other resource.
const LIBRARY = [
  ['First Aid for Scouts', 'Safety', 'First Aid training manual for scouts covering emergency response, wound care, and rescue techniques.', 'FIRST AID FOR SCOUTS.pptx'],
  ['Food for Life - Scouts Practical Guide', 'Environment', 'Training manual on soil health, organic inputs, and sustainable crop protection for scouts.', 'Food for Life - Scouts Practical Guide.pdf'],
  ['Growth and Social Impact', 'Education', 'RSA presentation on growth and social impact initiatives - October 2025.', 'Growth and Social Impact. RSA Oct 2025.pptx'],
  ['Working with Children and Young People', 'Training', 'Guide for working effectively with children and young people in scouting activities.', 'WORKING WITH CHILDREN AND YOUNG PEOPLE (1).pptx'],
  ["WOSM's Education Initiative", 'Education', "Presentation on WOSM's global education initiative for scouting organizations worldwide.", "WOSM'S Education Initiative.pptx"],
  ['Scouting Activity Document', 'Service', 'Additional scouting activity documentation and guidelines.', 'doc_1787157106_760.pdf'],
];

async function importLibrary() {
  let added = 0;
  for (const [title, category, description, fileName] of LIBRARY) {
    const filePath = `/portfolio/${fileName}`;
    const [[existing]] = await pool.query('SELECT id FROM library_resources WHERE file_path = ?', [filePath]);
    if (existing) continue;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await pool.query(
      `INSERT INTO library_resources (title, slug, description, category, file_path, file_type, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Published')`,
      [title, slug, description, category, filePath, fileName.split('.').pop().toLowerCase()]
    );
    added++;
  }
  return added;
}

(async () => {
  try {
    console.log(`Board positions added: ${await importLeaders()}`);
    console.log(`Information documents added: ${await importDocuments()}`);
    console.log(`Library resources added: ${await importLibrary()}`);
    console.log(`About sections added: ${await importAbout()}`);
    console.log(`Units added or filled in: ${await importUnits()}`);
    console.log(`Settings corrected or added: ${await importSettings()}`);
    console.log(`Menu links added: ${await importMenu()}`);
    console.log(`Home slides added: ${await importSlides()}`);
    console.log(`Home numbers added: ${await importHomeNumbers()}`);
    console.log('Content import completed');
    process.exit(0);
  } catch (err) {
    console.error('Content import failed:', err.message);
    process.exit(1);
  }
})();
