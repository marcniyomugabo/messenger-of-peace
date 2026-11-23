import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge, Spinner } from 'react-bootstrap'
import { FiVolume2, FiAlertTriangle } from 'react-icons/fi'
import api from '../../services/api'

// Announcements for everyone signed in (what each person may see depends on their role).
export default function NoticeBoard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const { hash } = useLocation()

  useEffect(() => {
    api.get('/announcements/mine').then(res => setItems(res.data.data || [])).catch(() => setItems([])).finally(() => setLoading(false))
  }, [])

  // Opened from a notification: scroll to that announcement and mark it.
  useEffect(() => {
    if (loading || !hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('notice-focus') }
  }, [loading, hash])

  return (
    <div>
      <h4 className="mb-1 d-flex align-items-center"><FiVolume2 className="me-2" />Notice board</h4>
      <p className="text-muted mb-4">Announcements from the group's leaders.</p>
      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" size="sm" /></div>
      ) : items.length === 0 ? (
        <div className="mop-card mop-card-static p-5 text-center text-muted">No announcements at the moment.</div>
      ) : items.map(a => (
        <article key={a.id} id={`announcement-${a.id}`} className={`mop-card mop-card-static p-4 mb-3 notice ${a.priority === 'High' ? 'notice-high' : ''}`}>
          <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
            <h5 className="mb-0 d-flex align-items-center gap-2">
              {a.priority === 'High' && <FiAlertTriangle className="text-danger" title="Important" />}{a.title}
            </h5>
            <div className="d-flex gap-2 align-items-center">
              {a.priority === 'High' && <Badge bg="danger">Important</Badge>}
              {a.target_audience === 'Leaders' && <Badge bg="dark">Leaders only</Badge>}
              <small className="text-muted">{new Date(a.published_at || a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
            </div>
          </div>
          <div className="notice-content">{a.content}</div>
          {a.author_name && <small className="text-muted d-block mt-3">Posted by {a.author_name}</small>}
        </article>
      ))}
    </div>
  )
}
