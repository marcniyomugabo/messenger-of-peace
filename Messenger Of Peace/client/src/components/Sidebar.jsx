import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  FiGrid, FiMail, FiActivity, FiUsers, FiBookOpen, FiInfo,
  FiAward, FiImage, FiUserPlus, FiSettings, FiLogOut, FiHome, FiCheckSquare
} from 'react-icons/fi'

export default function Sidebar({ show, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    fetchUnreadMessages()
    const interval = setInterval(fetchUnreadMessages, 60000)
    return () => clearInterval(interval)
  }, [])

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

  const menuItems = [
    {
      section: 'Main'
    },
    {
      to: '/dashboard',
      icon: <FiGrid />,
      label: 'Dashboard',
      badge: 0,
    },
    {
      section: 'Communication'
    },
    {
      to: '/dashboard/messages',
      icon: <FiMail />,
      label: 'Contact Messages',
      badge: unreadMessages,
    },
    {
      section: 'Content Management'
    },
    {
      to: '/dashboard/activities',
      icon: <FiActivity />,
      label: 'Activities',
    },
    {
      to: '/dashboard/members',
      icon: <FiUsers />,
      label: 'Members',
    },
    {
      to: '/dashboard/library',
      icon: <FiBookOpen />,
      label: 'Library',
    },
    {
      to: '/dashboard/information',
      icon: <FiInfo />,
      label: 'Information',
    },
    {
      to: '/dashboard/board-members',
      icon: <FiAward />,
      label: 'Board Members',
    },
    {
      to: '/dashboard/gallery',
      icon: <FiImage />,
      label: 'Gallery',
    },
    {
      to: '/dashboard/join-requests',
      icon: <FiUserPlus />,
      label: 'Join Requests',
    },
    {
      to: '/dashboard/attendance',
      icon: <FiCheckSquare />,
      label: 'Attendance',
    },
    {
      section: 'System'
    },
    {
      to: '/dashboard/settings',
      icon: <FiSettings />,
      label: 'Settings',
    },
  ]

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
          <img src="/images/logo-transparent.png" alt="MOP Logo" className="logo-img mx-auto" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
          <h4>MOP Admin</h4>
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
                  <span className="ms-auto badge rounded-pill" style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
