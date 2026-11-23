// Event dates and times, always in local (Kigali) time.
// Reading a date with .split('T') used the UTC day, which is the day before for events at night
// or at midnight in Kigali.

const pad = n => String(n).padStart(2, '0')

// A date from the server -> the value of an <input type="datetime-local"> ("2026-11-15T13:30").
export const toLocalInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const hasTime = d => d.getHours() !== 0 || d.getMinutes() !== 0

// "Sunday 15 November 2026, 13:30" (no time when none was given), and the end if there is one.
export const eventWhen = (start, end) => {
  if (!start) return ''
  const s = new Date(start)
  const day = d => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  let text = day(s) + (hasTime(s) ? `, ${time(s)}` : '')
  if (end) {
    const e = new Date(end)
    if (e.toDateString() === s.toDateString()) text += hasTime(e) ? ` – ${time(e)}` : ''
    else text += ` – ${day(e)}${hasTime(e) ? `, ${time(e)}` : ''}`
  }
  return text
}

// Calendar block: { day: '15', month: 'NOV' }
export const dayBlock = (start) => {
  const d = new Date(start)
  return { day: String(d.getDate()), month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() }
}
