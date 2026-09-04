import { useState, useEffect } from 'react'
import { Container, Row, Col, Badge } from 'react-bootstrap'
import { FiAward, FiTrendingUp, FiTarget, FiDownload } from 'react-icons/fi'
import api from '../../services/api'

const FALLBACK_PROJECTS = [
  {
    title: 'First Aid for Scouts',
    category: 'Safety',
    status: 'Published',
    impact: 'Emergency preparedness training',
    desc: 'First Aid training manual for scouts covering emergency response, wound care, and rescue techniques.',
    file: '/portfolio/FIRST AID FOR SCOUTS.pptx',
  },
  {
    title: 'Food for Life - Scouts Practical Guide',
    category: 'Environment',
    status: 'Published',
    impact: 'Sustainable agriculture training',
    desc: 'Training manual on soil health, organic inputs, and sustainable crop protection for scouts.',
    file: '/portfolio/FOOD FOR LIFE- A SCOUTS\u2019 PRACTICAL GUIDE          Training Manual on Soil Health, Organic Inputs, and          Sustainable Crop Protection  .pdf',
  },
  {
    title: 'Growth and Social Impact',
    category: 'Education',
    status: 'Published',
    impact: 'Social impact awareness',
    desc: 'RSA presentation on growth and social impact initiatives - October 2025.',
    file: '/portfolio/Growth and Social Impact. RSA Oct 2025.pptx',
  },
  {
    title: 'Working with Children and Young People',
    category: 'Training',
    status: 'Published',
    impact: 'Youth development training',
    desc: 'Guide for working effectively with children and young people in scouting activities.',
    file: '/portfolio/WORKING WITH CHILDREN AND YOUNG PEOPLE (1).pptx',
  },
  {
    title: "WOSM's Education Initiative",
    category: 'Education',
    status: 'Published',
    impact: 'Global scouting education',
    desc: "Presentation on WOSM's global education initiative for scouting organizations worldwide.",
    file: "/portfolio/WOSM'S Education Initiative.pptx",
  },
  {
    title: 'Scouting Activity Document',
    category: 'Service',
    status: 'Published',
    impact: 'Community service resource',
    desc: 'Additional scouting activity documentation and guidelines.',
    file: '/portfolio/doc_1787157106_760.pdf',
  },
]

export default function Portfolio() {
  const [projects, setProjects] = useState(FALLBACK_PROJECTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await api.get('/library')
        if (res.data.success && res.data.data.length > 0) {
          const apiProjects = res.data.data.map((r) => ({
            title: r.title,
            category: r.category || 'General',
            status: r.status || 'Published',
            impact: r.author || r.file_type || 'Resource',
            desc: r.description || '',
            file: r.file_path || '#',
          }))
          setProjects([...apiProjects, ...FALLBACK_PROJECTS])
        }
      } catch (err) {
        // fallback already set
      } finally {
        setLoading(false)
      }
    }
    fetchLibrary()
  }, [])

  const categories = [...new Set(projects.map((p) => p.category))]

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg6.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg2.jpeg')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Our Library</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              A showcase of our training materials, guides, and community impact resources
            </p>
          </div>
        </Container>
      </section>

      {/* Impact Summary */}
      <section className="py-4" style={{ backgroundColor: '#f8f5ff' }}>
        <Container>
          <Row className="text-center g-4 animate-row">
            <Col md={4} className="animate-card">
              <FiTarget size={36} className="animate-icon" style={{ color: '#6B21A8' }} />
              <h3 className="fw-bold mt-2 animate-number" style={{ color: '#6B21A8' }}>{projects.length}</h3>
              <p className="text-muted mb-0">Resources Available</p>
            </Col>
            <Col md={4} className="animate-card">
              <FiTrendingUp size={36} className="animate-icon" style={{ color: '#6B21A8' }} />
              <h3 className="fw-bold mt-2 animate-number" style={{ color: '#6B21A8' }}>{categories.length}</h3>
              <p className="text-muted mb-0">Training Categories</p>
            </Col>
            <Col md={4} className="animate-card">
              <FiAward size={36} className="animate-icon" style={{ color: '#6B21A8' }} />
              <h3 className="fw-bold mt-2 animate-number" style={{ color: '#6B21A8' }}>100%</h3>
              <p className="text-muted mb-0">Free to Download</p>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#6B21A8' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading library resources...</p>
            </div>
          ) : (
            <Row className="g-4 animate-row">
              {projects.map((project, idx) => (
                <Col lg={4} md={6} key={idx} className="animate-card">
                  <div className="mop-card h-100">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg="success">
                          {project.status}
                        </Badge>
                        <small className="text-muted">{project.category}</small>
                      </div>
                      <h5 className="mt-2">{project.title}</h5>
                      <p className="text-muted small flex-grow-1">{project.desc}</p>
                      <div className="d-flex align-items-center gap-2 mt-auto">
                        <FiTrendingUp style={{ color: '#6B21A8' }} />
                        <span className="fw-bold small" style={{ color: '#6B21A8' }}>
                          {project.impact}
                        </span>
                      </div>
                      <a className="btn btn-sm btn-primary mt-3" href={project.file} download>
                        <FiDownload className="me-1" /> Download
                      </a>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    </div>
  )
}
