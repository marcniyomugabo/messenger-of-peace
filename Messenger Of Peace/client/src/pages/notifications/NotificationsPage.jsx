import { useState, useEffect, useCallback } from 'react'
import { Button, Badge, Row, Col } from 'react-bootstrap'
import { FiUserPlus, FiDollarSign, FiUsers, FiFileText, FiSettings, FiAlertTriangle, FiBell, FiCheck, FiTrash2, FiFilter } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const TYPE_CONFIG = {
  application: { icon: FiUserPlus, color: '#7C3AED', label: 'Application' },
  payment: { icon: FiDollarSign, color: '#059669', label: 'Payment' },
  member: { icon: FiUsers, color: '#2563EB', label: 'Member' },
  content: { icon: FiFileText, color: '#D97706', label: 'Content' },
  system: { icon: FiSettings, color: '#6B7280', label: 'System' },
  alert: { icon: FiAlertTriangle, color: '#DC2626', label: 'Alert' },
}

const FILTERS = ['all', 'unread', 'read']

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.data?.notifications || res.data.data || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.data?.count || res.data.count || 0)
    } catch {
      // keep defaults
    }
  }, [])

  useEffect(() => { fetchNotifications(); fetchUnreadCount() }, [fetchNotifications, fetchUnreadCount])

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => {
        const removed = notifications.find(n => n.id === id)
        return removed && !removed.is_read ? Math.max(0, prev - 1) : prev
      })
    } catch {
      toast.error('Failed to delete')
    }
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const now = new Date()
    const then = new Date(dateStr)
    const seconds = Math.floor((now - then) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  const getNotificationIcon = (type) => {
    const config = TYPE_CONFIG[type?.toLowerCase()] || TYPE_CONFIG.system
    const Icon = config.icon
    return (
      <div
        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 42, height: 42, background: `${config.color}15`, color: config.color }}
      >
        <Icon size={20} />
      </div>
    )
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
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

      <div className="mop-card p-3 mb-4">
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

      <div className="mop-card">
        {filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FiBell size={40} className="mb-3" style={{ color: '#D1D5DB' }} />
            <p className="mb-0">No notifications to display</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className="d-flex align-items-start gap-3 p-3 border-bottom"
              style={{
                background: n.is_read ? 'transparent' : '#F5F3FF',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onClick={() => { if (!n.is_read) markAsRead(n.id) }}
              onMouseEnter={(e) => e.currentTarget.style.background = n.is_read ? '#F9FAFB' : '#EDE9FE'}
              onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : '#F5F3FF'}
            >
              {getNotificationIcon(n.type)}

              <div className="flex-grow-1 min-width-0">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.9rem' }}>{n.title || 'Notification'}</h6>
                    {!n.is_read && (
                      <div className="rounded-circle" style={{ width: 8, height: 8, background: '#7C3AED', flexShrink: 0 }} />
                    )}
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted">{timeAgo(n.created_at)}</small>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-danger"
                      style={{ fontSize: '0.8rem' }}
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                    >
                      <FiTrash2 size={14} />
                    </Button>
                  </div>
                </div>
                <p className="mb-0 text-muted small mt-1">{n.message || n.body || ''}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
