import { useState } from 'react'
import { Container, Row, Col, Modal, Button } from 'react-bootstrap'
import { FiBookOpen, FiFileText, FiDownload, FiEye, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

const DOCUMENTS = [
  { id: 1, title: 'FA Posters Rwanda', desc: 'First Aid posters for Rwanda scouting activities.', category: 'Safety', color: '#581C87', file: '/information/2020_032_Posters-FA_A2_Rwanda_RW_LR.pdf' },
  { id: 2, title: 'ABAHIZI Draft 4', desc: 'ABAHIZI draft document - version 4.', category: 'Guide', color: '#6B21A8', file: '/information/3. ABAHIZI  -DRAFT 4.pdf' },
  { id: 3, title: 'ABAHIZI Volume 3 Edition 2', desc: 'ABAHIZI publication volume 3, edition 2.', category: 'Guide', color: '#6B21A8', file: '/information/ABAHIZI%20%20Vol3,ed2.pdf.pdf' },
  { id: 4, title: 'Counselling Guide', desc: 'Counselling guide for scout leaders and members.', category: 'Training', color: '#9333EA', file: '/information/Consouling.pdf' },
  { id: 5, title: 'Religious Dimension of Scouting Pedagogy', desc: 'Exploring the religious and spiritual dimensions of the scouting educational method.', category: 'Guide', color: '#6B21A8', file: '/information/DIMENSION-RELIGIEUSE-DE-LA-PEDAGOGIE-SCOUTE (1).pdf' },
  { id: 6, title: 'Growth and Social Impact', desc: 'RSA presentation on growth and social impact - October 2025.', category: 'Training', color: '#9333EA', file: '/information/Growth and Social Impact. RSA Oct 2025 - Copy.pptx' },
  { id: 7, title: 'GUTEGURA IGIKORWA', desc: 'GUTEGURA IGIKORWA operational guide.', category: 'Service', color: '#7C3AED', file: '/information/GUTEGURA IGIKORWA (1).doc' },
  { id: 8, title: 'Ifirimbi', desc: 'Ifirimbi scouting publication.', category: 'Official', color: '#7c3aed', file: '/information/ifirimbi.pdf' },
  { id: 9, title: 'Heritage from the Liberation War', desc: 'Discussion on heritage from the liberation war and stopping genocide.', category: 'Official', color: '#7c3aed', file: '/information/Ikiganiro umurage tuvoma mu rugamba rwo kubohora u Rwanda, guhagarika jenoside(2).pdf' },
  { id: 10, title: 'Ikoraniro', desc: 'Ikoraniro scouting activity guide.', category: 'Skills', color: '#6D28D9', file: '/information/ikoraniro.pdf' },
  { id: 11, title: 'Les Journees Mondiales (Copy)', desc: 'World days reference document - copy version.', category: 'Official', color: '#7c3aed', file: '/information/LES JOURNEES MONDIALES - Copy.docx' },
  { id: 12, title: 'Les Journees Mondiales', desc: 'World days official document.', category: 'Official', color: '#7c3aed', file: '/information/LES JOURNEES MONDIALES.docx' },
  { id: 13, title: 'Rover Guidelines EN', desc: 'Rover scout guidelines - English version.', category: 'Guide', color: '#6B21A8', file: '/information/Rover Guidelines EN (1).pdf' },
  { id: 14, title: 'Rover Guidelines', desc: 'Rover scout official guidelines.', category: 'Guide', color: '#6B21A8', file: '/information/Rover Guidelines EN.pdf' },
  { id: 15, title: 'Youth Programme Educational Activities', desc: 'Session guide for educational activities within the Youth Programme.', category: 'Training', color: '#9333EA', file: '/information/Session -Educ Activities  (Youth Programme).pdf' },
  { id: 16, title: 'Urubuto Protocol Agency Concept Note', desc: 'Concept note for the Urubuto Protocol Agency initiative.', category: 'Service', color: '#7C3AED', file: '/information/urubuto_protocol_agency_concept_note.pdf' },
  { id: 17, title: 'World Days Calendar', desc: 'Complete calendar of international and scouting world days.', category: 'Official', color: '#7c3aed', file: '/information/World_Days_Calendar_Full.pdf' },
]

export default function Information() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'chief'
  const [books, setBooks] = useState(DOCUMENTS)

  const [showPreview, setShowPreview] = useState(false)
  const [previewBook, setPreviewBook] = useState(null)

  const handlePreview = (book) => {
    setPreviewBook(book)
    setShowPreview(true)
  }

  const handleDelete = (id) => {
    setBooks(books.filter(b => b.id !== id))
  }

  const getCategoryIcon = (cat) => {
    const map = {
      Guide: <FiBookOpen />,
      Safety: <FiFileText />,
      Service: <FiFileText />,
      Skills: <FiBookOpen />,
      Training: <FiBookOpen />,
      Official: <FiFileText />,
    }
    return map[cat] || <FiBookOpen />
  }

  return (
    <div>
      {/* Hero */}
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg4.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg2.PNG')" }}></div>
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
      <section className="py-5">
        <Container>
          <Row className="align-items-center mb-4 animate-row">
            <Col md={8}>
              <h2 className="section-title mb-2 animate-section-title">Document Library</h2>
              <p className="text-muted mb-0">Browse and download essential scouting materials and guides.</p>
            </Col>
          </Row>

          {/* Books Grid */}
          <Row className="g-4 animate-row">
            {books.map((book) => (
              <Col lg={4} md={6} key={book.id} className="animate-card">
                <div className="mop-card h-100" style={{ borderTop: `4px solid ${book.color}` }}>
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-start mb-3">
                      <div
                        className="d-flex align-items-center justify-content-center me-3"
                        style={{
                          width: 56, height: 56, borderRadius: 12,
                          background: `linear-gradient(135deg, ${book.color}22, ${book.color}44)`,
                          color: book.color, flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{getCategoryIcon(book.category)}</span>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-1" style={{ color: book.color }}>{book.title}</h5>
                        <div className="d-flex gap-2 align-items-center">
                          <span className="badge" style={{ background: book.color + '22', color: book.color }}>{book.category}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted small flex-grow-1">{book.desc}</p>
                    <div className="d-flex gap-2 mt-auto">
                      <button className="btn btn-sm btn-outline-primary flex-grow-1" onClick={() => handlePreview(book)}>
                        <FiEye className="me-1" /> View
                      </button>
                      <a className="btn btn-sm btn-primary flex-grow-1" href={book.file} download>
                        <FiDownload className="me-1" /> Download
                      </a>
                      {isAdmin && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(book.id)}>
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{previewBook?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewBook && (
            <div>
              <div className="d-flex align-items-center gap-3 mb-3">
                <span className="badge fs-6" style={{ background: previewBook.color }}>{previewBook.category}</span>
                {previewBook.file && <small className="text-muted"><FiFileText className="me-1" />{previewBook.file.split('/').pop()}</small>}
              </div>
              <p>{previewBook.desc}</p>
              <div className="p-5 text-center bg-light rounded">
                <FiBookOpen size={64} style={{ color: previewBook.color }} className="mb-3" />
                <h5>{previewBook.title}</h5>
                <p className="text-muted">Click the download button below to save this document.</p>
                <a className="btn btn-primary" href={previewBook.file} download style={{ background: previewBook.color, borderColor: previewBook.color }}>
                  <FiDownload className="me-1" /> Download Document
                </a>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

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
