// Which roles may open each group of admin pages. These match the roles the
// server allows on each page's API calls (server/src/routes/*), so a page is
// only offered to people who can actually use it. Used by App.jsx and Sidebar.jsx.

export const STAFF = ['super_admin', 'chief', 'deputy_chief', 'secretary', 'treasurer', 'discipline_officer', 'unit_leader', 'media']
export const PEOPLE = ['super_admin', 'chief', 'secretary']
export const ATTENDANCE = ['super_admin', 'chief', 'secretary', 'unit_leader']
export const LEADERS = ['super_admin', 'chief']
export const CONTENT = ['super_admin', 'chief', 'media']
export const FINANCE = ['super_admin', 'chief', 'treasurer']
export const ADMIN = ['super_admin']
// Who reads "Report a Concern" reports (safeguarding).
export const SAFEGUARDING = ['super_admin', 'chief', 'discipline_officer']
