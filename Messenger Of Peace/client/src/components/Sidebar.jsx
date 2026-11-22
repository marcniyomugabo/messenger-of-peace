import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { onUnreadCount } from '../utils/notifications'
import { STAFF, PEOPLE, ATTENDANCE, LEADERS, CONTENT, FINANCE, ADMIN, SAFEGUARDING } from '../config/roles'
import {
  FiGrid, FiMail, FiActivity, FiUsers, FiBookOpen, FiInfo,
  FiAward, FiImage, FiUserPlus, FiSettings, FiLogOut, FiHome, FiCheckSquare,
  FiBell, FiCalendar, FiVolume2, FiLayers, FiLayout, FiFileText,
  FiMenu, FiSearch, FiFilm, FiDollarSign, FiCreditCard, FiBarChart2, FiList,
  FiUserCheck, FiShield, FiBook
} from 'react-icons/fi'

export default function Sidebar({ show, onClose }) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const canReadMessages = hasRole(...PEOPLE)

  // The bell in the top bar fetches the unread number and shares it here.
  useEffect(() => onUnreadCount(setUnreadNotifications), [])

  useEffect(() => {
    if (!canReadMessages) return
    fetchUnreadMessages()
    const interval = setInterval(fetchUnreadMessages, 60000)
    return () => clearInterval(interval)
  }, [canReadMessages])

  const fetchUnreadMessages = async () => {
    try {
      const res = await api.get('/contact-messages')
      const messages = res.data.data || res.data.messages || []
      const unread = Array.isArray(messages) ? messages.filter(m => m.status === 'Unread' || m.is_read === 0 || m.is_read === false).length : 0
      setUnreadMessages(unread)
    } catch {}
  }

  const handleLogout = (e) => {
    e.preventDefault()
    logout()
    navigate('/login')
  }

  // Each link lists the roles that may use the page (same groups as App.jsx).
  const sections = [
    {
      section: 'Main',
      items: [
        { to: '/dashboard', icon: <FiGrid />, label: 'Dashboard', roles: STAFF },
        { to: '/dashboard/notifications', icon: <FiBell />, label: 'Notifications', badge: unreadNotifications },
        { to: '/dashboard/notice-board', icon: <FiVolume2 />, label: 'Notice board' },
        // Only for logins linked to a member record (a scout); system accounts have no profile or attendance.
        { to: '/dashboard/my-profile', icon: <FiUsers />, label: 'My profile', show: !!user?.member },
        { to: '/dashboard/my-attendance', icon: <FiUserCheck />, label: 'My attendance', show: !!user?.member },
      ],
    },
    {
      section: 'People',
      items: [
        { to: '/dashboard/members', icon: <FiUsers />, label: 'Members', roles: PEOPLE },
        { to: '/dashboard/join-requests', icon: <FiUserPlus />, label: 'Join Requests', roles: PEOPLE },
        { to: '/dashboard/messages', icon: <FiMail />, label: 'Contact Messages', roles: PEOPLE, badge: unreadMessages },
        { to: '/dashboard/attendance', icon: <FiCheckSquare />, label: 'Attendance', roles: ATTENDANCE },
        { to: '/dashboard/events', icon: <FiCalendar />, label: 'Events', roles: PEOPLE },
        { to: '/dashboard/announcements', icon: <FiVolume2 />, label: 'Announcements', roles: PEOPLE },
        { to: '/dashboard/board-members', icon: <FiAward />, label: 'Board Members', roles: LEADERS },
        { to: '/dashboard/units', icon: <FiLayers />, label: 'Units', roles: LEADERS },
      ],
    },
    {
      section: 'Content',
      items: [
        { to: '/dashboard/library', icon: <FiBookOpen />, label: 'Library', roles: CONTENT },
        { to: '/dashboard/information', icon: <FiInfo />, label: 'Information', roles: CONTENT },
        { to: '/dashboard/gallery', icon: <FiImage />, label: 'Gallery', roles: CONTENT },
        { to: '/dashboard/media', icon: <FiFilm />, label: 'Media', roles: CONTENT },
        { to: '/dashboard/activities', icon: <FiActivity />, label: 'Activities', roles: LEADERS },
        { to: '/dashboard/news', icon: <FiFileText />, label: 'News', roles: CONTENT },
        { to: '/dashboard/home-content', icon: <FiLayout />, label: 'Home Page', roles: LEADERS },
        { to: '/dashboard/about-content', icon: <FiFileText />, label: 'About Page', roles: LEADERS },
        { to: '/dashboard/navigation', icon: <FiMenu />, label: 'Navigation', roles: LEADERS },
        { to: '/dashboard/seo', icon: <FiSearch />, label: 'SEO', roles: LEADERS },
      ],
    },
    {
      section: 'Finance',
      items: [
        { to: '/dashboard/contributions', icon: <FiDollarSign />, label: 'Contributions', roles: FINANCE },
        { to: '/dashboard/payments', icon: <FiCreditCard />, label: 'Payment History', roles: FINANCE },
        { to: '/dashboard/finance', icon: <FiBook />, label: 'Income & Expenses', roles: FINANCE },
      ],
    },
    {
      section: 'System',
      items: [
        { to: '/dashboard/reports', icon: <FiBarChart2 />, label: 'Reports', roles: LEADERS },
        { to: '/dashboard/concerns', icon: <FiShield />, label: 'Concerns', roles: SAFEGUARDING },
        { to: '/dashboard/audit-logs', icon: <FiList />, label: 'Audit Log', roles: LEADERS },
        { to: '/dashboard/users', icon: <FiUserCheck />, label: 'Users', roles: ADMIN },
        { to: '/dashboard/roles', icon: <FiShield />, label: 'Roles', roles: ADMIN },
        { to: '/dashboard/settings', icon: <FiSettings />, label: 'Settings', roles: ADMIN },
      ],
    },
  ]

  // Keep only the links this user's role may open, and drop sections left empty.
  const menuItems = sections.flatMap(({ section, items }) => {
    const visible = items.filter(item => (!item.roles || hasRole(...item.roles)) && item.show !== false)
    return visible.length ? [{ section }, ...visible] : []
  })

  return (
    <>
      {show && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1035 }}
          onClick={onClose}
        />
      )}
      <aside className={`mop-sidebar ${show ? 'show' : ''}`}>
        <div className="sidebar-header">
          <img src="/images/logo-badge.png" alt="MOP Logo" className="logo-img mx-auto" style={{ width: 52, height: 52 }} />
          {/* Leaders see "MOP Admin"; a member sees their own name. */}
          <h4>{hasRole(...STAFF) ? 'MOP Admin' : (user?.member ? `${user.member.first_name} ${user.member.last_name}` : 'My MOP')}</h4>
          <small className="opacity-75">{user?.email}</small>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => {
            if (item.section) {
              return (
                <div key={idx} className="sidebar-section">
                  {item.section}
                </div>
              )
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) => isActive ? 'active' : ''}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge > 0 && (
                  <span className="ms-auto badge rounded-pill" style={{ background: 'var(--mop-danger)', color: '#fff', fontSize: '0.65rem', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}

          <hr className="border-light border-opacity-25 mx-3 my-2" />

          <NavLink to="/" style={{ textDecoration: 'none' }}>
            <span className="nav-icon"><FiHome /></span>
            Back to Website
          </NavLink>

          <a href="/" onClick={handleLogout} style={{ textDecoration: 'none' }}>
            <span className="nav-icon"><FiLogOut /></span>
            Logout
          </a>
        </nav>
      </aside>
    </>
  )
}
