import { FiUserPlus, FiDollarSign, FiUsers, FiFileText, FiSettings, FiAlertTriangle, FiMail, FiInfo, FiVolume2 } from 'react-icons/fi'

// How each kind of notification looks (icon and colour), in the bell and on the page.
export const NOTIFICATION_TYPES = {
  application: { icon: FiUserPlus, color: '#7C3AED', label: 'Application' },
  alert: { icon: FiAlertTriangle, color: '#DC2626', label: 'Alert' },
  message: { icon: FiMail, color: '#0891B2', label: 'Message' },
  payment: { icon: FiDollarSign, color: '#059669', label: 'Payment' },
  member: { icon: FiUsers, color: '#2563EB', label: 'Member' },
  content: { icon: FiFileText, color: '#D97706', label: 'Content' },
  system: { icon: FiSettings, color: '#6B7280', label: 'System' },
  info: { icon: FiInfo, color: '#2563EB', label: 'Info' },
  announcement: { icon: FiVolume2, color: '#7C3AED', label: 'Announcement' },
}

// Older application alerts were saved as 'info' with the Join Requests link.
export function notificationType(n) {
  if (n?.type === 'info' && n?.link === '/dashboard/join-requests') return NOTIFICATION_TYPES.application
  return NOTIFICATION_TYPES[String(n?.type || '').toLowerCase()] || NOTIFICATION_TYPES.info
}

export function NotificationIcon({ notification, size = 40 }) {
  const t = notificationType(notification)
  const Icon = t.icon
  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: size, height: size, background: `${t.color}18`, color: t.color }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.45)} />
    </div>
  )
}

export const isUnread = (n) => !n.is_read || n.is_read === '0'

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// The bell, the sidebar and the Notifications page stay in step through two window events:
// "changed" (something was read or deleted: ask the server again) and "count" (the new number).
const CHANGED = 'mop:notifications-changed'
const COUNT = 'mop:notifications-count'

export const announceNotificationsChanged = () => window.dispatchEvent(new Event(CHANGED))
export const onNotificationsChanged = (fn) => {
  window.addEventListener(CHANGED, fn)
  return () => window.removeEventListener(CHANGED, fn)
}
export const announceUnreadCount = (count) => window.dispatchEvent(new CustomEvent(COUNT, { detail: count }))
export const onUnreadCount = (fn) => {
  const handler = (e) => fn(e.detail)
  window.addEventListener(COUNT, handler)
  return () => window.removeEventListener(COUNT, handler)
}

export const badgeText = (count) => (count > 9 ? '9+' : String(count))
