import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { ABOUT_SECTIONS, ABOUT_SECTION_BY_KEY } from '../../config/aboutSections'

export default function AboutContentManagement() {
  const [sections, setSections] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    section_key: '', title: '', content: '', image: '', sort_order: 0, is_active: 1
  })

  useEffect(() => { fetchSections() }, [])

  const fetchSections = async () => {
    try {
      const res = await api.get('/about/admin')
      const data = res.data.data || res.data || []
      setSections(Array.isArray(data) ? data : [])
    } catch {
      setSections([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/about/${form.section_key}`, form)
      toast.success(editItem ? 'Section updated' : 'Section created')
      setShowModal(false)
      resetForm()
      fetchSections()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      section_key: item.section_key || '',
      title: item.title || '',
      content: item.content || '',
      image: item.image || '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== undefined ? item.is_active : 1
    })
    setShowModal(true)
  }

  const handleDelete = async (sectionKey) => {
    if (!window.confirm('Delete this section?')) return
    try {
      await api.delete(`/about/${sectionKey}`)
      toast.success('Deleted')
      fetchSections()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const toggleActive = async (item) => {
    try {
      await api.put(`/about/${item.section_key}`, { ...item, is_active: item.is_active ? 0 : 1 })
      toast.success('Status updated')
      fetchSections()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const resetForm = () => {
    setEditItem(null)
    setForm({ section_key: '', title: '', content: '', image: '', sort_order: 0, is_active: 1 })
  }

  const sorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const totalSections = sections.length
  const activeSections = sections.filter(s => s.is_active === 1 || s.is_active === true).length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiFileText className="me-2" /> About Content Management</h4>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Section
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{totalSections}</div>
            <div className="kpi-label">Total Sections</div>
          </div>
        </Col>
        <Col md={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{activeSections}</div>
            <div className="kpi-label">Active Sections</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Page block</th>
                <th>Title</th>
                <th>Content</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => (
                <tr key={s.section_key || idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="fw-semibold small">{ABOUT_SECTION_BY_KEY[s.section_key]?.label || 'Not shown on the page'}</div>
                    <Badge bg="info">{s.section_key}</Badge>
                  </td>
                  <td className="fw-semibold">{s.title}</td>
                  <td style={{ maxWidth: 300 }}>
                    {s.content ? s.content.substring(0, 80) + (s.content.length > 80 ? '...' : '') : '-'}
                  </td>
                  <td>
                    <Form.Check
                      type="switch"
                      checked={s.is_active === 1 || s.is_active === true}
                      onChange={() => toggleActive(s)}
                    />
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(s)}><FiEdit2 /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(s.section_key)}><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sections.length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No sections found'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Section' : 'Add Section'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Page block *</Form.Label>
              <Form.Select name="section_key" value={form.section_key} onChange={handleChange} required disabled={!!editItem}>
                <option value="">Choose the block of the About page</option>
                {ABOUT_SECTIONS.filter(s => editItem || !sections.some(x => x.section_key === s.key)).map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
                {editItem && !ABOUT_SECTION_BY_KEY[form.section_key] && <option value={form.section_key}>{form.section_key}</option>}
              </Form.Select>
            </Form.Group>
            <div className="alert alert-light border small mb-3">
              <strong>How to write it:</strong>{' '}
              {ABOUT_SECTION_BY_KEY[form.section_key]?.help || 'Choose a block to see its format.'}
              <div className="text-muted mt-1">
                Paragraphs: separate them with an empty line. List item: start the line with "- ".
                Card: put its parts on one line separated by " | ".
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control name="title" value={form.title} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control as="textarea" rows={10} name="content" value={form.content} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Image</Form.Label>
              <Form.Control name="image" value={form.image} onChange={handleChange} placeholder="/images/scout.JPEG" />
              <Form.Text className="text-muted">Only used by the Introduction block.</Form.Text>
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sort Order</Form.Label>
                  <Form.Control type="number" name="sort_order" value={form.sort_order} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <Form.Check type="switch" label="Active" name="is_active" checked={!!form.is_active} onChange={handleChange} />
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
