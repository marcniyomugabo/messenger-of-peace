import { Container, Row, Col } from 'react-bootstrap'
import { FiTarget, FiBookOpen, FiHeart, FiStar, FiCheckCircle } from 'react-icons/fi'

export default function Units() {
  const units = [
    {
      name: 'Abatoni',
      ageRange: '6 - 12 years',
      color: '#6B21A8',
      icon: '🏕️',
      desc: 'The youngest section of our scout group. Abatoni provides a fun and nurturing environment where children learn the basics of scouting through games, songs, nature walks, and simple community activities.',
      activities: [
        'Nature exploration and environmental games',
        'Basic first aid and safety awareness',
        'Storytelling and scouting songs',
        'Simple craft and art projects',
        'Introduction to the Scout Promise',
        'Fun outdoor activities and picnics',
      ],
    },
    {
      name: 'Inkesha',
      ageRange: '13 - 16 years',
      color: '#1D4ED8',
      icon: '🧭',
      desc: 'The scout section where young people begin to develop real scouting skills. Inkesha focuses on teamwork, outdoor survival, and community engagement under the guidance of experienced leaders.',
      activities: [
        'Camping and outdoor survival skills',
        'First aid training and emergency response',
        'Community service projects',
        'Map reading and compass navigation',
        'Environmental conservation activities',
        'Inter-patrol competitions and challenges',
      ],
    },
    {
      name: 'Abahizi',
      ageRange: '17 - 20 years',
      color: '#15803D',
      icon: '🤝',
      desc: 'The companion section where young leaders take on real challenges. Abahizi focuses on leadership development, project management, and making a measurable difference in the community.',
      activities: [
        'Leadership and project management training',
        'Community impact projects',
        'Advanced first aid and rescue skills',
        'Peer mentoring and youth empowerment',
        'Scout advancement and badge earning',
        'Regional and national scouting events',
      ],
    },
    {
      name: 'Ingenzi',
      ageRange: '21 - 25 years',
      color: '#6B21A8',
      icon: '🌟',
      desc: 'The rover section for young adults who lead by example. Ingenzi members serve as mentors and role models, driving scouting initiatives and community development projects.',
      activities: [
        'Mentoring younger scout units',
        'Community development projects',
        'Advanced leadership and life skills',
        'Event planning and coordination',
        'Public speaking and advocacy',
        'National and international scout events',
      ],
    },
  ]

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
              Four specialized units designed for different age groups, each offering
              unique programs and growth opportunities
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          {units.map((unit, idx) => (
            <Row
              key={idx}
              className={`align-items-center g-5 mb-5 ${idx % 2 !== 0 ? 'flex-row-reverse' : ''}`}
            >
              <Col lg={6}>
                <div className="p-4 rounded-4 h-100 animate-text-reveal" style={{ background: '#f8f5ff', borderLeft: `5px solid ${unit.color}` }}>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span style={{ fontSize: '2.5rem' }}>{unit.icon}</span>
                    <div>
                      <h2 className="mb-0 animate-section-title" style={{ color: unit.color }}>{unit.name}</h2>
                      <span className="badge" style={{ backgroundColor: unit.color }}>
                        Ages {unit.ageRange}
                      </span>
                    </div>
                  </div>
                  <p>{unit.desc}</p>
                </div>
              </Col>
              <Col lg={6}>
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
              </Col>
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
          <a href="/join-us" className="btn btn-light btn-lg fw-semibold px-5">
            Apply Now
          </a>
        </Container>
      </section>
    </div>
  )
}
