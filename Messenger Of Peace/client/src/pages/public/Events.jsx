import { useState, useEffect } from 'react'
import { Container, Row, Col, Badge, Spinner } from 'react-bootstrap'
import { FiClock, FiMapPin } from 'react-icons/fi'
import api from '../../services/api'
import { eventWhen, dayBlock } from '../../utils/events'

// Events from the dashboard (Events). Drafts are never shown; registration comes later.
function EventCard({ e, past }) {
  const b = dayBlock(e.start_date)
  return (
    <div className="d-flex gap-3 p-3 rounded-4 bg-white shadow-sm h-100" style={past ? { opacity: 0.8 } : undefined}>
      <div className="text-center flex-shrink-0 rounded-3 text-white d-flex flex-column justify-content-center"
        style={{ width: 64, height: 68, background: past ? '#6B7280' : 'var(--mop-primary)' }}>
        <div className="fs-4 fw-bold lh-1">{b.day}</div>
        <div className="small">{b.month}</div>
      </div>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="d-flex flex-wrap gap-1 mb-1">
          {e.category && <Badge bg="primary">{e.category}</Badge>}
          {e.status === 'Cancelled' && <Badge bg="danger">Cancelled</Badge>}
          {e.status === 'Ongoing' && <Badge bg="info">Happening now</Badge>}
        </div>
        <h5 className="mb-1" style={e.status === 'Cancelled' ? { textDecoration: 'line-through' } : undefined}>{e.title}</h5>
        <div className="small text-muted"><FiClock className="me-1" />{eventWhen(e.start_date, e.end_date)}</div>
        {e.venue && <div className="small text-muted"><FiMapPin className="me-1" />{e.venue}</div>}
        {e.description && <p className="small mt-2 mb-0" style={{ whiteSpace: 'pre-line' }}>{e.description}</p>}
      </div>
    </div>
  )
}

export default function Events() {
  const [upcoming, setUpcoming] = useState([])
  const [past, setPast] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/events', { params: { when: 'upcoming' } }).catch(() => null),
      api.get('/events', { params: { when: 'past', limit: 12 } }).catch(() => null),
    ]).then(([u, p]) => {
      setUpcoming(Array.isArray(u?.data?.data) ? u.data.data : [])
      setPast(Array.isArray(p?.data?.data) ? p.data.data : [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '3.5rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Events</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Meetings, camps, trainings and celebrations of Messengers of Peace
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5" style={{ background: 'var(--mop-bg)' }}>
        <Container>
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <>
              <h3 className="section-title mb-4">Upcoming events</h3>
              {upcoming.length === 0
                ? <p className="text-muted">No upcoming events are planned yet. Our regular meeting is every Sunday — see Contact Us.</p>
                : <Row className="g-3">{upcoming.map(e => <Col lg={6} key={e.id}><EventCard e={e} /></Col>)}</Row>}

              {past.length > 0 && (
                <>
                  <h4 className="mt-5 mb-3 text-muted">Past events</h4>
                  <Row className="g-3">{past.map(e => <Col lg={6} key={e.id}><EventCard e={e} past /></Col>)}</Row>
                </>
              )}
            </>
          )}
        </Container>
      </section>
    </div>
  )
}
