// Today's date as 'YYYY-MM-DD' in the user's local time zone.
// new Date().toISOString() gives the UTC date, which is yesterday between 00:00 and 02:00 in Rwanda.
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Age in whole years today, from a 'YYYY-MM-DD' birth date ('' if unknown).
export const ageOn = (birthDate) => {
  const m = String(birthDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  const now = new Date()
  let age = now.getFullYear() - Number(m[1])
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age--
  return age
}
