import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container, Row, Col, Badge, Spinner } from 'react-bootstrap'
import { FiArrowLeft, FiCalendar, FiShare2 } from 'react-icons/fi'
import api from '../../services/api'
import { newsDate, paragraphs } from '../../utils/news'

// One news story. The text is plain paragraphs, shown as text (nothing in it can run).
export default function NewsStory() {
  const { slug } = useParams()
  const [story, setStory] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing

  useEffect(() => {
    let alive = true
    setState('loading')
    api.get(`/posts/${encodeURIComponent(slug)}`)
      .then(res => { if (alive) { setStory(res.data.data); setState('ok'); document.title = `${res.data.data.title} | Messengers of Peace` } })
      .catch(() => { if (alive) setState('missing') })
    return () => { alive = false; document.title = 'Messengers of Peace Scout Group' }
  }, [slug])

  if (state === 'loading') return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
  if (state === 'missing') {
    return (
      <Container className="py-5 text-center">
        <h3>Story not found</h3>
        <p className="text-muted">It may have been removed.</p>
        <Link to="/news" className="btn btn-primary">See all news</Link>
      </Container>
    )
  }

  const url = window.location.href
  const share = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${story.title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  }

  return (
    <article className="py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>
            <Link to="/news" className="small"><FiArrowLeft className="me-1" />All news</Link>
            <div className="d-flex flex-wrap gap-2 align-items-center mt-3 mb-2">
              {story.category && <Badge bg="primary">{story.category}</Badge>}
              <small className="text-muted"><FiCalendar className="me-1" />{newsDate(story.published_at)}</small>
            </div>
            <h1 className="mb-4" style={{ color: 'var(--mop-dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>{story.title}</h1>
            {story.featured_image && (
              <img src={story.featured_image} alt="" className="w-100 rounded-4 mb-4" style={{ maxHeight: 460, objectFit: 'cover' }} />
            )}
            {story.excerpt && <p className="lead">{story.excerpt}</p>}
            {paragraphs(story.content).map((p, i) => (
              <p key={i} style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{p}</p>
            ))}
            <hr className="my-4" />
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="small text-muted"><FiShare2 className="me-1" />Share:</span>
              <a className="btn btn-sm btn-outline-success" href={share.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a className="btn btn-sm btn-outline-primary" href={share.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
            </div>
          </Col>
        </Row>
      </Container>
    </article>
  )
}
