import { useEffect, useState } from 'react'
import api from '../services/api'

// Website details managed in the dashboard (Settings). These defaults are shown until the
// server answers, and stay if it cannot be reached or a setting is empty.
export const DEFAULT_SETTINGS = {
  group_name: 'Messengers of Peace Scout Group',
  group_description: "Building tomorrow's leaders through scouting values, community service, and the spirit of peace. Part of the Rwanda Scout Association.",
  whatsapp_contact: '+250 722 784 670',
  phone_contact: '+250 786 188 913',
  email_contact: 'info@mopscouts.rw',
  meeting_day: 'Sunday',
  meeting_time: '13:30 - 16:30',
  meeting_location: 'Camp Kigali, Nyarugenge District, Kigali',
  facebook_url: '',
  twitter_url: '',
  instagram_url: '',
  // Support MOP page (empty = that way of giving is not shown).
  support_text: '',
  support_momo_number: '',
  support_momo_name: '',
  support_bank_name: '',
  support_bank_account: '',
  support_bank_holder: '',
}

// Loaded once per visit and shared by the Footer, Contact page and Home.
let request = null
const load = () => {
  if (!request) {
    request = api.get('/settings')
      .then(res => {
        const data = res.data?.data && typeof res.data.data === 'object' ? res.data.data : {}
        const merged = { ...DEFAULT_SETTINGS }
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' && value.trim()) merged[key] = value.trim()
        }
        return merged
      })
      .catch(() => { request = null; return DEFAULT_SETTINGS })
  }
  return request
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  useEffect(() => {
    let alive = true
    load().then(s => { if (alive) setSettings(s) })
    return () => { alive = false }
  }, [])
  return settings
}

// "+250 722 784 670" -> "https://wa.me/250722784670"
export const whatsappLink = (number) => 'https://wa.me/' + String(number || '').replace(/\D/g, '')

// "+250 786 188 913" -> "tel:+250786188913"
export const phoneLink = (number) => 'tel:' + String(number || '').replace(/[^\d+]/g, '')

// Only real web addresses are used as social links.
export const isWebLink = (url) => /^https?:\/\/\S+$/i.test(String(url || ''))
