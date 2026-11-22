import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import api from '../../services/api'
import DocumentCard from '../../components/DocumentCard'

// Documents come from the dashboard (Information). File links are encoded because
// some file names contain spaces, commas or even a literal '%'.
export default function Information() {
  const [books, setBooks] = useState([])

  useEffect(() => {
    api.get('/information')
      .then(res => setBooks((res.data.data || []).map(d => ({
        id: d.id,
        title: d.title,
        desc: d.description || '',
        category: d.category || 'Guide',
        file: d.file_path ? encodeURI(d.file_path) : '',
      }))))
      .catch(() => setBooks([]))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg4.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg2.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg5.jpeg')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Information Center</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Access and share scouting resources, handbooks, and official documents
            </p>
          </div>
        </Container>
      </section>

      {/* Document Library */}
      <section className="py-5" style={{ background: 'var(--mop-bg)' }}>
        <Container>
          <Row className="align-items-center mb-4 animate-row">
            <Col md={8}>
              <h2 className="section-title mb-2 animate-section-title">Document Library</h2>
              <p className="text-muted mb-0">Browse and download essential scouting materials and guides. PDF documents can also be opened in your browser.</p>
            </Col>
          </Row>

          <Row className="g-4 animate-row">
            {books.map((book) => (
              <Col lg={4} md={6} key={book.id} className="animate-card">
                <DocumentCard title={book.title} category={book.category} description={book.desc} href={book.file} />
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Info CTA */}
      <section className="py-5" style={{ background: 'var(--mop-gradient)' }}>
        <Container className="text-center">
          <h2 className="text-white mb-3 animate-section-title">Need Help?</h2>
          <p className="text-white-50 mb-4 animate-fade-up" style={{ maxWidth: 500, margin: '0 auto' }}>
            Contact our board members team for guidance on any scouting materials or resources.
          </p>
          <a href="/contact" className="btn btn-light btn-lg animate-card">
            Contact Us
          </a>
        </Container>
      </section>
    </div>
  )
}
