import { Container, Row, Col, Spinner } from 'react-bootstrap'
import { FiTarget, FiCheckCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useUnits } from '../../utils/units'

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

export default function Units() {
  // Units, their ages, descriptions and activities are managed in the dashboard (Units).
  const { units, loaded } = useUnits()
  const count = COUNT_WORDS[units.length] || String(units.length)

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg5.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Our Units</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              {count} specialized {units.length === 1 ? 'unit' : 'units'} designed for different age groups, each offering
              unique programs and growth opportunities
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          {!loaded && (
            <div className="text-center py-5"><Spinner animation="border" style={{ color: '#6B21A8' }} /></div>
          )}
          {loaded && units.map((unit, idx) => (
            <Row
              key={unit.id}
              className={`align-items-center g-4 g-lg-5 mb-5 ${idx % 2 !== 0 ? 'flex-row-reverse' : ''}`}
            >
              <Col lg={6}>
                <div className="p-4 rounded-4 h-100 animate-text-reveal" style={{ background: '#f8f5ff', borderLeft: `5px solid ${unit.color}` }}>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span style={{ fontSize: '2.5rem' }}>{unit.icon}</span>
                    <div>
                      <h2 className="mb-0 animate-section-title" style={{ color: unit.color }}>{unit.name}</h2>
                      {unit.english && <div className="small fw-semibold" style={{ color: unit.color }}>{unit.english}</div>}
                      {unit.ageRange && (
                        <span className="badge" style={{ backgroundColor: unit.color }}>
                          Ages {unit.ageRange}
                        </span>
                      )}
                    </div>
                  </div>
                  <p>{unit.desc}</p>
                </div>
              </Col>
              {unit.activities.length > 0 && <Col lg={6}>
                <div className="p-4 rounded-4 bg-white shadow-sm animate-fade-up">
                  <h5 style={{ color: unit.color }} className="mb-3">
                    <FiTarget className="me-2" /> Activities & Programs
                  </h5>
                  <div className="d-flex flex-column gap-2">
                    {unit.activities.map((activity, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 animate-list-item">
                        <FiCheckCircle style={{ color: unit.color, flexShrink: 0 }} />
                        <span className="small">{activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Col>}
            </Row>
          ))}
        </Container>
      </section>

      {/* Join CTA */}
      <section className="py-5" style={{ background: 'linear-gradient(135deg, #6B21A8, #9333EA)' }}>
        <Container className="text-center">
          <h2 className="text-white mb-3 animate-section-title">Which Unit Is Right For You?</h2>
          <p className="text-white-50 mx-auto mb-4 animate-section-subtitle" style={{ maxWidth: 500 }}>
            Contact us and we will help you find the perfect unit based on your age and interests.
          </p>
          <Link to="/join-us" className="btn btn-light btn-lg fw-semibold px-5">
            Apply Now
          </Link>
        </Container>
      </section>
    </div>
  )
}
