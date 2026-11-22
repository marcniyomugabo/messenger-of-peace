import { today } from './date'

// Activities are published in the dashboard (Activities). These sample activities are only
// shown while no activity has been published yet.
export const SAMPLE_ACTIVITIES = [
  { title: 'Environmental Cleanup Campaign', start_date: '2026-08-10', location: 'Nyarugenge District', category_name: 'Community Service', description: 'Our scouts cleaned the streets and planted 200 trees across Nyarugenge as part of the Umuganda initiative.', cover_image: '/images/activities/IMG_0863.JPG.jpeg' },
  { title: 'First Aid Training Workshop', start_date: '2026-07-20', location: 'Camp Kigali', category_name: 'Training', description: 'Senior scouts learned life-saving first aid techniques from certified Red Cross instructors.', cover_image: '/images/activities/first-aid.jpg' },
  { title: 'Annual Scout Camp', start_date: '2026-07-05', location: 'Camp Kigali', category_name: 'Camping', description: 'Three days of outdoor survival challenges, team building, campfire programs, and leadership exercises.', cover_image: '/images/activities/IMG_7480.JPG.jpeg' },
  { title: 'Inter-Group Competition', start_date: '2026-09-15', location: 'Kigali Arena', category_name: 'Competition', description: 'Annual scouting competition with groups from across Kigali featuring patrol challenges, first aid relay, and pioneering.' },
  { title: 'Peace Day Celebration', start_date: '2026-09-21', location: 'Camp Kigali', category_name: 'Ceremony', description: 'Celebrating International Day of Peace with a special ceremony, peace march, and community gathering.' },
  { title: 'Health Awareness Campaign', start_date: '2026-10-05', location: 'Nyarugenge District', category_name: 'Community Service', description: 'Scouts visit local communities to share health awareness messages about hygiene, nutrition, and disease prevention.' },
  { title: 'Advanced Survival Skills Training', start_date: '2026-10-18', location: 'Camp Kigali', category_name: 'Training', description: 'Senior scouts learn advanced camping techniques, knot tying, shelter building, and navigation.' },
  { title: 'Christmas Charity Drive', start_date: '2026-12-20', location: 'Various Locations', category_name: 'Community Service', description: 'Collecting and distributing gifts and essential items to vulnerable families during the holiday season.' },
]

const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '').slice(0, 10))

// "Upcoming", "Happening now" or "Completed", from the dates compared with today
// (so an activity can never stay "Upcoming" after its date).
export const activityStatus = (start, end) => {
  if (!isDate(start)) return ''
  const now = today()
  const first = String(start).slice(0, 10)
  const last = isDate(end) ? String(end).slice(0, 10) : first
  if (first > now) return 'Upcoming'
  if (last < now) return 'Completed'
  return 'Happening now'
}

// "2026-08-10" -> "August 10, 2026" (or "August 2026" with month: true)
export const formatActivityDate = (d, month = false) => {
  if (!isDate(d)) return ''
  const date = new Date(String(d).slice(0, 10) + 'T00:00:00')
  return date.toLocaleDateString('en-US', month ? { month: 'long', year: 'numeric' } : { year: 'numeric', month: 'long', day: 'numeric' })
}

// One activity from the API (or a sample) in the shape the pages use.
export const toActivity = (a) => ({
  id: a.id,
  title: a.title || 'Untitled activity',
  start: a.start_date ? String(a.start_date).slice(0, 10) : '',
  date: formatActivityDate(a.start_date),
  month: formatActivityDate(a.start_date, true),
  location: a.location || '',
  category: a.category_name || '',
  desc: a.short_description || a.description || '',
  image: a.cover_image || '',
  status: activityStatus(a.start_date, a.end_date),
})
