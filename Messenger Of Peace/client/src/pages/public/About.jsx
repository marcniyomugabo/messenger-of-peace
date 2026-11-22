import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Badge } from 'react-bootstrap'
import { FiTarget, FiHeart, FiEye, FiStar, FiCheckCircle, FiUsers, FiBookOpen, FiMapPin, FiCalendar, FiPhone, FiFlag, FiActivity, FiDownload } from 'react-icons/fi'
import api from '../../services/api'
import { parseContent, parseLines, splitTitle } from '../../utils/aboutFormat'

// The words on this page come from the dashboard (About Page): one section per block,
// keyed as in config/aboutSections.js. The layout, icons and colours stay here.
const GLANCE_ICONS = [FiTarget, FiCalendar, FiUsers, FiMapPin]
const FOCUS_ICONS = [FiHeart, FiBookOpen, FiFlag, FiBookOpen, FiStar, FiActivity]
const PILLAR_ICONS = [FiHeart, FiBookOpen, FiStar, FiUsers]
const GOAL_ICONS = [FiTarget, FiUsers, FiHeart, FiActivity, FiFlag]
const UNIT_COLORS = ['#9333EA', '#9333EA', '#7C3AED']
const pick = (list, i) => list[i % list.length]

export default function About() {
  const [sections, setSections] = useState({})

  useEffect(() => {
    api.get('/about')
      .then(res => setSections(Object.fromEntries((res.data.data || []).map(s => [s.section_key, s]))))
      .catch(() => setSections({}))
  }, [])

  // A block, its title/subtitle and parsed content; null when the section is missing or hidden.
  const block = (key) => {
    const s = sections[key]
    if (!s) return null
    return { ...splitTitle(s.title), ...parseContent(s.content), image: s.image, raw: s.content }
  }

  const intro = block('intro')
  const glance = block('glance')
  const focus = block('focus')
  const benefits = block('benefits')
  const youth = block('benefits_youth')
  const parents = block('benefits_parents')
  const values = block('values')
  const kirazira = block('kirazira')
  const mission = block('mission')
  const vision = block('vision')
  const pillars = block('pillars')
  const units = block('talent_units')
  const annual = block('annual')
  const goals = block('annual_goals')
  const contributions = block('contributions_use')
  const activities = block('annual_activities')
  const objectives = block('objectives')
  const handbook = block('handbook')
  const credits = block('credits')

  const benefitBox = (b, color, Icon) => b && (
    <Col md={6}>
      <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff', borderLeft: `5px solid ${color}` }}>
        <Icon size={32} className="mb-3" style={{ color }} />
        <h4>{b.title}</h4>
        {b.subtitle && <p className="fw-bold" style={{ color }}>{b.subtitle}</p>}
        <ul className="list-unstyled">
          {b.items.map((item, i) => (
            <li key={i} className="d-flex align-items-start gap-2 mb-2">
              <FiCheckCircle style={{ color: '#7C3AED', marginTop: 3, flexShrink: 0 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </Col>
  )

  const numberedList = (list) => list.map((text, idx) => (
    <div key={idx} className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 shadow-sm animate-list-item">
      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
        style={{ width: 35, height: 35, background: '#6B21A8', color: '#fff', fontSize: '0.85rem', flexShrink: 0 }}>
        {idx + 1}
      </div>
      <span>{text}</span>
    </div>
  ))

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

      {/* I. Introduction and the group at a glance */}
      {(intro || glance) && (
        <section className="py-5">
          <Container>
            <Row className="align-items-center g-4 g-lg-5">
              {intro && (
                <Col lg={7}>
                  <Badge bg="primary" className="mb-3 px-3 py-2">Section I</Badge>
                  <h2 className="section-title animate-section-title">{intro.title}</h2>
                  {intro.subtitle && <p className="lead" style={{ color: '#6B21A8' }}>{intro.subtitle}</p>}
                  {intro.paragraphs.map((p, i) => {
                    const last = intro.paragraphs.length > 1 && i === intro.paragraphs.length - 1
                    return last
                      ? <p key={i} className="fw-semibold" style={{ color: '#6B21A8' }}>{p}</p>
                      : <p key={i} className={i === 0 ? 'animate-text-reveal' : undefined}>{p}</p>
                  })}
                </Col>
              )}
              {glance && (
                <Col lg={5}>
                  <div className="p-4 rounded-4" style={{ background: '#f8f5ff' }}>
                    {intro?.image && (
                      <img src={intro.image} alt="MOP Scouts" className="rounded-3 mb-3" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                    )}
                    <h4 className="mb-3" style={{ color: '#6B21A8' }}>{glance.title}</h4>
                    <div className="d-flex flex-column gap-3">
                      {glance.cards.map(([bold, small], i) => {
                        const Icon = pick(GLANCE_ICONS, i)
                        return (
                          <div key={i} className="d-flex align-items-center gap-3">
                            <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 45, height: 45, background: '#6B21A8', color: '#fff' }}>
                              <Icon />
                            </div>
                            <div>
                              <strong>{bold}</strong>
                              {small && <p className="mb-0 small text-muted">{small}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </Container>
        </section>
      )}

      {/* What We Focus On */}
      {focus && (
        <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
          <Container>
            <h2 className="section-title text-center mb-2 animate-section-title">{focus.title}</h2>
            {focus.subtitle && <p className="section-subtitle text-center mx-auto mb-5 animate-section-subtitle">{focus.subtitle}</p>}
            <Row className="g-4 animate-row">
              {focus.cards.map(([title, text], i) => {
                const Icon = pick(FOCUS_ICONS, i)
                return (
                  <Col md={4} key={i}>
                    <Card className="h-100 border-0 shadow-sm animate-card">
                      <Card.Body className="text-center p-4">
                        <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                          style={{ width: 60, height: 60, background: '#F3E8FF', color: '#6B21A8' }}>
                          <Icon size={28} />
                        </div>
                        <h5>{title}</h5>
                        {text && <p className="text-muted mb-0">{text}</p>}
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          </Container>
        </section>
      )}

      {/* Benefits of Being a Member */}
      {(youth || parents) && (
        <section className="py-5">
          <Container>
            {benefits && <h2 className="section-title text-center mb-5 animate-section-title">{benefits.title}</h2>}
            <Row className="g-4 animate-row">
              {benefitBox(youth, '#6B21A8', FiUsers)}
              {benefitBox(parents, '#9333EA', FiHeart)}
            </Row>
          </Container>
        </section>
      )}

      {/* Values - Indangagaciro */}
      {values && (
        <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
          <Container>
            <h2 className="section-title text-center mb-2 animate-section-title">{values.title}</h2>
            {values.subtitle && <p className="section-subtitle text-center mx-auto mb-1 animate-section-subtitle">{values.subtitle}</p>}
            {values.paragraphs.map((p, i) => (
              <p key={i} className="text-center text-muted mb-5 animate-section-subtitle">{p}</p>
            ))}
            <Row className="g-4 animate-row">
              {values.cards.map(([title, en, desc], idx) => (
                <Col md={6} lg={4} key={idx}>
                  <div className="value-card h-100 animate-card">
                    <FiHeart className="value-icon" style={{ color: '#9333EA' }} />
                    <h5>{title}</h5>
                    {en && <p className="fw-bold mb-1" style={{ color: '#6B21A8' }}>{en}</p>}
                    {desc && <p className="text-muted mb-0">{desc}</p>}
                  </div>
                </Col>
              ))}
            </Row>
          </Container>
        </section>
      )}

      {/* Kirazira */}
      {kirazira && (
        <section className="py-5">
          <Container>
            <Row className="align-items-center g-4 g-lg-5 animate-row">
              <Col lg={6}>
                <h2 className="section-title animate-section-title">{kirazira.title}</h2>
                {kirazira.subtitle && <p className="lead" style={{ color: '#6B21A8' }}>{kirazira.subtitle}</p>}
                {kirazira.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </Col>
              <Col lg={6}>
                <div className="d-flex flex-column gap-3">
                  {kirazira.items.map((item, idx) => (
                    <div key={idx} className="d-flex align-items-start gap-3 p-3 rounded-3 animate-list-item"
                      style={{ background: '#f8f5ff' }}>
                      <FiCheckCircle style={{ color: '#6B21A8', marginTop: 2, flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      )}

      {/* Mission & Vision */}
      {(mission || vision) && (
        <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
          <Container>
            <Row className="g-4 animate-row">
              {mission && (
                <Col md={6}>
                  <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#fff', borderLeft: '5px solid #6B21A8' }}>
                    <FiTarget size={32} className="mb-3" style={{ color: '#6B21A8' }} />
                    <h4>{mission.title}</h4>
                    {mission.paragraphs.map((p, i) => <p key={i} className="mb-0">{p}</p>)}
                  </div>
                </Col>
              )}
              {vision && (
                <Col md={6}>
                  <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#fff', borderLeft: '5px solid #9333EA' }}>
                    <FiEye size={32} className="mb-3" style={{ color: '#9333EA' }} />
                    <h4>{vision.title}</h4>
                    {vision.paragraphs.map((p, i) => <p key={i} className="mb-0">{p}</p>)}
                  </div>
                </Col>
              )}
            </Row>
          </Container>
        </section>
      )}

      {/* III. Inkingi n'Ingamba - Pillars & Strategies */}
      {pillars && (
        <section className="py-5">
          <Container>
            <Badge bg="primary" className="mb-3 px-3 py-2">Section III</Badge>
            <h2 className="section-title mb-2 animate-section-title">{pillars.title}</h2>
            {pillars.subtitle && <p className="section-subtitle mx-auto mb-5 animate-section-subtitle">{pillars.subtitle}</p>}
            {pillars.paragraphs.map((p, i) => <p key={i} className="text-muted mb-4">{p}</p>)}
            <Row className="g-4 animate-row">
              {pillars.cards.map(([title, en, desc], i) => {
                const Icon = pick(PILLAR_ICONS, i)
                return (
                  <Col md={6} key={i}>
                    <div className="p-4 rounded-4 h-100 animate-card" style={{ background: '#f8f5ff' }}>
                      <Icon size={28} className="mb-3" style={{ color: '#6B21A8' }} />
                      <h5>{title}</h5>
                      {en && <p className="fw-bold mb-2" style={{ color: '#6B21A8' }}>{en}</p>}
                      {desc && <p className="mb-0">{desc}</p>}
                    </div>
                  </Col>
                )
              })}
            </Row>
          </Container>
        </section>
      )}

      {/* Inite / Talent units */}
      {units && (
        <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
          <Container>
            <h2 className="section-title text-center mb-2 animate-section-title">{units.title}</h2>
            {units.subtitle && <p className="section-subtitle text-center mx-auto mb-5 animate-section-subtitle">{units.subtitle}</p>}
            <Row className="g-4 justify-content-center animate-row">
              {units.cards.map(([name, lead, desc, english], i) => (
                <Col md={4} key={i}>
                  <Card className="h-100 border-0 shadow-sm animate-card">
                    <Card.Header className="text-white py-3" style={{ background: pick(UNIT_COLORS, i) }}>
                      <h5 className="mb-0 text-white">{name}</h5>
                    </Card.Header>
                    <Card.Body>
                      {lead && <p>{lead.replace(/^Lead:\s*/i, '') !== lead ? <><strong>Lead:</strong> {lead.replace(/^Lead:\s*/i, '')}</> : lead}</p>}
                      {(desc || english) && (
                        <p className="mb-0">{desc}{desc && english && <br />}
                          {english && <em className="text-muted">{english}</em>}</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            {units.paragraphs.map((p, i) => <p key={i} className="text-center text-muted mt-3 small">{p}</p>)}
          </Container>
        </section>
      )}

      {/* IV. Intego n'Ibikorwa Ngarukamwaka */}
      {(annual || goals || contributions || activities) && (
        <section className="py-5">
          <Container>
            {annual && (
              <>
                <Badge bg="primary" className="mb-3 px-3 py-2">Section IV</Badge>
                <h2 className="section-title mb-2 animate-section-title">{annual.title}</h2>
                {annual.subtitle && <p className="section-subtitle mx-auto mb-5 animate-section-subtitle">{annual.subtitle}</p>}
              </>
            )}

            {goals && (
              <>
                <h5 className="mb-3" style={{ color: '#6B21A8' }}>{goals.title}</h5>
                <Row className="g-3 mb-5 animate-row">
                  {goals.cards.map(([title, desc], idx) => {
                    const Icon = pick(GOAL_ICONS, idx)
                    return (
                      <Col md={6} key={idx}>
                        <div className="d-flex align-items-start gap-3 p-3 rounded-3 bg-white shadow-sm animate-list-item">
                          <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 40, height: 40, background: '#6B21A8', color: '#fff' }}>
                            <Icon />
                          </div>
                          <div>
                            <strong>{title}</strong>
                            {desc && <p className="mb-0 text-muted small">{desc}</p>}
                          </div>
                        </div>
                      </Col>
                    )
                  })}
                </Row>
              </>
            )}

            {contributions && (
              <>
                <h5 className="mb-3" style={{ color: '#6B21A8' }}>{contributions.title}</h5>
                {contributions.paragraphs.map((p, i) => <p key={i} className="mb-4">{p}</p>)}
              </>
            )}

            {activities && (
              <>
                <h5 className="mb-3" style={{ color: '#6B21A8' }}>{activities.title}</h5>
                {activities.paragraphs.map((p, i) => <p key={i} className="mb-3">{p}</p>)}
                <div className="d-flex flex-column gap-3 animate-row">
                  {numberedList(activities.items)}
                </div>
              </>
            )}
          </Container>
        </section>
      )}

      {/* Objectives */}
      {objectives && (
        <section className="py-5" style={{ backgroundColor: '#f8f5ff' }}>
          <Container>
            <h2 className="section-title text-center mb-5 animate-section-title">{objectives.title}</h2>
            <Row className="justify-content-center animate-row">
              <Col lg={8}>
                <div className="d-flex flex-column gap-3">
                  {numberedList(objectives.items)}
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      )}

      {/* Download Handbook */}
      <section className="py-5">
        <Container>
          <Row className="justify-content-center text-center">
            <Col lg={8}>
              <div className="p-5 rounded-4" style={{ background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)' }}>
                <FiBookOpen size={48} className="mb-3 text-white" />
                <h3 className="text-white mb-3">{handbook?.title || 'Download Our Handbook'}</h3>
                {(handbook?.paragraphs || []).map((p, i) => <p key={i} className="text-white-50 mb-4">{p}</p>)}
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
      {credits && (
        <section className="py-4" style={{ backgroundColor: '#f8f5ff' }}>
          <Container>
            <div className="text-center">
              <p className="mb-1"><strong>{credits.title}</strong></p>
              {parseLines(credits.raw).map((line, i, all) => {
                const isPhone = /^\+?\d[\d\s|+]+$/.test(line)
                const isLast = i === all.length - 1
                return (
                  <p key={i} className={isLast ? 'text-muted small mb-0' : `text-muted ${isPhone ? 'mb-2' : 'mb-1'}`}>
                    {isPhone && <FiPhone className="me-1" />}{line}
                  </p>
                )
              })}
            </div>
          </Container>
        </section>
      )}
    </div>
  )
}
