import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import api from '../../services/api'

// Shown when a leader has no photo (or no photo consent).
const NO_PHOTO = '/images/logo-small.png'

export default function Leadership() {
  // Board members come from the dashboard (Board Members), in their website order;
  // the first one (the Chief) is shown large above the others.
  const [people, setPeople] = useState([])

  useEffect(() => {
    api.get('/leadership')
      .then(res => setPeople((res.data.data || []).map(l => ({
        name: (l.member_name || '').trim(),
        role: l.position,
        unit: l.unit_name || '',
        image: l.member_photo || NO_PHOTO,
        desc: l.description || '',
      }))))
      .catch(() => setPeople([]))
  }, [])

  const [chiefDeGroupe, ...leaders] = people

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg6.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Our Board Members</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Dedicated leaders guiding our scouts towards excellence
            </p>
          </div>
        </Container>
      </section>

      {/* Chief of Groupe */}
      {chiefDeGroupe && (
      <section className="py-5">
        <Container>
          <Row className="justify-content-center">
            <Col lg={6}>
              <div className="leader-card p-4 animate-scale-in">
                <div className="leader-avatar animate-icon" style={{ overflow: 'hidden' }}>
                  <img
                    src={chiefDeGroupe.image}
                    alt={chiefDeGroupe.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                </div>
                <h3 style={{ color: 'var(--mop-primary)' }}>{chiefDeGroupe.name}</h3>
                <span className="badge badge-mop mb-3 fs-6">{chiefDeGroupe.role}</span>
                <p className="text-muted">{chiefDeGroupe.desc}</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      )}

      {/* Board Members */}
      <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <h2 className="section-title text-center mb-2 animate-section-title">Board Members</h2>
          <p className="section-subtitle text-center mx-auto mb-5 animate-section-subtitle">
            The team that makes our scouting programs possible
          </p>
          <Row className="g-4 animate-row">
            {leaders.map((leader, idx) => (
              <Col lg={4} md={6} key={idx} className="animate-card">
                <div className="leader-card h-100">
                  <div className="leader-avatar" style={{ overflow: 'hidden' }}>
                    <img
                      src={leader.image}
                      alt={leader.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  </div>
                  <h5 style={{ color: 'var(--mop-primary)' }}>{leader.name}</h5>
                  <span className="badge badge-mop mb-2">{leader.role}</span>
                  {leader.unit && (
                    <p className="small text-muted mb-1" style={{ color: 'var(--mop-secondary)' }}>
                      {leader.unit}
                    </p>
                  )}
                  <p className="text-muted small mb-0">{leader.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>
    </div>
  )
}
