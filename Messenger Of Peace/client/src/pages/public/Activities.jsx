import { useState, useEffect } from 'react'
import { Container, Row, Col, Badge, Spinner } from 'react-bootstrap'
import { FiCalendar, FiMapPin } from 'react-icons/fi'
import api from '../../services/api'

export default function Activities() {
  const [filter, setFilter] = useState('All')
  const [activities, setActivities] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const defaultActivities = [
    {
      title: 'Environmental Cleanup Campaign',
      start_date: '2026-08-10',
      location: 'Nyarugenge District',
      category: 'Community Service',
      description: 'Our scouts cleaned the streets and planted 200 trees across Nyarugenge as part of the Umuganda initiative.',
      status: 'Completed',
    },
    {
      title: 'First Aid Training Workshop',
      start_date: '2026-07-20',
      location: 'Camp Kigali',
      category: 'Training',
      description: 'Senior scouts learned life-saving first aid techniques from certified Red Cross instructors.',
      status: 'Completed',
    },
    {
      title: 'Annual Scout Camp',
      start_date: '2026-07-05',
      location: 'Camp Kigali',
      category: 'Camping',
      description: 'Three days of outdoor survival challenges, team building, campfire programs, and leadership exercises.',
      status: 'Completed',
    },
    {
      title: 'Inter-Group Competition',
      start_date: '2026-09-15',
      location: 'Kigali Arena',
      category: 'Competition',
      description: 'Annual scouting competition with groups from across Kigali featuring patrol challenges, first aid relay, and pioneering.',
      status: 'Upcoming',
    },
    {
      title: 'Peace Day Celebration',
      start_date: '2026-09-21',
      location: 'Camp Kigali',
      category: 'Ceremony',
      description: 'Celebrating International Day of Peace with a special ceremony, peace march, and community gathering.',
      status: 'Upcoming',
    },
    {
      title: 'Health Awareness Campaign',
      start_date: '2026-10-05',
      location: 'Nyarugenge District',
      category: 'Community Service',
      description: 'Scouts will visit local communities to share health awareness messages about hygiene, nutrition, and disease prevention.',
      status: 'Upcoming',
    },
    {
      title: 'Advanced Survival Skills Training',
      start_date: '2026-10-18',
      location: 'Camp Kigali',
      category: 'Training',
      description: 'Senior scouts will learn advanced camping techniques, knot tying, shelter building, and navigation.',
      status: 'Upcoming',
    },
    {
      title: 'Christmas Charity Drive',
      start_date: '2026-12-20',
      location: 'Various Locations',
      category: 'Community Service',
      description: 'Collecting and distributing gifts and essential items to vulnerable families during the holiday season.',
      status: 'Upcoming',
    },
  ]

  const defaultCategories = ['All', 'Community Service', 'Training', 'Camping', 'Competition', 'Ceremony']

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activitiesRes, categoriesRes] = await Promise.all([
          api.get('/activities').catch(() => null),
          api.get('/activities/categories').catch(() => null),
        ])

        if (activitiesRes?.data?.length) {
          setActivities(activitiesRes.data)
        } else {
          setActivities(defaultActivities)
        }

        if (categoriesRes?.data?.length) {
          setCategories(['All', ...categoriesRes.data])
        } else {
          setCategories(defaultCategories)
        }
      } catch {
        setActivities(defaultActivities)
        setCategories(defaultCategories)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const normalize = (item) => ({
    title: item.title,
    date: item.start_date ? formatDate(item.start_date) : (item.date || ''),
    location: item.location,
    category: item.category,
    desc: item.description || item.desc,
    status: item.status,
  })

  const normalized = activities.map(normalize)
  const mergedCategories = [...new Set([...categories, ...defaultCategories])]
  const filtered = filter === 'All' ? normalized : normalized.filter(a => a.category === filter)

  if (loading) {
    return (
      <div>
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

      <section className="py-5">
        <Container>
          {/* Filter */}
          <div className="d-flex flex-wrap gap-2 mb-4 justify-content-center animate-fade-up">
            {mergedCategories.map((cat) => (
              <button
                key={cat}
                className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <Row className="g-4 animate-row">
            {filtered.map((activity, idx) => (
              <Col lg={6} key={idx} className="animate-card">
                <div className="activity-card h-100">
                  <div className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge
                        className="mb-2"
                        bg={activity.status === 'Completed' ? 'success' : 'warning'}
                      >
                        {activity.status}
                      </Badge>
                      <Badge bg="secondary" className="mb-2">{activity.category}</Badge>
                    </div>
                    <h5>{activity.title}</h5>
                    <div className="d-flex gap-3 mb-2 text-muted small">
                      <span><FiCalendar className="me-1" />{activity.date}</span>
                      <span><FiMapPin className="me-1" />{activity.location}</span>
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
