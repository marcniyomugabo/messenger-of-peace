import { Container, Row, Col } from 'react-bootstrap'

export default function Leadership() {
  const chiefDeGroupe = {
    name: 'Nshimiyimana Jackson',
    role: 'Chief of Groupe',
    image: '/images/leaders/board/chief.jpeg',
    desc: 'Leading the Messengers of Peace Scout Group with dedication and vision. Overseeing all group activities and ensuring the achievement of scouting objectives.',
  }

  const leaders = [
    { name: 'Nkusi Jeanette', role: 'Deputy Chief', unit: 'All Units', image: '/images/leaders/board/deputy.PNG', desc: 'Supporting the Chief of Groupe in managing group operations and coordinating between units.' },
    { name: 'Iradukunda Cyusa Samillah', role: 'Secretary', unit: 'Administration', image: '/images/leaders/board/secretary.PNG', desc: 'Managing group communications, records, and organizational documentation.' },
    { name: 'Sugira Cammille', role: 'Deputy Secretary', unit: 'Administration', image: '/images/leaders/board/deputy-secretary.PNG', desc: 'Assisting the secretary in managing administrative tasks and documentation.' },
    { name: 'Musinga', role: 'Chief of Disciplinary', unit: 'Discipline', image: '/images/leaders/board/musinga.JPEG', desc: 'Leading disciplinary efforts across all units, ensuring scouts uphold the highest standards of conduct.' },
    { name: 'Uwineza Shella', role: 'Disciplinary', unit: 'Discipline', image: '/images/leaders/board/disciplinary-member.PNG', desc: 'Supporting disciplinary operations and maintaining order across the group.' },
    { name: 'Munezero Yakin', role: 'Logistics', unit: 'Logistics', image: '/images/leaders/board/logistics.PNG', desc: 'Managing equipment, supplies, and logistics for all scouting events and expeditions.' },
    { name: 'Wetu Ezekiel', role: 'Charge Spokesperson', unit: 'Communications', image: '/images/leaders/board/spokesperson-group.PNG', desc: 'Leading group communications and spokesperson operations, coordinating media relations and public representation.' },
    { name: 'Ihirwe Richess', role: 'Spokesperson', unit: 'Communications', image: '/images/leaders/board/spokesperson.PNG', desc: 'Representing the group publicly and managing communications with media and partners.' },
    { name: 'Uwabakurikiza Anitha', role: 'Social Affairs', unit: 'Social', image: '/images/leaders/board/socially.PNG', desc: 'Coordinating social activities and welfare programs for all group members.' },
    { name: 'Uwase Chanella', role: 'Formatrice', unit: 'Training', image: '/images/leaders/board/formatrice.PNG', desc: 'Developing and delivering training programs to build scout skills and leadership abilities.' },
    { name: 'Akijuru Belle Hervine', role: 'Board Member', unit: 'All Units', image: '/images/leaders/board/board1.PNG', desc: 'Supporting group governance and contributing to strategic planning and decision-making.' },
    { name: 'Kwizera Prince', role: 'Board Member', unit: 'All Units', image: '/images/leaders/board/board2.PNG', desc: 'Contributing to group leadership and ensuring the achievement of scouting goals.' },
  ]

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
                  <p className="small text-muted mb-1" style={{ color: 'var(--mop-secondary)' }}>
                    {leader.unit}
                  </p>
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
