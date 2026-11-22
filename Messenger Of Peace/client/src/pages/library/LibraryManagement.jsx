import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiBook, FiDownload, FiExternalLink } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { LEADERS } from '../../config/roles'

export default function LibraryManagement() {
  const { hasRole } = useAuth()
  const canDelete = hasRole(...LEADERS) // the server lets only super admin and chief delete
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [resources, setResources] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: '', author: '', file_path: '',
    cover_image: '', file_type: 'PDF', tags: '', is_featured: 0, status: 'published'
  })

  useEffect(() => { fetchResources(); fetchCategories() }, [])

  const fetchResources = async () => {
    try {
      const res = await api.get('/library/admin')
      const data = res.data.data || res.data || []
      setResources(Array.isArray(data) ? data : [])
    } catch {
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await api.get('/library/categories')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile && !form.file_path.trim()) {
      toast.error('Choose a file to upload, or give the address of the file.')
      return
    }
    setSaving(true)
    try {
      const data = { ...form }
      // A chosen file is uploaded first; its address becomes the resource's file.
      if (selectedFile) {
        const fd = new FormData()
        fd.append('file', selectedFile)
        const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        data.file_path = up.data.data.file_path
        data.file_size = selectedFile.size
        data.file_type = typeFromName(selectedFile.name)
      }
      if (editItem) {
        await api.put(`/library/${editItem.id}`, data)
        toast.success('Resource updated')
      } else {
        await api.post('/library', data)
        toast.success('Resource created')
      }
      setShowModal(false)
      resetForm()
      fetchResources()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the resource')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      title: item.title || '', description: item.description || '',
      category: item.category || '', author: item.author || '',
      file_path: item.file_path || '', cover_image: item.cover_image || '',
      file_type: item.file_type || 'PDF', tags: item.tags || '',
      is_featured: item.is_featured || 0, status: item.status || 'published'
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    try {
      await api.delete(`/library/${id}`)
      toast.success('Deleted')
      fetchResources()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const resetForm = () => {
    setEditItem(null)
    setSelectedFile(null)
    setForm({
      title: '', description: '', category: '', author: '', file_path: '',
      cover_image: '', file_type: 'PDF', tags: '', is_featured: 0, status: 'published'
    })
  }

  // The kind of file, from its name ("guide.pdf" -> "PDF").
  const typeFromName = (name) => {
    const ext = String(name || '').split('?')[0].split('.').pop().toLowerCase()
    return { pdf: 'PDF', doc: 'Document', docx: 'Document', ppt: 'Presentation', pptx: 'Presentation', mp4: 'Video', mp3: 'Audio' }[ext] || 'Other'
  }
  const fileTypeBadge = (r) => {
    const type = typeFromName(r.file_path) !== 'Other' ? typeFromName(r.file_path) : (r.file_type || 'Other')
    const variants = { PDF: 'danger', Document: 'primary', Presentation: 'warning', Video: 'info', Audio: 'success' }
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>
  }

  // Status is stored as "Published" or "published" depending on who saved it.
  const statusOf = (s) => String(s || 'published').toLowerCase()
  const statusBadge = (status) => {
    const variants = { published: 'success', draft: 'warning', archived: 'secondary' }
    const s = statusOf(status)
    return <Badge bg={variants[s] || 'secondary'} className="text-capitalize">{s}</Badge>
  }
  const sizeText = (bytes) => {
    const n = Number(bytes)
    if (!n) return '-'
    return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
  }

  const filtered = resources.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.author?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !categoryFilter || r.category === categoryFilter
    const matchType = !fileTypeFilter || typeFromName(r.file_path) === fileTypeFilter || r.file_type === fileTypeFilter
    return matchSearch && matchCategory && matchType
  })

  const published = resources.filter(r => statusOf(r.status) === 'published').length
  const featured = resources.filter(r => r.is_featured).length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiBook className="me-2" /> Library Management</h4>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>
          <FiPlus className="me-1" /> New Resource
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{resources.length}</div>
            <div className="kpi-label">Total Resources</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{published}</div>
            <div className="kpi-label">Published</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#3B82F6' }}>
            <div className="kpi-value" style={{ color: '#3B82F6' }}>{featured}</div>
            <div className="kpi-label">Featured</div>
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Control placeholder="Search by title or author..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </Col>
        <Col md={3}>
          <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c, i) => (
              <option key={i} value={c.name || c}>{c.name || c}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={fileTypeFilter} onChange={(e) => setFileTypeFilter(e.target.value)}>
            <option value="">All File Types</option>
            <option value="PDF">PDF</option>
            <option value="Document">Document</option>
            <option value="Presentation">Presentation</option>
            <option value="Video">Video</option>
            <option value="Audio">Audio</option>
            <option value="Other">Other</option>
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
                <th>Author</th>
                <th>Category</th>
                <th>File Type</th>
                <th>Size</th>
                <th>Downloads</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={r.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{r.title}</td>
                  <td>{r.author || '-'}</td>
                  <td>{r.category || '-'}</td>
                  <td>{fileTypeBadge(r)}</td>
                  <td>{sizeText(r.file_size)}</td>
                  <td>
                    <span className="d-flex align-items-center gap-1">
                      <FiDownload size={14} /> {r.download_count || 0}
                    </span>
                  </td>
                  <td>{statusBadge(r.status)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {r.file_path && (
                        <Button variant="outline-primary" size="sm" href={encodeURI(r.file_path)} target="_blank" rel="noopener noreferrer" title="Open the file"><FiExternalLink /></Button>
                      )}
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(r)} title="Edit"><FiEdit2 /></Button>
                      {canDelete && (
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(r.id)} title="Delete"><FiTrash2 /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No resources found'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Resource' : 'New Resource'}</Modal.Title>
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
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Author</Form.Label>
                  <Form.Control name="author" value={form.author} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Control name="category" value={form.category} onChange={handleChange} placeholder="e.g. Scouting Skills" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>File *</Form.Label>
                  <Form.Control type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  <Form.Text className="text-muted">
                    {editItem && form.file_path ? <>Current file: <a href={encodeURI(form.file_path)} target="_blank" rel="noopener noreferrer">{decodeURI(form.file_path.split('/').pop())}</a>. Choose a new file only to replace it.</> : 'Upload the document (PDF, Word, PowerPoint, Excel or a picture).'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted">…or the address of a file that is already online</Form.Label>
                  <Form.Control size="sm" name="file_path" value={form.file_path} onChange={handleChange} placeholder="https://..." disabled={!!selectedFile} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Cover Image URL</Form.Label>
                  <Form.Control name="cover_image" value={form.cover_image} onChange={handleChange} placeholder="https://..." />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>File Type</Form.Label>
                  <Form.Select name="file_type" value={form.file_type} onChange={handleChange}>
                    <option value="PDF">PDF</option>
                    <option value="Document">Document</option>
                    <option value="Video">Video</option>
                    <option value="Audio">Audio</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tags</Form.Label>
                  <Form.Control name="tags" value={form.tags} onChange={handleChange} placeholder="comma separated" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Check type="switch" label="Featured" name="is_featured" checked={!!form.is_featured} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : editItem ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
