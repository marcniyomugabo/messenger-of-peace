// The blocks of the public About page, in page order. Each one is an About section in the
// dashboard (section_key = key); the help text tells the admin how to write it.

const CARDS = 'one card per line'
export const ABOUT_SECTIONS = [
  { key: 'intro', label: 'Introduction (Section I)', help: 'Title: "Heading | Subtitle". Content: paragraphs; the last paragraph is highlighted. Image: the photo shown beside it.' },
  { key: 'glance', label: 'Our Group at a Glance', help: `Content: ${CARDS} as "Bold line | Small line".` },
  { key: 'focus', label: 'What We Focus On', help: `Title: "Heading | Subtitle". Content: ${CARDS} as "Title | Description".` },
  { key: 'benefits', label: 'Benefits (section heading)', help: 'Title only: the heading above the two benefit boxes.' },
  { key: 'benefits_youth', label: 'Benefits for Youth', help: 'Title: "Heading | Subtitle". Content: one "- item" per line.' },
  { key: 'benefits_parents', label: 'Benefits for Parents', help: 'Title: "Heading | Subtitle". Content: one "- item" per line.' },
  { key: 'values', label: 'Member Values', help: `Title: "Heading | Subtitle". Content: an optional intro paragraph, then ${CARDS} as "Name | English name | Description".` },
  { key: 'kirazira', label: 'Kirazira', help: 'Title: "Heading | Subtitle". Content: paragraphs, then one "- point" per line.' },
  { key: 'mission', label: 'Our Mission', help: 'Content: one paragraph.' },
  { key: 'vision', label: 'Our Vision', help: 'Content: one paragraph.' },
  { key: 'pillars', label: 'Pillars & Strategies (Section III)', help: `Title: "Heading | Subtitle". Content: an optional intro paragraph, then ${CARDS} as "Name | English name | Description".` },
  { key: 'talent_units', label: 'Talent Units', help: `Title: "Heading | Subtitle". Content: ${CARDS} as "Unit name | Lead: names | Description | English description", then an optional note paragraph.` },
  { key: 'annual', label: 'Annual Goals (Section IV heading)', help: 'Title only: "Heading | Subtitle".' },
  { key: 'annual_goals', label: 'Goals to Achieve', help: `Content: ${CARDS} as "Goal | Description".` },
  { key: 'contributions_use', label: 'Using Contributions', help: 'Content: paragraphs.' },
  { key: 'annual_activities', label: 'Annual Activities', help: 'Content: an optional intro paragraph, then one "- activity" per line (shown numbered).' },
  { key: 'objectives', label: 'Our Objectives', help: 'Content: one "- objective" per line (shown numbered).' },
  { key: 'handbook', label: 'Download Our Handbook', help: 'Content: a paragraph. The two download buttons stay the same.' },
  { key: 'credits', label: 'Contact & Credits (bottom)', help: 'Title: the bold first line. Content: each line is shown as its own line, exactly as typed.' },
]

export const ABOUT_SECTION_BY_KEY = Object.fromEntries(ABOUT_SECTIONS.map(s => [s.key, s]))
