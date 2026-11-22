import { useState, useEffect, useCallback, useRef, forwardRef } from 'react'
import { Dropdown } from 'react-bootstrap'
import { useNavigate, Link } from 'react-router-dom'
import { FiBell, FiCheck } from 'react-icons/fi'
import api from '../services/api'
import {
  NotificationIcon, isUnread, timeAgo, badgeText,
  announceUnreadCount, onNotificationsChanged, announceNotificationsChanged,
} from '../utils/notifications'

const REFRESH_MS = 30000
const PANEL_SIZE = 8

// The bell button (Dropdown needs a component that forwards its ref and click).
const BellButton = forwardRef(({ onClick, count }, ref) => (
  <button
    ref={ref}
    type="button"
    className="btn btn-link text-dark position-relative mop-bell-btn"
    onClick={(e) => { e.preventDefault(); onClick(e) }}
    aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    title="Notifications"
  >
    <FiBell size={20} />
    {count > 0 && (
      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger mop-bell-count">
        {badgeText(count)}
      </span>
    )}
  </button>
))

export default function NotificationBell() {
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const openRef = useRef(false)

  const loadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      const n = res.data.data?.count || 0
      setCount(n)
      announceUnreadCount(n)
    } catch {
      // keep the last number (e.g. while offline)
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications', { params: { limit: PANEL_SIZE } })
      setItems(res.data.data?.notifications || [])
      const n = res.data.data?.unread_count || 0
      setCount(n)
      announceUnreadCount(n)
    } catch {
      // keep what is shown
    } finally {
      setLoading(false)
    }
  }, [])

  // Ask every 30 seconds while the tab is visible, and right away when the visitor comes back.
  useEffect(() => {
    loadCount()
    const tick = () => { if (document.visibilityState === 'visible') (openRef.current ? loadItems : loadCount)() }
    const timer = setInterval(tick, REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') loadCount() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const stop = onNotificationsChanged(() => (openRef.current ? loadItems() : loadCount()))
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      stop()
    }
  }, [loadCount, loadItems])

  const toggle = (next) => {
    setOpen(next)
    openRef.current = next
    if (next) loadItems()
  }

  const openNotification = async (n) => {
    toggle(false)
    if (isUnread(n)) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: 1 } : x)))
      setCount(c => { const left = Math.max(0, c - 1); announceUnreadCount(left); return left })
      try {
        await api.patch(`/notifications/${n.id}/read`)
      } catch {
        // shown as read here; the next refresh corrects it if the server did not save it
      }
      announceNotificationsChanged()
    }
    navigate(n.link || '/dashboard/notifications')
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setItems(prev => prev.map(x => ({ ...x, is_read: 1 })))
      setCount(0)
      announceUnreadCount(0)
      announceNotificationsChanged()
    } catch {
      // nothing changed; the visitor can try again
    }
  }

  return (
    <Dropdown show={open} onToggle={toggle} align="end">
      <Dropdown.Toggle as={BellButton} count={count} />
      <Dropdown.Menu className="mop-bell-menu p-0 shadow border-0">
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <strong className="small">Notifications</strong>
          {count > 0 && (
            <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={markAllRead}>
              <FiCheck className="me-1" />Mark all as read
            </button>
          )}
        </div>

        <div className="mop-bell-list">
          {items.length === 0 ? (
            <div className="text-center text-muted small py-4 px-3">
              {loading ? 'Loading…' : (<><FiBell size={28} className="mb-2 d-block mx-auto opacity-50" />You're all caught up</>)}
            </div>
          ) : items.map(n => (
            <button
              key={n.id}
              type="button"
              className={`mop-bell-item ${isUnread(n) ? 'unread' : ''}`}
              onClick={() => openNotification(n)}
            >
              <NotificationIcon notification={n} size={36} />
              <span className="mop-bell-text">
                <span className="mop-bell-title">{n.title || 'Notification'}</span>
                <span className="mop-bell-message">{n.message}</span>
                <span className="mop-bell-time">{timeAgo(n.created_at)}</span>
              </span>
              {isUnread(n) && <span className="mop-bell-dot" aria-label="Unread" />}
            </button>
          ))}
        </div>

        <Link to="/dashboard/notifications" className="d-block text-center small fw-semibold py-2 border-top text-decoration-none" onClick={() => toggle(false)}>
          See all notifications
        </Link>
      </Dropdown.Menu>
    </Dropdown>
  )
}
