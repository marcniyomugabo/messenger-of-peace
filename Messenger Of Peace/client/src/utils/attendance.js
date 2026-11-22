import api from '../services/api'

// The four marks, in the order the buttons show them.
export const MARKS = [
  { value: 'Present', short: 'P', color: 'var(--mop-success)', bg: 'var(--mop-success-bg)' },
  { value: 'Late', short: 'L', color: '#B45309', bg: 'var(--mop-warning-bg)' },
  { value: 'Absent', short: 'A', color: 'var(--mop-danger)', bg: 'var(--mop-danger-bg)' },
  { value: 'Excused', short: 'E', color: '#2563EB', bg: 'var(--mop-info-bg)' },
]
export const markStyle = (status) => MARKS.find(m => m.value === status)

export const SESSION_TYPES = ['Weekly meeting', 'Event', 'Camp', 'Training', 'Other']

// Same rule as the server: Late counts as attended, Excused is left out.
export const rateOf = ({ present = 0, late = 0, absent = 0 }) => {
  const counted = present + late + absent
  return counted ? Math.round(((present + late) / counted) * 100) : null
}
export const rateColor = (rate) => (rate == null ? '#9CA3AF' : rate >= 80 ? 'var(--mop-success)' : rate >= 60 ? '#D97706' : 'var(--mop-danger)')
export const RATE_HELP = 'Rate = (Present + Late) ÷ (Present + Late + Absent). Excused absences are not counted against the member.'

export const formatDate = (d) => {
  if (!d) return ''
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export const startOfYear = () => `${new Date().getFullYear()}-01-01`

// Download the CSV from the server (it checks who may see which unit).
export async function downloadAttendanceCsv(params) {
  const res = await api.get('/attendance/export', { params, responseType: 'blob' })
  const disposition = res.headers?.['content-disposition'] || ''
  const name = (disposition.match(/filename="([^"]+)"/) || [])[1] || 'attendance.csv'
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// A small CSV from rows already on screen (member table).
export function downloadCsv(filename, header, rows) {
  const cell = (v) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@]/.test(s)) s = "'" + s
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = '﻿' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
