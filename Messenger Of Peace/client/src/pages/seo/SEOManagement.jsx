import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiEdit2, FiRotateCcw, FiGlobe, FiExternalLink } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { SEO_PAGES, SITE_NAME } from '../../utils/seo'

const EMPTY = { page_slug: '', title: '', description: '', keywords: '', og_image: '', canonical_url: '' }

// Every public page with the title and description search engines see. A page without its own
// settings uses the built-in default (shown in grey); "Reset" goes back to it.
export default function SEOManagement() {
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchPages = async () => {
    try {
      const res = await api.get('/seo')
      setSaved(Object.fromEntries((res.data.data || []).map(r => [r.page_slug, r])))
    } catch {
      setSaved({})
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchPages() }, [])

  const defaultTitle = (slug) => (slug === 'home' ? SITE_NAME : `${SEO_PAGES[slug].title} | ${SITE_NAME}`)

  const openEdit = (slug) => {
    const s = saved[slug] || {}
    setForm({
      page_slug: slug,
      title: s.title || defaultTitle(slug),
      description: s.description || SEO_PAGES[slug].description,
      keywords: s.keywords || '', og_image: s.og_image || '', canonical_url: s.canonical_url || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/seo/${form.page_slug}`, form)
      toast.success('Saved. The website uses it from the next page load.')
      setShowModal(false)
      fetchPages()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async (slug) => {
    if (!window.confirm(`Go back to the built-in title and description for "${SEO_PAGES[slug].title}"?`)) return
    try {
      await api.delete(`/seo/${slug}`)
      toast.success('Back to the default')
      fetchPages()
    } catch {
      toast.error('Could not reset')
    }
  }

  const count = (text, good) => (
    <small className={text.length > good ? 'text-danger' : 'text-muted'}>{text.length} / {good} characters recommended</small>
  )

  return (
    <div>
      <div className="mb-4">
        <h4 className="mb-1"><FiGlobe className="me-2" /> SEO (search engines)</h4>
        <p className="text-muted small mb-0">
          The title and description Google shows for each page of the website, and the picture used when a link is shared.
          Pages without their own settings use a built-in default (in grey).
        </p>
      </div>

      <div className="mop-card mop-card-static">
        <div className="table-responsive">
          <Table className="mop-table mb-0 align-middle">
            <thead>
              <tr><th>Page</th><th>Title</th><th>Description</th><th></th></tr>
            </thead>
            <tbody>
              {Object.entries(SEO_PAGES).map(([slug, page]) => {
                const s = saved[slug]
                return (
                  <tr key={slug}>
                    <td className="text-nowrap">
                      <div className="fw-semibold">{page.title === SITE_NAME ? 'Home' : page.title}</div>
                      <a href={page.path} target="_blank" rel="noopener noreferrer" className="small text-muted">{page.path} <FiExternalLink size={11} /></a>
                    </td>
                    <td className={s?.title ? 'fw-semibold' : 'text-muted'}>{s?.title || defaultTitle(slug)}</td>
                    <td className={s?.description ? '' : 'text-muted'} style={{ maxWidth: 360 }}>
                      <span className="small">{(s?.description || page.description).slice(0, 110)}{(s?.description || page.description).length > 110 ? '…' : ''}</span>
                    </td>
                    <td className="text-end text-nowrap">
                      {s ? <Badge bg="success" className="me-2">Custom</Badge> : <Badge bg="light" text="dark" className="me-2">Default</Badge>}
                      <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => openEdit(slug)} title="Edit"><FiEdit2 /></Button>
                      {s && <Button variant="outline-danger" size="sm" onClick={() => resetToDefault(slug)} title="Back to the default"><FiRotateCcw /></Button>}
                    </td>
                  </tr>
                )
              })}
              {loading && <tr><td colSpan="4" className="text-center text-muted py-3">Loading…</td></tr>}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>SEO: {form.page_slug && (SEO_PAGES[form.page_slug].title === SITE_NAME ? 'Home' : SEO_PAGES[form.page_slug].title)}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control name="title" value={form.title} maxLength={255} required onChange={e => setForm({ ...form, title: e.target.value })} />
              {count(form.title, 60)}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.description} required onChange={e => setForm({ ...form, description: e.target.value })} />
              {count(form.description, 160)}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Keywords</Form.Label>
              <Form.Control value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="e.g. scouts, Kigali, youth, peace" />
              <small className="text-muted">Optional. Most search engines ignore these today.</small>
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Picture for shared links</Form.Label>
                  <Form.Control value={form.og_image} onChange={e => setForm({ ...form, og_image: e.target.value })} placeholder="/images/bg1.PNG or https://…" />
                  <small className="text-muted">Optional. Best size 1200 × 630. Empty: the group's logo.</small>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Main address of this page</Form.Label>
                  <Form.Control value={form.canonical_url} onChange={e => setForm({ ...form, canonical_url: e.target.value })} placeholder="https://your-domain.rw/about" />
                  <small className="text-muted">Optional. Leave empty unless the page has two addresses.</small>
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-3 p-3 rounded" style={{ background: '#F9FAFB' }}>
              <div className="small text-muted mb-1">Preview in Google</div>
              <div style={{ color: '#1a0dab', fontSize: '1.05rem' }}>{form.title || '…'}</div>
              <div className="small" style={{ color: '#4d5156' }}>{form.description.slice(0, 160)}{form.description.length > 160 ? '…' : ''}</div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
