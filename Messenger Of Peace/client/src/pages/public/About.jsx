import { Container, Row, Col, Card, Badge } from 'react-bootstrap'
import { FiTarget, FiHeart, FiEye, FiStar, FiCheckCircle, FiUsers, FiBookOpen, FiMapPin, FiCalendar, FiPhone, FiFlag, FiActivity, FiDownload } from 'react-icons/fi'

export default function About() {
  const values = [
    { title: 'Kwicisha Bugufi', en: 'Humility', desc: 'Kudakirita n\'ubwitonzi mu byo ukora vyose. Being humble in all we do, serving with a humble heart.' },
    { title: 'Kubahiriza igihe', en: 'Punctuality', desc: 'Kwita ku masaha mu bitaramo, inama n\'imyitozo. Respecting time and being reliable in every commitment.' },
    { title: 'Kwiyubaha no kubaha Imana', en: 'Respect & Faith', desc: 'Kuguha agaciro ubwawe n\'imyemerere. Honoring God and showing respect to all people.' },
    { title: 'Gukorera hamwe n\'Urukundo', en: 'Love & Teamwork', desc: 'Unité n\'ubatabazi muri twe. Working together with love and compassion for one another.' },
    { title: 'Isuku', en: 'Cleanliness', desc: 'Isuku y\'umubiri, ku myambarire n\'aho dukorera. Maintaining hygiene and cleanliness in mind, body, and environment.' },
  ]

  const objectives = [
    'Train youth in scouting skills and leadership',
    'Promote peace, tolerance, and understanding among young people',
    'Develop community service and environmental conservation awareness',
    'Provide first aid, survival, and outdoor skills training',
    'Foster patriotism and love for Rwanda',
    'Build character through the Scout Law and Promise',
    'Encourage academic excellence alongside scouting activities',
    'Prepare young people to be responsible citizens',
  ]

  const childBenefits = [
    'Gaining knowledge and skills to be self-reliant',
    'Following national programs and opportunities for youth',
    'Creating opportunities to learn and grow in life',
  ]

  const parentBenefits = [
    'Having a well-mannered child with good character and Rwandan culture',
    'Instilling good behavior and respect for God (respecting each person\'s beliefs)',
    'Good cooperation between parents and educators in monitoring the child',
  ]

  const annualGoals = [
    { title: 'Saving Account', desc: 'Opening savings bank accounts (to help in emergencies for the group).', icon: <FiTarget /> },
    { title: 'Scout Uniforms', desc: 'Getting proper uniforms for all members.', icon: <FiUsers /> },
    { title: 'Member Visits', desc: 'Setting up a program to visit and support members in the group and in daily life.', icon: <FiHeart /> },
    { title: 'Community Service', desc: 'Organizing community service (Umuganda) at national level in known and nearby locations.', icon: <FiActivity /> },
    { title: 'Group Identity', desc: 'Having three (3) flags representing Messengers of Peace Scout Group by December.', icon: <FiFlag /> },
  ]

  const annualActivities = [
    'Visiting and helping patients in hospitals and homes',
    'Visiting and supporting vulnerable people in the community',
  ]

  return (
    <div>
      {/* Hero */}
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg2.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>About Us</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Learn about our history, mission, and the values that guide us as Messengers of Peace
            </p>
          </div>
        </Container>
      </section>

      {/* I. ICYO MESSENGERS OF PEACE ARI CYO N'IYO UGAMIJE */}
      <section className="py-5">
        <Container>
          <Row className="align-items-center g-5">
            <Col lg={7}>
              <Badge bg="primary" className="mb-3 px-3 py-2">Section I</Badge>
              <h2 className="section-title animate-section-title">Messengers of Peace</h2>
              <p className="lead" style={{ color: '#6B21A8' }}>Who We Are & What We Aim To Be</p>
              <p className="animate-text-reveal">
                Messengers of Peace Scout Group ni umuryango urera kandi ukigisha urubyiruko n'abana b'abaskuti
                muri G.S. CAMP KIGALI. Muri iki gihe, uyu muryango ugizwe n'abanyamuryango bari hagati ya 50 na 100,
                abenshi bakaba ari urubyiruko ruza kwiga no gukora ibikorwa bitandukanye mu mashuri yisumbuye no mu muryango.
              </p>
              <p>
                Messengers of Peace Scout Group is a group that trains and teaches youth and young scouts at
                G.S. CAMP KIGALI. Currently, the group is composed of between 50 and 100 members, most of whom
                are young people who come to learn and participate in various activities in secondary schools and
                in the group.
              </p>
              <p className="fw-semibold" style={{ color: '#6B21A8' }}>
                In collaboration with PLP Family.
              </p>
            </Col>
            <Col lg={5}>
              <div className="p-4 rounded-4" style={{ background: '#f8f5ff' }}>
                <img src="/images/scout.JPEG" alt="MOP Scouts" className="rounded-3 mb-3" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                <h4 className="mb-3" style={{ color: '#6B21A8' }}>Our Group at a Glance</h4>
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 45, height: 45, background: '#6B21A8', color: '#fff' }}>
                      <FiTarget />
                    </div>
                    <div>
                      <strong>Intego Nkuru: Kubaka ubushobozi bw'urubyiruko</strong>
                      <p className="mb-0 small text-muted">Main Goal: Building youth capacity through education and training</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 45, height: 45, background: '#6B21A8', color: '#fff' }}>
                      <FiCalendar />
                    </div>
                    <div>
                      <strong>Buri ku Cyumweru, Saa 13:30 – 16:30</strong>
                      <p className="mb-0 small text-muted">Every Sunday, 1:30 PM – 4:30 PM</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 45, height: 45, background: '#6B21A8', color: '#fff' }}>
                      <FiUsers />
                    </div>
                    <div>
                      <strong>Youth aged 14 and above</strong>
                      <p className="mb-0 small text-muted">Urubyiruko kuva ku myaka 14 kuzamura</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 45, height: 45, background: '#6B21A8', color: '#fff' }}>
                      <FiMapPin />
                    </div>
                    <div>
                      <strong>G.S. Camp Kigali</strong>
                      <p className="mb-0 small text-muted">Aho dukorera – Where we operate</p>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* What We Focus On */}
      <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <h2 className="section-title text-center mb-2 animate-section-title">Icyo Twibandaho</h2>
          <p className="section-subtitle text-center mx-auto mb-5 animate-section-subtitle">What We Focus On</p>
          <Row className="g-4 animate-row">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Body className="text-center p-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                    <FiHeart size={28} />
                  </div>
                  <h5>Impano n'Umuco</h5>
                  <p className="text-muted mb-0">Talent & Gifts: Traditional dance (Intore), modern dances, singing and other talents.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Body className="text-center p-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                    <FiBookOpen size={28} />
                  </div>
                  <h5>Indimi</h5>
                  <p className="text-muted mb-0">Languages: Teaching and promoting Kinyarwanda, French, English, and Swahili.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Body className="text-center p-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                    <FiFlag size={28} />
                  </div>
                  <h5>Uburere Mboneragihugu</h5>
                  <p className="text-muted mb-0">Patriotism: Loving the country, drill, and Rwandan cultural values.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Body className="text-center p-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                    <FiBookOpen size={28} />
                  </div>
                  <h5>Ibicurangisho</h5>
                  <p className="text-muted mb-0">Badges: Earning traditional and modern scouting badges.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Body className="text-center p-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                    <FiActivity size={28} />
                  </div>
                  <h5>Indimi</h5>
                  <p className="text-muted mb-0">Languages: Teaching and promoting Kinyarwanda, French, English, and Swahili.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Body className="text-center p-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                    <FiStar size={28} />
                  </div>
                  <h5>Kwihangira Imirimo</h5>
                  <p className="text-muted mb-0">Self-reliance: Teaching youth to work, develop skills, and find opportunities.</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Benefits of Being a Member */}
      <section className="py-5">
        <Container>
          <h2 className="section-title text-center mb-5 animate-section-title">Inyungu Z'Abarizwa mu Muryango</h2>
          <Row className="g-4 animate-row">
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff', borderLeft: '5px solid #6B21A8' }}>
                <FiUsers size={32} className="mb-3" style={{ color: '#6B21A8' }} />
                <h4>Inyungu ku Mwana / Urubyiruko</h4>
                <p className="fw-bold" style={{ color: '#6B21A8' }}>Benefits for Youth / Young People</p>
                <ul className="list-unstyled">
                  {childBenefits.map((b, i) => (
                    <li key={i} className="d-flex align-items-start gap-2 mb-2">
                      <FiCheckCircle style={{ color: '#7C3AED', marginTop: 3, flexShrink: 0 }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff', borderLeft: '5px solid #9333EA' }}>
                <FiHeart size={32} className="mb-3" style={{ color: '#9333EA' }} />
                <h4>Inyungu ku Babyeyi</h4>
                <p className="fw-bold" style={{ color: '#9333EA' }}>Benefits for Parents</p>
                <ul className="list-unstyled">
                  {parentBenefits.map((b, i) => (
                    <li key={i} className="d-flex align-items-start gap-2 mb-2">
                      <FiCheckCircle style={{ color: '#7C3AED', marginTop: 3, flexShrink: 0 }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Values - Indangagaciro */}
      <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <h2 className="section-title text-center mb-2 animate-section-title">Indangagaciro Z'Umunyamuryango</h2>
          <p className="section-subtitle text-center mx-auto mb-1 animate-section-subtitle">Member Values</p>
          <p className="text-center text-muted mb-5 animate-section-subtitle">
            The core principles that guide every member of Messengers of Peace
          </p>
          <Row className="g-4 animate-row">
            {values.map((value, idx) => (
              <Col md={6} lg={4} key={idx}>
                <div className="value-card h-100 animate-card">
                  <FiHeart className="value-icon" style={{ color: '#9333EA' }} />
                  <h5>{value.title}</h5>
                  <p className="fw-bold mb-1" style={{ color: '#6B21A8' }}>{value.en}</p>
                  <p className="text-muted mb-0">{value.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Kirazira */}
      <section className="py-5">
        <Container>
          <Row className="align-items-center g-5 animate-row">
            <Col lg={6}>
              <h2 className="section-title animate-section-title">Kirazira</h2>
              <p className="lead" style={{ color: '#6B21A8' }}>Be Prepared</p>
              <p>
                "Kirazira " is more than just a motto — it is a way of life for
                every scout in our group. It means being ready at all times to face
                challenges, to serve others, and to do what is right even when no one
                is watching.
              </p>
              <p>
                This principle teaches our scouts to plan ahead, to develop the skills
                they need, and to maintain the moral courage to act when duty calls.
                Whether it is helping a neighbor, responding to an emergency, or standing
                up for what is right, a prepared scout is always ready.
              </p>
            </Col>
            <Col lg={6}>
              <div className="d-flex flex-column gap-3">
                {[
                  'Physically and mentally prepared for any challenge',
                  'Ready to serve the community at a moment\'s notice',
                  'Prepared with the skills learned through scouting',
                  'Morally ready to make the right decision',
                ].map((item, idx) => (
                  <div key={idx} className="d-flex align-items-start gap-3 p-3 rounded-3 animate-list-item"
                    style={{ background: '#f8f5ff' }}>
                    <FiCheckCircle style={{ color: '#6B21A8', marginTop: 2 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Mission & Vision */}
      <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <Row className="g-4 animate-row">
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#fff', borderLeft: '5px solid #6B21A8' }}>
                <FiTarget size={32} className="mb-3" style={{ color: '#6B21A8' }} />
                <h4>Our Mission</h4>
                <p className="mb-0">
                  To train youth in scouting skills and values that promote peace,
                  leadership, and community development, preparing them to be
                  responsible citizens who contribute positively to society.
                </p>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#fff', borderLeft: '5px solid #9333EA' }}>
                <FiEye size={32} className="mb-3" style={{ color: '#9333EA' }} />
                <h4>Our Vision</h4>
                <p className="mb-0">
                  To be a leading scout group in Rwanda that produces responsible,
                  skilled, and peace-loving citizens who are committed to serving
                  their communities and the nation.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* III. Inkingi n'Ingamba - Pillars & Strategies */}
      <section className="py-5">
        <Container>
          <Badge bg="primary" className="mb-3 px-3 py-2">Section III</Badge>
          <h2 className="section-title mb-2 animate-section-title">Inkingi n'Ingamba Zizafasha mu Kuzamura Group</h2>
          <p className="section-subtitle mx-auto mb-5 animate-section-subtitle">
            Pillars & Strategies to Help Grow the Group
          </p>
          <p className="text-muted mb-4">
            From the General Assembly of members held at Camp Kigali on April 12, 2026 (21 members attended):
          </p>
          <Row className="g-4 animate-row">
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff' }}>
                <FiHeart size={28} className="mb-3" style={{ color: '#6B21A8' }} />
                <h5>Ibikorwa by'Urukundo</h5>
                <p className="fw-bold mb-2" style={{ color: '#6B21A8' }}>Acts of Service</p>
                <p className="mb-0">Organizing ongoing activities like "Kakawette" and other support initiatives to help one another.</p>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff' }}>
                <FiBookOpen size={28} className="mb-3" style={{ color: '#6B21A8' }} />
                <h5>Amarushanwa n'Ibiganiro</h5>
                <p className="fw-bold mb-2" style={{ color: '#6B21A8' }}>Competitions & Debates</p>
                <p className="mb-0">Organizing debate competitions and public speaking events to build confidence and critical thinking.</p>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff' }}>
                <FiStar size={28} className="mb-3" style={{ color: '#6B21A8' }} />
                <h5>Umusanzu wa Buri Kwezi</h5>
                <p className="fw-bold mb-2" style={{ color: '#6B21A8' }}>Monthly Contribution</p>
                <p className="mb-0">Establishing a regular monthly contribution of 500 Frw per member each month to fund group activities.</p>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff' }}>
                <FiUsers size={28} className="mb-3" style={{ color: '#6B21A8' }} />
                <h5>Kwita ku Banyamuryango</h5>
                <p className="fw-bold mb-2" style={{ color: '#6B21A8' }}>Member Welfare</p>
                <p className="mb-0">Organizing birthday celebrations for members (during holidays or when they are out of school).</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Inite / Units */}
      <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <h2 className="section-title text-center mb-2 animate-section-title">Inite (Units) Zashyizweho</h2>
          <p className="section-subtitle text-center mx-auto mb-5 animate-section-subtitle">
            Specialized Units Established by Members Based on Their Talents
          </p>
          <Row className="g-4 justify-content-center animate-row">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Header className="text-white py-3" style={{ background: '#9333EA' }}>
                  <h5 className="mb-0 text-white">Inite Amasonga</h5>
                </Card.Header>
                <Card.Body>
                  <p><strong>Lead:</strong> Joyce & Sandra</p>
                  <p className="mb-0">Umuco Nyarwanda, Imbyino gakondo n'Amateka y'Igihugu.<br/>
                  <em className="text-muted">Rwandan Culture, Traditional Dance & National History.</em></p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Header className="text-white py-3" style={{ background: '#9333EA' }}>
                  <h5 className="mb-0 text-white">Inite Carbians</h5>
                </Card.Header>
                <Card.Body>
                  <p><strong>Lead:</strong> Jord & Djibril</p>
                  <p className="mb-0">Imbyino zigezweho, Umuduri n'Ibihangano bishya.<br/>
                  <em className="text-muted">Modern Dance, Drumming & New Creativity.</em></p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm animate-card">
                <Card.Header className="text-white py-3" style={{ background: '#7C3AED' }}>
                  <h5 className="mb-0 text-white">Inite The Impact</h5>
                </Card.Header>
                <Card.Body>
                  <p><strong>Lead:</strong> Miguel</p>
                  <p className="mb-0">Gutoza n'ugufasha abifuza kumenya uko umuyobozi mwiza yitwara.<br/>
                  <em className="text-muted">Leadership Training & Development.</em></p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <p className="text-center text-muted mt-3 small">
            Note: Additional units will be established based on growing membership and emerging talents.
          </p>
        </Container>
      </section>

      {/* IV. Intego n'Ibikorwa Ngarukamwaka */}
      <section className="py-5">
        <Container>
          <Badge bg="primary" className="mb-3 px-3 py-2">Section IV</Badge>
          <h2 className="section-title mb-2 animate-section-title">Intego n'Ibikorwa Ngarukamwaka</h2>
          <p className="section-subtitle mx-auto mb-5 animate-section-subtitle">
            Annual Goals & Activities
          </p>

          <h5 className="mb-3" style={{ color: '#6B21A8' }}>Goals to Achieve Before December</h5>
          <Row className="g-3 mb-5 animate-row">
            {annualGoals.map((goal, idx) => (
              <Col md={6} key={idx}>
                <div className="d-flex align-items-start gap-3 p-3 rounded-3 bg-white shadow-sm animate-list-item">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 40, height: 40, background: '#6B21A8', color: '#fff' }}>
                    {goal.icon}
                  </div>
                  <div>
                    <strong>{goal.title}</strong>
                    <p className="mb-0 text-muted small">{goal.desc}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          <h5 className="mb-3" style={{ color: '#6B21A8' }}>Using Contributions & Resources</h5>
          <p className="mb-4">
            The monthly contribution (500 Frw) will be used to achieve the goals we have committed to.
            Special activities such as <strong>supporting a member who lost a loved one</strong> or
            <strong> helping a member in emergency</strong> will require special contributions when needed.
          </p>

          <h5 className="mb-3" style={{ color: '#6B21A8' }}>Annual Activities (Ibikorwa Ngarukamwaka)</h5>
          <p className="mb-3">The group commits to ongoing annual activities and regular evaluation:</p>
          <div className="d-flex flex-column gap-3 animate-row">
            {annualActivities.map((act, idx) => (
              <div key={idx} className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 shadow-sm animate-list-item">
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 35, height: 35, background: '#6B21A8', color: '#fff', fontSize: '0.85rem', flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <span>{act}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Objectives */}
      <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <h2 className="section-title text-center mb-5 animate-section-title">Our Objectives</h2>
          <Row className="justify-content-center animate-row">
            <Col lg={8}>
              <div className="d-flex flex-column gap-3">
                {objectives.map((obj, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 shadow-sm animate-list-item">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: 35, height: 35, background: '#6B21A8', color: '#fff', fontSize: '0.85rem', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Download Handbook */}
      <section className="py-5">
        <Container>
          <Row className="justify-content-center text-center">
            <Col lg={8}>
              <div className="p-5 rounded-4" style={{ background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)' }}>
                <FiBookOpen size={48} className="mb-3 text-white" />
                <h3 className="text-white mb-3">Download Our Handbook</h3>
                <p className="text-white-50 mb-4">
                  Get the complete Messengers of Peace Scout Group Handbook with all information about our group, values, and activities.
                </p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <a href="/introduction/Messengers_of_Peace_Scout_Group_Handbook (1).pdf"
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-light btn-lg px-4">
                    <FiDownload className="me-2" /> Handbook (Kinyarwanda)
                  </a>
                  <a href="/introduction/Messengers_of_Peace_Scout_Group_Handbook_v3 (1).pdf"
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline-light btn-lg px-4">
                    <FiDownload className="me-2" /> Handbook v3
                  </a>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Contact / Credits */}
      <section className="py-4" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <div className="text-center">
            <p className="mb-1"><strong>MESSENGERS OF PEACE SCOUT GROUP</strong></p>
            <p className="text-muted mb-1">G.S. CAMP KIGALI | Nyarugenge | Kigali</p>
            <p className="text-muted mb-2">
              <FiPhone className="me-1" /> +250 722 784 670 | +250 786 188 913
            </p>
            <p className="text-muted small mb-0">
              Prepared by: <strong>Uwineza Shella</strong> – Umuyobozi Ushinzwe Imyitwarire
              &nbsp;|&nbsp; Approved by: <strong>Nshimiyimana Jackson</strong> – Chief de Group (C.G)
            </p>
          </div>
        </Container>
      </section>
    </div>
  )
}
