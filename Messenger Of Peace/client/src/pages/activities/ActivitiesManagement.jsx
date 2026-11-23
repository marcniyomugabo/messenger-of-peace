import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiEye, FiEyeOff, FiArchive } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function ActivitiesManagement() {
  const [activities, setActivities] = useState([])
  const [categories, setCategories] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', short_description: '', cover_image: '', location: '',
    category: '', start_date: '', end_time: '', status: 'draft', is_featured: 0,
    registration_enabled: 0, max_participants: ''
  })

  useEffect(() => { fetchActivities(); fetchCategories() }, [])

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities/admin')
      const data = res.data.data || res.data || []
      setActivities(Array.isArray(data) ? data : [])
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await api.get('/activities/categories')
      const data = res.data.data || res.data || []
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      setCategories([])
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value })
  }

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return
    try {
      const res = await api.post('/activities/categories', { name: newCategory.trim() })
      const created = res.data.data || res.data
      setCategories([...categories, created])
      setForm({ ...form, category: created.name || newCategory.trim() })
      setNewCategory('')
      setShowCategoryInput(false)
      toast.success('Category created')
    } catch {
      toast.error('Failed to create category')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editItem) {
        await api.put(`/activities/${editItem.id}`, form)
        toast.success('Activity updated')
      } else {
        await api.post('/activities', form)
        toast.success('Activity created')
      }
      setShowModal(false)
      resetForm()
      fetchActivities()
    } catch {
      toast.error('Operation failed')
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      title: item.title || '', description: item.description || '',
      short_description: item.short_description || '', cover_image: item.cover_image || '',
      location: item.location || '', category: item.category || '',
      start_date: item.start_date ? item.start_date.substring(0, 10) : '',
      end_time: item.end_time || '', status: item.status || 'draft',
      is_featured: item.is_featured || 0, registration_enabled: item.registration_enabled || 0,
      max_participants: item.max_participants || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this activity?')) return
    try {
      await api.delete(`/activities/${id}`)
      toast.success('Deleted')
      fetchActivities()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const togglePublish = async (item) => {
    try {
      const newStatus = item.status === 'published' ? 'draft' : 'published'
      await api.put(`/activities/${item.id}`, { status: newStatus })
      toast.success(`Activity ${newStatus === 'published' ? 'published' : 'unpublished'}`)
      fetchActivities()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleArchive = async (item) => {
    try {
      await api.put(`/activities/${item.id}`, { status: 'archived' })
      toast.success('Activity archived')
      fetchActivities()
    } catch {
      toast.error('Failed to archive')
    }
  }

  const resetForm = () => {
    setEditItem(null)
    setForm({
      title: '', description: '', short_description: '', cover_image: '', location: '',
      category: '', start_date: '', end_time: '', status: 'draft', is_featured: 0,
      registration_enabled: 0, max_participants: ''
    })
  }

  const statusBadge = (status) => {
    const variants = { published: 'success', draft: 'warning', archived: 'secondary' }
    return <Badge bg={variants[status] || 'secondary'}>{status || 'draft'}</Badge>
  }

  const filtered = activities.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const published = activities.filter(a => a.status === 'published').length
  const drafts = activities.filter(a => a.status === 'draft').length
  const archived = activities.filter(a => a.status === 'archived').length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiCalendar className="me-2" /> Activities Management</h4>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>
          <FiPlus className="me-1" /> New Activity
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{activities.length}</div>
            <div className="kpi-label">Total Activities</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{published}</div>
            <div className="kpi-label">Published</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#EAB308' }}>
            <div className="kpi-value" style={{ color: '#EAB308' }}>{drafts}</div>
            <div className="kpi-label">Draft</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B7280' }}>
            <div className="kpi-value" style={{ color: '#6B7280' }}>{archived}</div>
            <div className="kpi-label">Archived</div>
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Control placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </Col>
        <Col md={3}>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Form.Select>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => (
                <tr key={a.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{a.title}</td>
                  <td>{a.category || '-'}</td>
                  <td>{a.start_date ? new Date(a.start_date).toLocaleDateString() : '-'}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>
                    {a.is_featured ? <Badge bg="info">Featured</Badge> : <Badge bg="light" text="dark">No</Badge>}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(a)} title="Edit"><FiEdit2 /></Button>
                      <Button variant="outline-primary" size="sm" onClick={() => togglePublish(a)} title={a.status === 'published' ? 'Unpublish' : 'Publish'}>
                        {a.status === 'published' ? <FiEyeOff /> : <FiEye />}
                      </Button>
                      <Button variant="outline-warning" size="sm" onClick={() => handleArchive(a)} title="Archive"><FiArchive /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(a.id)} title="Delete"><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No activities found'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Activity' : 'Create Activity'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Form.Control name="title" value={form.title} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Short Description</Form.Label>
                  <Form.Control name="short_description" value={form.short_description} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cover Image URL</Form.Label>
                  <Form.Control name="cover_image" value={form.cover_image} onChange={handleChange} placeholder="https://..." />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control name="location" value={form.location} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Select name="category" value={form.category} onChange={handleChange} className="flex-grow-1">
                      <option value="">Select category</option>
                      {categories.map((c, i) => (
                        <option key={i} value={c.name || c}>{c.name || c}</option>
                      ))}
                    </Form.Select>
                    <Button variant="outline-primary" size="sm" onClick={() => setShowCategoryInput(!showCategoryInput)} type="button">
                      <FiPlus />
                    </Button>
                  </div>
                  {showCategoryInput && (
                    <div className="d-flex gap-2 mt-2">
                      <Form.Control placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                      <Button variant="primary" size="sm" onClick={handleCreateCategory} type="button">Add</Button>
                    </div>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control type="date" name="start_date" value={form.start_date} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time</Form.Label>
                  <Form.Control name="end_time" value={form.end_time} onChange={handleChange} placeholder="e.g. 5:00 PM" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Participants</Form.Label>
                  <Form.Control type="number" name="max_participants" value={form.max_participants} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check type="switch" label="Featured" name="is_featured" checked={!!form.is_featured} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check type="switch" label="Registration Enabled" name="registration_enabled" checked={!!form.registration_enabled} onChange={handleChange} />
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
