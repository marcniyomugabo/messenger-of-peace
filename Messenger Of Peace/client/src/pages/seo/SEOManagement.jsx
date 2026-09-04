import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiGlobe } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const PREDEFINED_SLUGS = ['home', 'about', 'activities', 'library', 'gallery', 'contact', 'join-us', 'leadership', 'information']

export default function SEOManagement() {
  const [pages, setPages] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    page_slug: '', title: '', description: '', keywords: '', og_image: '', canonical_url: ''
  })

  useEffect(() => { fetchPages() }, [])

  const fetchPages = async () => {
    try {
      const res = await api.get('/seo')
      const data = res.data.data || res.data || []
      setPages(Array.isArray(data) ? data : [])
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/seo/${form.page_slug}`, form)
      toast.success(editItem ? 'SEO config updated' : 'SEO config created')
      setShowModal(false)
      resetForm()
      fetchPages()
    } catch {
      toast.error('Operation failed')
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      page_slug: item.page_slug || '',
      title: item.title || '',
      description: item.description || '',
      keywords: item.keywords || '',
      og_image: item.og_image || '',
      canonical_url: item.canonical_url || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (slug) => {
    if (!window.confirm('Delete SEO configuration for this page?')) return
    try {
      await api.delete(`/seo/${slug}`)
      toast.success('Deleted')
      fetchPages()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const resetForm = () => {
    setEditItem(null)
    setForm({ page_slug: '', title: '', description: '', keywords: '', og_image: '', canonical_url: '' })
  }

  const filteredPages = pages.filter(p => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (p.page_slug || '').toLowerCase().includes(term)
      || (p.title || '').toLowerCase().includes(term)
      || (p.description || '').toLowerCase().includes(term)
  })

  const totalPages = pages.length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiGlobe className="me-2" /> SEO Management</h4>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add SEO Config
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={12}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{totalPages}</div>
            <div className="kpi-label">Total Pages Configured</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="d-flex align-items-center mb-3 px-3 pt-3">
          <div className="input-group" style={{ maxWidth: 400 }}>
            <span className="input-group-text"><FiSearch /></span>
            <Form.Control
              placeholder="Search by slug, title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Page Slug</th>
                <th>Title</th>
                <th>Description</th>
                <th>Keywords</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((p, idx) => (
                <tr key={p.page_slug || idx}>
                  <td>{idx + 1}</td>
                  <td><Badge bg="info">{p.page_slug}</Badge></td>
                  <td className="fw-semibold">{p.title}</td>
                  <td style={{ maxWidth: 300 }}>
                    {p.description ? p.description.substring(0, 60) + (p.description.length > 60 ? '...' : '') : '-'}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    {p.keywords
                      ? p.keywords.split(',').slice(0, 3).map((k, i) => (
                        <Badge key={i} bg="secondary" className="me-1 mb-1">{k.trim()}</Badge>
                      )).concat(p.keywords.split(',').length > 3 ? [<Badge key="more" bg="light" text="dark">+{p.keywords.split(',').length - 3}</Badge>] : [])
                      : <span className="text-muted">-</span>
                    }
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(p)}><FiEdit2 /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(p.page_slug)}><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPages.length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No SEO configurations found'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit SEO Configuration' : 'Add SEO Configuration'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Page Slug *</Form.Label>
              <Form.Control
                name="page_slug"
                value={form.page_slug}
                onChange={handleChange}
                placeholder="e.g. home, about, activities"
                required
                disabled={!!editItem}
                list="slug-suggestions"
              />
              <datalist id="slug-suggestions">
                {PREDEFINED_SLUGS.map(s => <option key={s} value={s} />)}
              </datalist>
              <small className="text-muted">
                Unique page identifier. Suggestions: {PREDEFINED_SLUGS.join(', ')}
              </small>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>SEO Title *</Form.Label>
              <Form.Control name="title" value={form.title} onChange={handleChange} required placeholder="Page title shown in search results" />
              <small className="text-muted">Recommended: 50-60 characters. This appears as the clickable headline in search results.</small>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Meta Description *</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} required placeholder="Brief description of the page content" />
              <small className="text-muted">Recommended: 150-160 characters. This appears below the title in search results.</small>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Keywords</Form.Label>
              <Form.Control name="keywords" value={form.keywords} onChange={handleChange} placeholder="e.g. scouts, community, peace, youth" />
              <small className="text-muted">Comma-separated keywords for meta tags. Helps search engines understand page topics.</small>
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>OG Image URL</Form.Label>
                  <Form.Control name="og_image" value={form.og_image} onChange={handleChange} placeholder="https://example.com/image.jpg" />
                  <small className="text-muted">Image shown when page is shared on social media. Recommended: 1200x630px.</small>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Canonical URL</Form.Label>
                  <Form.Control name="canonical_url" value={form.canonical_url} onChange={handleChange} placeholder="https://example.com/page" />
                  <small className="text-muted">The preferred URL for this page. Helps prevent duplicate content issues.</small>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editItem ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
