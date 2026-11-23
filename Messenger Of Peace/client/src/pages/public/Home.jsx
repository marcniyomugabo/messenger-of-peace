import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Button } from 'react-bootstrap'
import { FiHeart, FiTarget, FiStar, FiArrowRight, FiMessageCircle, FiPhone, FiMail, FiClock, FiBookOpen, FiVolume2 } from 'react-icons/fi'
import api from '../../services/api'
import { parseContent } from '../../utils/aboutFormat'
import { useUnits, firstSentence } from '../../utils/units'
import { useSiteSettings } from '../../utils/siteSettings'
import { SAMPLE_ACTIVITIES, toActivity } from '../../utils/activities'
import { NEWS_PHOTO, newsDate, summary } from '../../utils/news'
import { eventWhen, dayBlock } from '../../utils/events'

const ACTIVITY_PHOTO = '/images/activities/IMG_0863.JPG.jpeg'
const isPage = url => /^\/(?!\/)/.test(String(url || ''))
const isWeb = url => /^https?:\/\/\S+$/i.test(String(url || ''))

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const defaultSlides = [
    { image: '/images/first1.PNG', title: 'Messengers of Peace', subtitle: 'Building Peace \u2022 Inspiring Hope', desc: 'We are a community of young people committed to peace, service, and positive change.' },
    { image: '/images/bg2.jpeg', title: 'Building Tomorrow\u2019s Leaders', subtitle: 'Building Peace \u2022 Inspiring Hope', desc: 'Training youth in scouting values, leadership, and community development.' },
    { image: '/images/community.JPEG', title: 'Community Service First', subtitle: 'Building Peace \u2022 Inspiring Hope', desc: 'Our scouts lead environmental cleanup campaigns across Rwanda.' },
    { image: '/images/bg4.jpeg', title: 'First Aid & Emergency Training', subtitle: 'Building Peace \u2022 Inspiring Hope', desc: 'Life-saving skills for every scout through professional training.' },
    { image: '/images/bg5.jpeg', title: 'Annual Scout Camps', subtitle: 'Building Peace \u2022 Inspiring Hope', desc: 'Outdoor survival, teamwork, and leadership challenges at Camp Kigali.' },
    { image: '/images/bg6.jpeg', title: 'Inspiring Hope Together', subtitle: 'Building Peace \u2022 Inspiring Hope', desc: 'Part of the Rwanda Scout Association \u2014 spreading peace across communities.' },
  ]

  // Contact cards: values come from the dashboard (Settings).
  const site = useSiteSettings()
  const infoCards = [
    { icon: <FiMessageCircle />, title: 'WhatsApp', value: site.whatsapp_contact, color: '#7C3AED', bg: '#F3E8FF' },
    { icon: <FiPhone />, title: 'Phone', value: site.phone_contact, color: '#6D28D9', bg: '#EDE9FE' },
    { icon: <FiMail />, title: 'Email', value: site.email_contact, color: '#9333EA', bg: '#F3E8FF' },
    { icon: <FiClock />, title: 'Meeting Time', value: `${site.meeting_day} ${site.meeting_time}`, color: '#581C87', bg: '#EDE9FE' },
  ]

  // Sample activities are shown only until the first activity is published (dashboard: Activities).
  const defaultRecentActivities = SAMPLE_ACTIVITIES.slice(0, 3).map(toActivity)

  const defaultGalleryImages = [
    '/images/activities/IMG_0863.JPG.jpeg',
    '/images/activities/IMG_7229.JPG.jpeg',
    '/images/activities/IMG_7480.JPG.jpeg',
    '/images/activities/IMG_9450.JPG.jpeg',
  ]

  const defaultMission = 'To train youth in scouting skills and values that promote peace, leadership, and community development.'
  const defaultVision = 'To be a leading scout group in Rwanda that produces responsible, skilled, and peace-loving citizens.'
  const defaultMotto = '\u201CKirazira\u201D \u2014 Be Prepared. Always ready to serve, to lead, and to make a difference.'

  const defaultStats = [
    { value: '105', label: 'Active Members' },
    { value: '4', label: 'Scout Units' },
    { value: '50+', label: 'Activities Per Year' },
    { value: '500+', label: 'Community Service Hours' },
  ]

  // Background photos for the unit cards, used in turn.
  const unitPhotos = ['/images/bg1.PNG', '/images/bg3.jpeg', '/images/bg5.jpeg', '/images/bg6.jpeg']

  const [slides, setSlides] = useState(defaultSlides)
  const [recentActivities, setRecentActivities] = useState(defaultRecentActivities)
  const [galleryImages, setGalleryImages] = useState(defaultGalleryImages)
  const [documents, setDocuments] = useState([])
  const [news, setNews] = useState([])
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(defaultStats)
  const [mission, setMission] = useState(defaultMission)
  const [vision, setVision] = useState(defaultVision)
  const [motto] = useState(defaultMotto)
  // Units are managed in the dashboard (Units); the "Scout Units" number is their real count.
  const { units: scoutUnits, loaded: unitsLoaded } = useUnits()

  useEffect(() => {
    // Every list answer from the server is { success, data: [...] }.
    const list = res => (Array.isArray(res.data?.data) ? res.data.data : [])

    // Hero slides (dashboard: Home Content > Hero Slides).
    api.get('/homepage/slides')
      .then(res => {
        const data = list(res)
        if (data.length > 0) {
          setSlides(data.map(s => ({
            image: s.background_image || '/images/first1.PNG',
            title: s.title || '',
            subtitle: s.subtitle || '',
            desc: s.description || '',
            buttonText: s.button_text || '',
            buttonLink: isPage(s.button_link) || isWeb(s.button_link) ? s.button_link : '',
          })))
        }
      })
      .catch(() => {})

    // The 3 most recent published activities (the server only sends published ones, newest first).
    api.get('/activities', { params: { limit: 3 } })
      .then(res => {
        const data = list(res).map(toActivity)
        if (data.length > 0) setRecentActivities(data)
      })
      .catch(() => {})

    // The 4 newest photos from published albums.
    api.get('/gallery/images/public', { params: { limit: 4 } })
      .then(res => {
        const images = list(res).map(img => img.image_url).filter(Boolean)
        if (images.length > 0) setGalleryImages(images)
      })
      .catch(() => {})

    // The 3 newest published documents (dashboard: Information).
    api.get('/information', { params: { limit: 50 } })
      .then(res => setDocuments([...list(res)].sort((a, b) => b.id - a.id).slice(0, 3)))
      .catch(() => {})

    // Website announcements (dashboard: Announcements, audience All or Parents). Hidden while none.
    api.get('/announcements', { params: { limit: 3 } })
      .then(res => setNotices(list(res)))
      .catch(() => {})

    // The 3 newest stories (dashboard: News). The section is hidden while there are none.
    api.get('/posts', { params: { limit: 3 } })
      .then(res => setNews(list(res)))
      .catch(() => {})

    // The next 3 events (dashboard: Events). Hidden while none are planned.
    api.get('/events', { params: { when: 'upcoming', limit: 3 } })
      .then(res => setEvents(list(res)))
      .catch(() => {})

    api.get('/about')
      .then(res => {
        // Mission and vision come from the About page sections of the same name (dashboard: About Page).
        const sections = Array.isArray(res.data?.data) ? res.data.data : []
        const text = key => parseContent(sections.find(s => s.section_key === key)?.content).paragraphs.join(' ')
        if (text('mission')) setMission(text('mission'))
        if (text('vision')) setVision(text('vision'))
      })
      .catch(() => {})

    // The numbers block (dashboard: Home Content > Page Sections, type "Numbers"): one "value | label" per line.
    api.get('/homepage/sections', { params: { section_type: 'stats' } })
      .then(res => {
        const numbers = parseContent(list(res)[0]?.content).cards
          .filter(parts => parts[0] && parts[1])
          .map(([value, label]) => ({ value, label }))
        if (numbers.length > 0) setStats(numbers)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0)
    }
  }, [slides.length, currentSlide])

  return (
    <div>
      {/* ===== HERO SECTION ===== */}
      <section className="mop-hero">
        {/* Background slides */}
        <div className="mop-hero-bg">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`mop-hero-bg-slide ${currentSlide === idx ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
          <div className="mop-hero-overlay" />
        </div>

        {/* Content */}
        <Container className="mop-hero-content">
          <div className="mop-hero-text">
            <h1>{slides[currentSlide]?.title}</h1>
            <p className="mop-hero-subtitle">{slides[currentSlide]?.subtitle}</p>
            <div className="mop-hero-divider">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <p className="mop-hero-desc">{slides[currentSlide]?.desc}</p>
            {/* The slide's button (built-in slides: "Learn More" to the About page). */}
            {(() => {
              const slide = slides[currentSlide] || {}
              const text = slide.buttonText ?? 'Learn More'
              const link = slide.buttonLink ?? '/about'
              if (!text || !link) return null
              return (
                <div className="mop-hero-buttons">
                  {isPage(link) ? (
                    <Link to={link} className="mop-hero-btn-primary">{text} <FiArrowRight size={18} /></Link>
                  ) : (
                    <a href={link} className="mop-hero-btn-primary" target="_blank" rel="noopener noreferrer">{text} <FiArrowRight size={18} /></a>
                  )}
                </div>
              )
            })()}
            <div className="mop-hero-dots">
              {slides.map((_, idx) => (
                <span
                  key={idx}
                  className={currentSlide === idx ? 'active' : ''}
                  onClick={() => setCurrentSlide(idx)}
                />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ===== ANNOUNCEMENTS (dashboard: Announcements) ===== */}
      {notices.length > 0 && (
        <section className="home-notices py-4">
          <Container>
            <h2 className="h5 fw-bold mb-3 d-flex align-items-center gap-2"><FiVolume2 /> Announcements</h2>
            <Row className="g-3">
              {notices.map(n => (
                <Col md={notices.length === 1 ? 12 : notices.length === 2 ? 6 : 4} key={n.id}>
                  <div className={`home-notice ${n.priority === 'High' ? 'high' : ''}`}>
                    <div className="d-flex justify-content-between gap-2 mb-1">
                      <h3 className="h6 fw-bold mb-0">{n.title}</h3>
                      {n.priority === 'High' && <span className="badge bg-danger align-self-start">Important</span>}
                    </div>
                    <small className="text-muted d-block mb-2">
                      {new Date(n.published_at || n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </small>
                    <p className="mb-0 small" title={n.content}>{n.content}</p>
                  </div>
                </Col>
              ))}
            </Row>
          </Container>
        </section>
      )}

      {/* ===== INFO CARDS ===== */}
      <section className="mop-info-cards-section">
        <Container>
          <Row className="g-3 justify-content-center">
            {infoCards.map((card, idx) => (
              <Col lg={3} md={6} key={idx} className="animate-card">
                <div className="mop-info-card">
                  <div className="mop-info-card-icon" style={{ color: card.color, background: card.bg }}>
                    {card.icon}
                  </div>
                  <h6>{card.title}</h6>
                  <p>{card.value}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="py-5">
        <Container>
          <Row className="g-4">
            <Col md={4} className="animate-fade-up">
              <div className="value-card h-100">
                <FiHeart className="value-icon" />
                <h5>Mission</h5>
                <p className="text-muted mb-0">{mission}</p>
              </div>
            </Col>
            <Col md={4} className="animate-fade-up">
              <div className="value-card h-100">
                <FiTarget className="value-icon" />
                <h5>Vision</h5>
                <p className="text-muted mb-0">{vision}</p>
              </div>
            </Col>
            <Col md={4} className="animate-fade-up">
              <div className="value-card h-100">
                <FiStar className="value-icon" />
                <h5>Motto</h5>
                <p className="text-muted mb-0">&ldquo;{motto}&rdquo;</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ===== LATEST NEWS (dashboard: News) ===== */}
      {news.length > 0 && (
        <section className="py-5">
          <Container>
            <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-2">
              <h2 className="section-title mb-0 animate-section-title">Latest News</h2>
              <Link to="/news" className="mop-read-more">All news <FiArrowRight size={14} /></Link>
            </div>
            <Row className="g-4">
              {news.map(s => (
                <Col md={4} key={s.id}>
                  <Link to={`/news/${s.slug}`} className="text-decoration-none">
                    <div className="activity-card h-100">
                      <div className="activity-image">
                        <img src={s.featured_image || NEWS_PHOTO} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                      <div className="p-3">
                        <small className="text-muted d-block mb-1">{[s.category, newsDate(s.published_at)].filter(Boolean).join(' · ')}</small>
                        <h5 className="text-dark mb-2">{s.title}</h5>
                        <p className="text-muted small mb-0">{summary(s, 120)}</p>
                      </div>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          </Container>
        </section>
      )}

      {/* ===== UPCOMING EVENTS (dashboard: Events) ===== */}
      {events.length > 0 && (
        <section className="py-5" style={{ background: 'var(--mop-bg)' }}>
          <Container>
            <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-2">
              <h2 className="section-title mb-0 animate-section-title">Upcoming Events</h2>
              <Link to="/events" className="mop-read-more">All events <FiArrowRight size={14} /></Link>
            </div>
            <Row className="g-3">
              {events.map(e => {
                const b = dayBlock(e.start_date)
                return (
                  <Col md={4} key={e.id}>
                    <Link to="/events" className="text-decoration-none">
                      <div className="d-flex gap-3 p-3 rounded-4 bg-white shadow-sm h-100">
                        <div className="text-center flex-shrink-0 rounded-3 text-white d-flex flex-column justify-content-center" style={{ width: 58, height: 62, background: 'var(--mop-primary)' }}>
                          <div className="fs-5 fw-bold lh-1">{b.day}</div>
                          <div className="small">{b.month}</div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h6 className="text-dark mb-1">{e.title}</h6>
                          <small className="text-muted d-block">{eventWhen(e.start_date, e.end_date)}</small>
                          {e.venue && <small className="text-muted d-block">{e.venue}</small>}
                        </div>
                      </div>
                    </Link>
                  </Col>
                )
              })}
            </Row>
          </Container>
        </section>
      )}

      {/* ===== THREE COLUMN: Activities | Gallery | Info ===== */}
      <section className="mop-three-col-section">
        <Container>
          <Row>
            <Col lg={4} className="mb-4">
              <div className="mop-col-header"><h3>Latest Activities</h3></div>
              <div className="mop-news-list">
                {recentActivities.map((activity, idx) => (
                  <Link to="/activities" key={idx} className="mop-news-item">
                    <div className="mop-news-item-img"><img src={activity.image || ACTIVITY_PHOTO} alt={activity.title} /></div>
                    <div className="mop-news-item-content">
                      {activity.category && <span className="mop-news-badge">{activity.category}</span>}
                      <h6>{activity.title}</h6>
                      {activity.month && <small><FiClock size={12} /> {activity.month}</small>}
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/activities" className="mop-read-more">Read More <FiArrowRight size={14} /></Link>
            </Col>

            <Col lg={4} className="mb-4">
              <div className="mop-col-header"><h3>Gallery</h3></div>
              <div className="mop-gallery-grid">
                {galleryImages.map((img, idx) => (
                  <Link to="/gallery" key={idx} className="mop-gallery-thumb"><img src={img} alt={`Activity ${idx + 1}`} /></Link>
                ))}
              </div>
              <Link to="/gallery" className="mop-read-more">See More Photos <FiArrowRight size={14} /></Link>
            </Col>

            <Col lg={4} className="mb-4">
              <div className="mop-col-header"><h3>Information Center</h3></div>
              <div className="mop-news-list">
                {/* The 3 newest documents from the Information page (dashboard: Information). */}
                {documents.map((doc, idx) => {
                  const Icon = [FiBookOpen, FiHeart, FiStar][idx % 3]
                  const about = firstSentence(doc.description)
                  return (
                    <Link to="/information" key={doc.id} className="mop-news-item">
                      <div className="mop-news-item-icon" style={{ color: ['#6B21A8', '#581C87', '#9333EA'][idx % 3] }}><Icon size={28} /></div>
                      <div className="mop-news-item-content">
                        <h6>{doc.title}</h6>
                        {about && <small>{about.length > 90 ? about.slice(0, 87) + '...' : about}</small>}
                      </div>
                    </Link>
                  )
                })}
                {documents.length === 0 && (
                  <Link to="/information" className="mop-news-item">
                    <div className="mop-news-item-icon" style={{ color: '#6B21A8' }}><FiBookOpen size={28} /></div>
                    <div className="mop-news-item-content"><h6>Scout documents</h6><small>Guides, manuals and magazines for our scouts.</small></div>
                  </Link>
                )}
              </div>
              <Link to="/information" className="mop-read-more">View All Documents <FiArrowRight size={14} /></Link>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ===== SCOUT UNITS ===== */}
      <section className="mop-units-section">
        <Container>
          <div className="text-center mb-5">
            <h2 className="section-title d-inline-block animate-section-title">Our Scout Units</h2>
            <p className="section-subtitle mx-auto mt-3 animate-section-subtitle">Age-appropriate programs for every young person</p>
          </div>
          <Row className="g-4 animate-row">
            {scoutUnits.map((unit, idx) => (
              <Col lg={3} md={6} key={unit.id} className="animate-card">
                <Link to="/units" className="mop-unit-banner" style={{ backgroundImage: `url(${unitPhotos[idx % unitPhotos.length]})` }}>
                  <div className="mop-unit-banner-overlay" />
                  <div className="mop-unit-banner-content">
                    <h4>{unit.name}</h4>
                    <span className="mop-unit-ages">{[unit.english, unit.ageRange].filter(Boolean).join(' · ')}</span>
                    <p>{firstSentence(unit.desc)}</p>
                    <span className="mop-unit-btn">Learn More</span>
                  </div>
                </Link>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-5" style={{ background: '#f8f5ff' }}>
        <Container>
          <Row className="text-center g-4">
            {stats.map(stat => (unitsLoaded && stat.label === 'Scout Units' ? { ...stat, value: String(scoutUnits.length) } : stat)).map((stat, idx) => (
              <Col md={3} key={idx}>
                <h2 className="fw-bold animate-number" style={{ color: '#6B21A8' }}>{stat.value}</h2>
                <p className="text-muted mb-0">{stat.label}</p>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-5" style={{ background: 'linear-gradient(135deg, #581C87, #6B21A8, #7C3AED)' }}>
        <Container className="text-center">
          <h2 className="text-white mb-3 animate-text-reveal">Ready to Make a Difference?</h2>
          <p className="text-white-50 mb-4 mx-auto animate-text-reveal" style={{ maxWidth: 500 }}>Join Messengers of Peace today and become part of a movement that shapes leaders, builds community, and spreads peace.</p>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <Button as={Link} to="/join-us" variant="light" size="lg" className="fw-semibold px-5">Apply Now <FiArrowRight className="ms-1" /></Button>
            <Button as={Link} to="/support" variant="outline-light" size="lg" className="fw-semibold px-4"><FiHeart className="me-1" /> Support us</Button>
          </div>
        </Container>
      </section>
    </div>
  )
}
