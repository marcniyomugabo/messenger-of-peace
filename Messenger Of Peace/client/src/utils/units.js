import { useEffect, useState } from 'react'
import api from '../services/api'

// The scout units come from the dashboard (Units). These four are only used if the
// server cannot be reached, so the Units page and the Join Us form still work.
export const FALLBACK_UNITS = [
  { slug: 'abatoni', name: 'Abatoni', focus_area: 'Cub Scouts', min_age: 6, max_age: 12, color: '#6B21A8', icon: '🏕️' },
  { slug: 'inkesha', name: 'Inkesha', focus_area: 'Scouts', min_age: 13, max_age: 16, color: '#1D4ED8', icon: '🧭' },
  { slug: 'abahizi', name: 'Abahizi', focus_area: 'Companions', min_age: 17, max_age: 20, color: '#15803D', icon: '🤝' },
  { slug: 'ingenzi', name: 'Ingenzi', focus_area: 'Rovers', min_age: 21, max_age: 25, color: '#6B21A8', icon: '🌟' },
]

const PURPLE = '#6B21A8'

// "6 - 12 years", "From 21 years", "Up to 12 years" or '' when no ages are set.
export const ageRange = (min, max, dash = ' - ') => {
  const hasMin = min !== null && min !== undefined && min !== ''
  const hasMax = max !== null && max !== undefined && max !== ''
  if (hasMin && hasMax) return `${min}${dash}${max} years`
  if (hasMin) return `From ${min} years`
  if (hasMax) return `Up to ${max} years`
  return ''
}

// "First sentence. Second sentence." -> "First sentence." (the whole text if it has no full stop)
export const firstSentence = (text) => {
  const t = String(text || '').trim()
  const m = t.match(/^.+?[.!?](?=\s|$)/)
  return m ? m[0] : t
}

// One unit from the API in the shape the pages use.
export const toUnit = (u) => {
  const color = /^#[0-9a-fA-F]{6}$/.test(u.color || '') ? u.color : PURPLE
  return {
    id: u.slug,
    name: u.name,
    english: u.focus_area || '',
    ageRange: ageRange(u.min_age, u.max_age),
    color,
    bg: color + '1A', // the unit colour at 10% strength
    icon: u.icon || '',
    desc: u.description || '',
    activities: String(u.activities || '').split('\n').map(a => a.trim()).filter(Boolean),
  }
}

// Active units, in dashboard order. `loaded` is false until the server has answered.
export function useUnits() {
  const [units, setUnits] = useState(FALLBACK_UNITS.map(toUnit))
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    api.get('/units')
      .then(res => {
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        if (alive) setUnits(list.map(toUnit))
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])
  return { units, loaded }
}
