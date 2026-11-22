import { useState, useEffect } from 'react'
import { Container, Row, Col, Badge, Spinner } from 'react-bootstrap'
import { FiCalendar, FiMapPin } from 'react-icons/fi'
import api from '../../services/api'
import { SAMPLE_ACTIVITIES, toActivity } from '../../utils/activities'

const STATUS_COLOR = { Completed: 'success', Upcoming: 'warning', 'Happening now': 'info' }

// Published activities from the dashboard (Activities), newest first. The sample activities
// are shown only while nothing has been published yet.
const samples = () => SAMPLE_ACTIVITIES.map(toActivity).sort((a, b) => b.start.localeCompare(a.start))

function Hero() {
  return (
    <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
      <div className="hero-slideshow">
        <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
        <div className="hero-slide" style={{ backgroundImage: "url('/images/bg4.jpeg')" }}></div>
        <div className="hero-slide" style={{ backgroundImage: "url('/images/bg5.jpeg')" }}></div>
      </div>
      <div className="hero-particles">
        <span></span><span></span><span></span>
        <span></span><span></span>
      </div>
      <Container>
        <div className="position-relative" style={{ zIndex: 2 }}>
          <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Activities & Events</h1>
          <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
            Our scouts are always active — here is a look at what we do
          </p>
        </div>
      </Container>
    </section>
  )
}

export default function Activities() {
  const [filter, setFilter] = useState('All')
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/activities', { params: { limit: 100 } })
      .then(res => {
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        setActivities(list.length > 0 ? list.map(toActivity) : samples())
      })
      .catch(() => setActivities(samples()))
      .finally(() => setLoading(false))
  }, [])

  // Filter buttons: the categories of the activities shown.
  const categories = ['All', ...new Set(activities.map(a => a.category).filter(Boolean))]
  const filtered = filter === 'All' ? activities : activities.filter(a => a.category === filter)

  if (loading) {
    return (
      <div>
        <Hero />
        <section className="py-5">
          <Container className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-muted">Loading activities...</p>
          </Container>
        </section>
      </div>
    )
  }

  return (
    <div>
      <Hero />

      <section className="py-5">
        <Container>
          {/* Filter */}
          {categories.length > 2 && (
            <div className="d-flex flex-wrap gap-2 mb-4 justify-content-center animate-fade-up">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <Row className="g-4 animate-row">
            {filtered.map((activity, idx) => (
              <Col lg={6} key={activity.id ?? idx} className="animate-card">
                <div className="activity-card h-100">
                  {activity.image && (
                    <div className="activity-image">
                      <img src={activity.image} alt={activity.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      {activity.status ? <Badge className="mb-2" bg={STATUS_COLOR[activity.status]}>{activity.status}</Badge> : <span />}
                      {activity.category && <Badge bg="secondary" className="mb-2">{activity.category}</Badge>}
                    </div>
                    <h5>{activity.title}</h5>
                    <div className="d-flex flex-wrap gap-3 mb-2 text-muted small">
                      {activity.date && <span><FiCalendar className="me-1" />{activity.date}</span>}
                      {activity.location && <span><FiMapPin className="me-1" />{activity.location}</span>}
                    </div>
                    <p className="text-muted mb-0">{activity.desc}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {filtered.length === 0 && (
            <div className="text-center py-5 text-muted">
              <p className="lead animate-text-reveal">No activities found for this category.</p>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}
