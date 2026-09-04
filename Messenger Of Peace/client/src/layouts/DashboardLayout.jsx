import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { FiMenu, FiBell, FiUser, FiLogOut } from 'react-icons/fi'
import api from '../services/api'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, hasRole } = useAuth()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      const res = await api.get('/dashboard')
      const d = res.data.data
      const items = []
      if (d.applications?.pending > 0) {
        items.push({ text: `${d.applications.pending} pending application(s)`, type: 'warning' })
      }
      if (d.members?.applicants > 0) {
        items.push({ text: `${d.members.applicants} member applicant(s)`, type: 'info' })
      }
      setNotifications(items)
    } catch {
      // silent
    }
  }

  const getRoleBadge = () => {
    const role = user?.role
    const colors = {
      super_admin: 'danger',
      chief: 'primary',
      deputy_chief: 'info',
      secretary: 'success',
      treasurer: 'warning',
      unit_leader: 'info',
      media: 'secondary',
      member: 'light',
    }
    return colors[role] || 'secondary'
  }

  return (
    <div className="purple-theme">
      <Sidebar show={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="mop-dashboard-wrapper">
        <header className="mop-topbar">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-link text-dark d-lg-none"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu size={22} />
            </button>
            <h6 className="mb-0 d-none d-md-block text-muted">
              Welcome, <strong className="text-dark">{user?.email}</strong>
              {user?.role && (
                <span className={`badge bg-${getRoleBadge()} ms-2`} style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}>
                  {user.role}
                </span>
              )}
            </h6>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-link text-dark position-relative">
              <FiBell size={20} />
              {notifications.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.6rem' }}>
                  {notifications.length}
                </span>
              )}
            </button>

            <div className="dropdown">
              <button
                className="btn btn-link text-dark d-flex align-items-center gap-2 text-decoration-none dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                  style={{ width: 35, height: 35, fontSize: '0.85rem' }}>
                  <FiUser />
                </div>
                <span className="d-none d-sm-inline small">{user?.role}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><span className="dropdown-item-text small text-muted">{user?.email}</span></li>
                <li><span className="dropdown-item-text small"><span className={`badge bg-${getRoleBadge()}`}>{user?.role}</span></span></li>
                <li><hr className="dropdown-divider" /></li>
                {hasRole('super_admin', 'chief') && (
                  <li><a className="dropdown-item small" href="/dashboard/settings">Settings</a></li>
                )}
                <li><a className="dropdown-item small" href="/">Back to Website</a></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger d-flex align-items-center gap-2" onClick={logout}>
                    <FiLogOut /> Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {notifications.length > 0 && (
          <div className="px-4 pt-3">
            <div className="d-flex flex-wrap gap-2">
              {notifications.map((n, i) => (
                <span key={i} className={`badge bg-${n.type} d-flex align-items-center gap-1`} style={{ fontSize: '0.75rem' }}>
                  {n.text}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mop-dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
