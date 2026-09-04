import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Button } from 'react-bootstrap'
import { FiHeart, FiTarget, FiStar, FiArrowRight, FiMessageCircle, FiPhone, FiMail, FiClock, FiBookOpen } from 'react-icons/fi'
import api from '../../services/api'

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

  const defaultInfoCards = [
    { icon: <FiMessageCircle />, title: 'WhatsApp', value: '+250 722 784 670', color: '#7C3AED', bg: '#F3E8FF' },
    { icon: <FiPhone />, title: 'Phone', value: '+250 786 188 913', color: '#6D28D9', bg: '#EDE9FE' },
    { icon: <FiMail />, title: 'Email', value: 'info@mopscouts.rw', color: '#9333EA', bg: '#F3E8FF' },
    { icon: <FiClock />, title: 'Meeting Time', value: 'Sunday 13:30 - 16:30', color: '#581C87', bg: '#EDE9FE' },
  ]

  const defaultRecentActivities = [
    { title: 'Environmental Cleanup Campaign', date: 'August 2026', desc: 'Our scouts cleaned the streets of Nyarugenge and planted 200 trees.', category: 'Community Service', image: '/images/activities/IMG_0863.JPG.jpeg' },
    { title: 'First Aid Training Workshop', date: 'July 2026', desc: 'Seniors learned life-saving first aid techniques from Red Cross instructors.', category: 'Training', image: '/images/activities/first-aid.jpg' },
    { title: 'Annual Camp at Camp Kigali', date: 'July 2026', desc: 'Three days of outdoor survival, teamwork, and leadership challenges.', category: 'Camping', image: '/images/activities/IMG_7480.JPG.jpeg' },
  ]

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

  const scoutUnits = [
    { name: 'Cubs', ages: '6 \u2013 10 years', desc: 'Where adventure begins. Cubs learn basic scouting, nature, and friendship.', bg: '/images/bg1.PNG' },
    { name: 'Scouts', ages: '11 \u2013 14 years', desc: 'Building skills in camping, first aid, and community service.', bg: '/images/bg3.jpeg' },
    { name: 'Seniors', ages: '15 \u2013 18 years', desc: 'Leadership development, advanced training, and community projects.', bg: '/images/bg5.jpeg' },
    { name: 'Rovers', ages: '18 \u2013 25 years', desc: 'Mentoring younger scouts and leading major community initiatives.', bg: '/images/bg6.jpeg' },
  ]

  const [slides, setSlides] = useState(defaultSlides)
  const [infoCards, setInfoCards] = useState(defaultInfoCards)
  const [recentActivities, setRecentActivities] = useState(defaultRecentActivities)
  const [galleryImages, setGalleryImages] = useState(defaultGalleryImages)
  const [stats, setStats] = useState(defaultStats)
  const [mission, setMission] = useState(defaultMission)
  const [vision, setVision] = useState(defaultVision)
  const [motto, setMotto] = useState(defaultMotto)

  useEffect(() => {
    api.get('/homepage/slides')
      .then(res => {
        const data = res.data?.slides || res.data
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data.map(s => ({
            image: s.image || s.imageUrl || s.backgroundImage || '/images/first1.PNG',
            title: s.title || s.heading || 'Messengers of Peace',
            subtitle: s.subtitle || s.subheading || 'Building Peace \u2022 Inspiring Hope',
            desc: s.description || s.desc || '',
          })))
        }
      })
      .catch(() => {})

    api.get('/activities')
      .then(res => {
        const data = res.data?.activities || res.data
        if (Array.isArray(data) && data.length > 0) {
          const published = data
            .filter(a => a.status === 'published' || a.published === true)
            .slice(0, 3)
            .map(a => ({
              title: a.title || 'Untitled Activity',
              date: a.date || a.createdAt
                ? new Date(a.date || a.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : '',
              desc: a.description || a.desc || a.summary || '',
              category: a.category || a.type || 'Activity',
              image: a.image || a.imageUrl || a.thumbnail || '/images/activities/IMG_0863.JPG.jpeg',
            }))
          if (published.length > 0) setRecentActivities(published)
        }
      })
      .catch(() => {})

    api.get('/gallery/images/public')
      .then(res => {
        const data = res.data?.images || res.data
        if (Array.isArray(data) && data.length > 0) {
          const images = data
            .slice(0, 4)
            .map(img => img.url || img.imageUrl || img.src || img.image || '/images/activities/IMG_0863.JPG.jpeg')
          if (images.length > 0) setGalleryImages(images)
        }
      })
      .catch(() => {})

    api.get('/settings')
      .then(res => {
        const s = res.data?.settings || res.data
        if (s) {
          const cards = [
            { icon: <FiMessageCircle />, title: 'WhatsApp', value: s.whatsapp || s.phoneNumber2 || '+250 722 784 670', color: '#7C3AED', bg: '#F3E8FF' },
            { icon: <FiPhone />, title: 'Phone', value: s.phone || s.phoneNumber || s.phoneNumber1 || '+250 786 188 913', color: '#6D28D9', bg: '#EDE9FE' },
            { icon: <FiMail />, title: 'Email', value: s.email || s.contactEmail || 'info@mopscouts.rw', color: '#9333EA', bg: '#F3E8FF' },
            { icon: <FiClock />, title: 'Meeting Time', value: s.meetingTime || s.meeting_time || 'Sunday 13:30 - 16:30', color: '#581C87', bg: '#EDE9FE' },
          ]
          setInfoCards(cards)
        }
      })
      .catch(() => {})

    api.get('/about')
      .then(res => {
        const a = res.data?.about || res.data
        if (a) {
          if (a.mission) setMission(a.mission)
          if (a.vision) setVision(a.vision)
          if (a.motto) setMotto('\u201C' + a.motto + '\u201D \u2014 Be Prepared. Always ready to serve, to lead, and to make a difference.')
          if (a.mottoDescription) setMotto('\u201C' + a.motto + '\u201D \u2014 ' + a.mottoDescription)
        }
      })
      .catch(() => {})

    api.get('/homepage/sections')
      .then(res => {
        const s = res.data?.sections || res.data
        if (Array.isArray(s) && s.length > 0) {
          const statsSection = s.find(sec => sec.type === 'stats' || sec.name === 'stats')
          if (statsSection && Array.isArray(statsSection.items) && statsSection.items.length > 0) {
            setStats(statsSection.items.map(item => ({
              value: item.value || item.number || '0',
              label: item.label || item.title || item.name || '',
            })))
          }
        }
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
            <div className="mop-hero-buttons">
              <Link to="/about" className="mop-hero-btn-primary">
                Learn More <FiArrowRight size={18} />
              </Link>
            </div>
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

      {/* ===== THREE COLUMN: Activities | Gallery | Info ===== */}
      <section className="mop-three-col-section">
        <Container>
          <Row>
            <Col lg={4} className="mb-4">
              <div className="mop-col-header"><h3>Latest Activities</h3></div>
              <div className="mop-news-list">
                {recentActivities.map((activity, idx) => (
                  <Link to="/activities" key={idx} className="mop-news-item">
                    <div className="mop-news-item-img"><img src={activity.image} alt={activity.title} /></div>
                    <div className="mop-news-item-content">
                      <span className="mop-news-badge">{activity.category}</span>
                      <h6>{activity.title}</h6>
                      <small><i className="bi bi-clock"></i> {activity.date}</small>
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
                <Link to="/information" className="mop-news-item">
                  <div className="mop-news-item-icon" style={{ color: '#6B21A8' }}><FiBookOpen size={28} /></div>
                  <div className="mop-news-item-content"><h6>Scout Handbook</h6><small>Complete guide to scouting principles and skills.</small></div>
                </Link>
                <Link to="/information" className="mop-news-item">
                  <div className="mop-news-item-icon" style={{ color: '#581C87' }}><FiHeart size={28} /></div>
                  <div className="mop-news-item-content"><h6>First Aid Manual</h6><small>Essential first aid procedures and emergency response.</small></div>
                </Link>
                <Link to="/information" className="mop-news-item">
                    <div className="mop-news-item-icon" style={{ color: '#9333EA' }}><FiStar size={28} /></div>
                  <div className="mop-news-item-content"><h6>Leadership Guide</h6><small>Training materials for team building and management.</small></div>
                </Link>
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
              <Col lg={3} md={6} key={idx} className="animate-card">
                <Link to="/about" className="mop-unit-banner" style={{ backgroundImage: `url(${unit.bg})` }}>
                  <div className="mop-unit-banner-overlay" />
                  <div className="mop-unit-banner-content">
                    <h4>{unit.name}</h4>
                    <span className="mop-unit-ages">{unit.ages}</span>
                    <p>{unit.desc}</p>
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
            {stats.map((stat, idx) => (
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
          <Button as={Link} to="/join-us" variant="light" size="lg" className="fw-semibold px-5">Apply Now <FiArrowRight className="ms-1" /></Button>
        </Container>
      </section>
    </div>
  )
}
