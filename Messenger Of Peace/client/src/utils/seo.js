import { useEffect } from 'react'
import api from '../services/api'

// Page titles and descriptions for search engines and link previews.
// Each public page has a sensible default; Dashboard > SEO can replace any of them.
export const SITE_NAME = 'Messengers of Peace Scout Group'

export const SEO_PAGES = {
  home: { path: '/', title: SITE_NAME, description: 'Messengers of Peace is a scout group in Kigali, Rwanda, part of the Rwanda Scouts Association. We build leaders through scouting, community service and peace education.' },
  about: { path: '/about', title: 'About Us', description: 'Our history, mission and values: how Messengers of Peace helps young people grow as leaders and peacemakers.' },
  units: { path: '/units', title: 'Our Units', description: 'Abatoni, Inkesha, Abahizi and Ingenzi: the age groups of Messengers of Peace, from young children to rovers.' },
  news: { path: '/news', title: 'News', description: 'The latest stories and news from Messengers of Peace Scout Group.' },
  events: { path: '/events', title: 'Events', description: 'Upcoming and past camps, meetings and activities of Messengers of Peace Scout Group.' },
  activities: { path: '/activities', title: 'Activities', description: 'Community service, camps, training and other activities of our scouts.' },
  library: { path: '/portfolio', title: 'Library', description: 'Free scouting guides, training manuals and presentations to read and download.' },
  information: { path: '/information', title: 'Information Center', description: 'Scouting handbooks, policies and official documents of Messengers of Peace.' },
  gallery: { path: '/gallery', title: 'Gallery', description: 'Photos from our meetings, camps and community activities.' },
  leadership: { path: '/leadership', title: 'Board Members', description: 'The leaders who guide Messengers of Peace Scout Group.' },
  members: { path: '/members', title: 'Members', description: 'Meet the scouts of Messengers of Peace.' },
  'join-us': { path: '/join-us', title: 'Join Us', description: 'Apply to join Messengers of Peace Scout Group: choose your unit and send your application online.' },
  contact: { path: '/contact', title: 'Contact Us', description: 'Get in touch with Messengers of Peace: phone, WhatsApp, email and meeting place.' },
  support: { path: '/support', title: 'Support Us', description: 'Help Messengers of Peace with a donation, materials or your time.' },
  'report-concern': { path: '/report-concern', title: 'Report a Concern', description: 'Report a safety or safeguarding concern to the group\'s leaders, confidentially.' },
}
const slugForPath = (pathname) => {
  if (pathname.startsWith('/news/')) return null // a story sets its own title
  return Object.keys(SEO_PAGES).find(k => SEO_PAGES[k].path === pathname) || null
}

let saved = null // settings from the dashboard, loaded once
const loadSaved = () => {
  if (!saved) {
    saved = api.get('/seo/public')
      .then(res => Object.fromEntries((res.data.data || []).map(r => [r.page_slug, r])))
      .catch(() => ({}))
  }
  return saved
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el) }
  el.setAttribute('href', href)
}
const absolute = (url) => (url ? new URL(url, window.location.origin).href : '')

// Applies the title, description and link-preview tags of the current public page.
export function usePageSeo(pathname) {
  useEffect(() => {
    const slug = slugForPath(pathname)
    if (!slug) return
    let alive = true
    loadSaved().then(all => {
      if (!alive) return
      const base = SEO_PAGES[slug]
      const s = all[slug] || {}
      const title = s.title || (slug === 'home' ? base.title : `${base.title} | ${SITE_NAME}`)
      const description = s.description || base.description
      document.title = title
      setMeta('name', 'description', description)
      setMeta('name', 'keywords', s.keywords || '')
      setMeta('property', 'og:title', title)
      setMeta('property', 'og:description', description)
      setMeta('property', 'og:type', 'website')
      setMeta('property', 'og:site_name', SITE_NAME)
      setMeta('property', 'og:image', absolute(s.og_image || '/images/logo-badge.png'))
      const canonical = s.canonical_url || window.location.origin + pathname
      setMeta('property', 'og:url', canonical)
      setCanonical(canonical)
    })
    return () => { alive = false }
  }, [pathname])
}
