import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Form, Button, Spinner, Badge } from 'react-bootstrap'
import { FiSearch, FiCalendar, FiArrowRight } from 'react-icons/fi'
import api from '../../services/api'
import { NEWS_PHOTO, newsDate, summary } from '../../utils/news'

const PAGE_SIZE = 9

// Published news, newest first, with category filters and search.
export default function News() {
  const [stories, setStories] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [typed, setTyped] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.get('/posts', { params: { page, limit: PAGE_SIZE, category: category || undefined, search: search || undefined } })
      .then(res => {
        if (!alive) return
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        setStories(prev => (page === 1 ? list : [...prev, ...list]))
        setTotal(res.data.total || 0)
        setCategories(res.data.categories || [])
      })
      .catch(() => { if (alive && page === 1) setStories([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [page, category, search])

  const choose = (c) => { setCategory(c); setPage(1) }
  const find = (e) => { e.preventDefault(); setSearch(typed.trim()); setPage(1) }

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '3.5rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg5.jpeg')" }}></div>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>News</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Stories, activities and achievements from Messengers of Peace
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          <Form onSubmit={find} className="mx-auto mb-3" style={{ maxWidth: 520 }}>
            <div className="d-flex gap-2">
              <Form.Control type="search" value={typed} onChange={e => setTyped(e.target.value)} placeholder="Search the news" aria-label="Search the news" maxLength={100} />
              <Button type="submit" variant="primary" aria-label="Search"><FiSearch /></Button>
            </div>
          </Form>
          <div className="d-flex flex-wrap gap-2 mb-4 justify-content-center">
            {['', ...categories].map(c => (
              <button key={c || 'all'} className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => choose(c)}>
                {c || 'All'}
              </button>
            ))}
          </div>

          {search && <p className="text-center text-muted small">Results for "{search}" · <button className="btn btn-link btn-sm p-0" onClick={() => { setSearch(''); setTyped(''); setPage(1) }}>clear</button></p>}

          <Row className="g-4">
            {stories.map(s => (
              <Col md={6} lg={4} key={s.id}>
                <Link to={`/news/${s.slug}`} className="text-decoration-none">
                  <div className="activity-card h-100">
                    <div className="activity-image">
                      <img src={s.featured_image || NEWS_PHOTO} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                    <div className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                        {s.category && <Badge bg="primary">{s.category}</Badge>}
                        <small className="text-muted"><FiCalendar className="me-1" />{newsDate(s.published_at)}</small>
                      </div>
                      <h5 className="text-dark">{s.title}</h5>
                      <p className="text-muted small mb-2">{summary(s)}</p>
                      <span className="small fw-semibold">Read more <FiArrowRight /></span>
                    </div>
                  </div>
                </Link>
              </Col>
            ))}
          </Row>

          {loading && <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>}
          {!loading && stories.length === 0 && (
            <p className="text-center text-muted py-5">{search || category ? 'No stories found.' : 'News will appear here soon.'}</p>
          )}
          {!loading && stories.length < total && (
            <div className="text-center mt-4">
              <Button variant="outline-primary" onClick={() => setPage(p => p + 1)}>Load more</Button>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}
