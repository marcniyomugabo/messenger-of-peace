import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Badge } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiCheck, FiTrash2, FiChevronRight } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import {
  NotificationIcon, isUnread, timeAgo,
  announceNotificationsChanged, onNotificationsChanged, onUnreadCount,
} from '../../utils/notifications'

const FILTERS = ['all', 'unread', 'read']

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.data?.notifications || [])
      setUnreadCount(res.data.data?.unread_count || 0)
    } catch {
      // keep what is shown
    } finally {
      setLoading(false)
    }
  }, [])

  // Load now, and again whenever the bell reads or deletes something, or its regular
  // check finds a different unread number (a new notification arrived).
  const shownUnread = useRef(0)
  useEffect(() => { shownUnread.current = unreadCount }, [unreadCount])
  useEffect(() => {
    fetchNotifications()
    const stopChanged = onNotificationsChanged(fetchNotifications)
    const stopCount = onUnreadCount((n) => { if (n !== shownUnread.current) fetchNotifications() })
    return () => { stopChanged(); stopCount() }
  }, [fetchNotifications])

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n)))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      // the refresh below shows the real state
    }
    announceNotificationsChanged()
  }

  // Opening a notification marks it read and goes to the page it is about.
  const openNotification = async (n) => {
    if (isUnread(n)) await markAsRead(n.id)
    if (n.link) navigate(n.link)
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
      announceNotificationsChanged()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (n) => {
    try {
      await api.delete(`/notifications/${n.id}`)
      setNotifications(prev => prev.filter(x => x.id !== n.id))
      if (isUnread(n)) setUnreadCount(prev => Math.max(0, prev - 1))
      announceNotificationsChanged()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return isUnread(n)
    if (filter === 'read') return !isUnread(n)
    return true
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 className="mb-0 d-flex align-items-center">
          <FiBell className="me-2" /> Notifications
          {unreadCount > 0 && (
            <Badge bg="danger" pill className="ms-2" style={{ fontSize: '0.7rem' }}>{unreadCount}</Badge>
          )}
        </h4>
        {unreadCount > 0 && (
          <Button variant="outline-primary" size="sm" onClick={markAllRead}>
            <FiCheck className="me-1" /> Mark All Read
          </Button>
        )}
      </div>

      <div className="mop-card mop-card-static p-3 mb-4">
        <div className="d-flex gap-2">
          {FILTERS.map(f => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-capitalize"
            >
              {f === 'all' ? 'All' : f}
              {f === 'unread' && unreadCount > 0 && (
                <Badge bg="danger" pill className="ms-1" style={{ fontSize: '0.65rem' }}>{unreadCount}</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="mop-card mop-card-static">
        {loading ? (
          <div className="text-center py-5 text-muted">Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FiBell size={40} className="mb-3" style={{ color: '#D1D5DB' }} />
            <p className="mb-0">
              {filter === 'unread' ? "You're all caught up." : filter === 'read' ? 'No read notifications.' : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              className={`mop-notification-row d-flex align-items-start gap-3 p-3 border-bottom ${isUnread(n) ? 'unread' : ''}`}
              onClick={() => openNotification(n)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotification(n) } }}
              title={n.link ? 'Open' : (isUnread(n) ? 'Mark as read' : undefined)}
            >
              <NotificationIcon notification={n} size={42} />

              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <h6 className={`mb-0 ${isUnread(n) ? 'fw-bold' : 'fw-semibold'}`} style={{ fontSize: '0.9rem' }}>{n.title || 'Notification'}</h6>
                    {isUnread(n) && (
                      <span className="rounded-circle" style={{ width: 8, height: 8, background: 'var(--mop-primary)', flexShrink: 0 }} aria-label="Unread" />
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <small className="text-muted">{timeAgo(n.created_at)}</small>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-danger"
                      style={{ fontSize: '0.8rem' }}
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n) }}
                      aria-label="Delete notification"
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </Button>
                  </div>
                </div>
                <p className="mb-0 text-muted small mt-1">{n.message}</p>
              </div>

              {n.link && <FiChevronRight className="text-muted flex-shrink-0 align-self-center" aria-hidden="true" />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
