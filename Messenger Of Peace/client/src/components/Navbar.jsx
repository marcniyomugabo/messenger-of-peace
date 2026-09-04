import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiLogIn, FiUser } from 'react-icons/fi'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { token } = useAuth()

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About Us' },
    { to: '/activities', label: 'Activities' },
    { to: '/portfolio', label: 'Library' },
    { to: '/information', label: 'Information' },
    { to: '/leadership', label: 'Board Members' },
    { to: '/members', label: 'Members' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/contact', label: 'Contact Us' },
  ]

  return (
    <header className="mop-header">
      <div className="mop-header-inner">
        {/* MOP Logo — Far Left */}
        <Link to="/" className="mop-header-logo-link">
          <img src="/images/logo-transparent.png" alt="Messengers of Peace" className="mop-header-logo" />
        </Link>

        {/* Navigation — Centered */}
        <nav className={`mop-header-nav ${menuOpen ? 'open' : ''}`}>
          <ul className="mop-header-nav-list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
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
