import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiLogIn, FiUser } from 'react-icons/fi'
import api from '../services/api'

// Used only if the menu cannot be loaded from the server (dashboard: Navigation) or is empty.
const FALLBACK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/news', label: 'News' },
  { to: '/units', label: 'Units' },
  { to: '/activities', label: 'Activities' },
  { to: '/portfolio', label: 'Library' },
  { to: '/information', label: 'Information' },
  { to: '/leadership', label: 'Board Members' },
  { to: '/members', label: 'Members' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/report-concern', label: 'Report a Concern' },
]

const isPage = url => /^\/(?!\/)/.test(url)
const isWeb = url => /^https?:\/\/\S+$/i.test(url)

// Loaded once per visit. Only top-level items are shown: the menu has no drop-downs.
let menuRequest = null
const loadMenu = () => {
  if (!menuRequest) {
    menuRequest = api.get('/navigation')
      .then(res => (Array.isArray(res.data?.data) ? res.data.data : [])
        .filter(item => item.label && (isPage(item.url) || isWeb(item.url)))
        .map(item => ({ to: item.url, label: item.label, newTab: !!item.opens_new_tab })))
      .catch(() => { menuRequest = null; return [] })
  }
  return menuRequest
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { token } = useAuth()
  const [navLinks, setNavLinks] = useState(FALLBACK_LINKS)

  useEffect(() => {
    let alive = true
    loadMenu().then(links => { if (alive && links.length) setNavLinks(links) })
    return () => { alive = false }
  }, [])

  return (
    <header className="mop-header">
      <div className="mop-header-inner">
        {/* MOP Logo — Far Left */}
        <Link to="/" className="mop-header-logo-link">
          <img src="/images/logo-badge.png" alt="Messengers of Peace" className="mop-header-logo" />
        </Link>

        {/* Navigation — Centered */}
        <nav className={`mop-header-nav ${menuOpen ? 'open' : ''}`}>
          <ul className="mop-header-nav-list">
            {navLinks.map((link, idx) => (
              <li key={idx}>
                {isPage(link.to) ? (
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) => isActive ? 'active' : ''}
                    onClick={() => setMenuOpen(false)}
                    {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </NavLink>
                ) : (
                  <a
                    href={link.to}
                    onClick={() => setMenuOpen(false)}
                    {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Right Side: Join Us + Login + Rwanda Scout Logo */}
        <div className="mop-header-right">
          <Link to="/join-us" className="mop-header-cta" onClick={() => setMenuOpen(false)}>
            Join Us
          </Link>
          {token ? (
            <Link to="/dashboard" className="mop-header-login" onClick={() => setMenuOpen(false)}>
              <FiUser size={17} />
            </Link>
          ) : (
            <Link to="/login" className="mop-header-login" onClick={() => setMenuOpen(false)}>
              <FiLogIn size={17} />
            </Link>
          )}
          <img src="/images/scout.JPEG" alt="Rwanda Scout Association" className="mop-header-scout-logo" />
        </div>

        {/* Mobile Hamburger */}
        <button
          className={`mop-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}
