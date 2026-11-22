import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { FiAward, FiTrendingUp, FiTarget } from 'react-icons/fi'
import api from '../../services/api'
import DocumentCard from '../../components/DocumentCard'

// Every resource comes from the dashboard (Library); only Published ones are shown.
export default function Portfolio() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api.get('/library', { params: { limit: 100 } })
      .then(res => setProjects((res.data.data || []).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category || 'General',
        impact: r.author ? `By ${r.author}` : '',
        desc: r.description || '',
        file: r.file_path || '',
      }))))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
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
          ) : projects.length === 0 ? (
            <p className="text-center text-muted py-5 mb-0">
              {failed ? 'The library could not be loaded. Please try again later.' : 'New resources will appear here soon.'}
            </p>
          ) : (
            <Row className="g-4 animate-row">
              {projects.map((project) => (
                <Col lg={4} md={6} key={project.id} className="animate-card">
                  <DocumentCard
                    title={project.title}
                    category={project.category}
                    subtitle={project.impact}
                    description={project.desc}
                    href={project.file ? encodeURI(project.file) : ''}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    </div>
  )
}
