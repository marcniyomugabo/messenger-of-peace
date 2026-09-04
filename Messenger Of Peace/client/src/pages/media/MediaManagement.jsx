import { useState, useEffect, useRef } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiUploadCloud } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function MediaManagement() {
  const [media, setMedia] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    title: '', file_type: 'Photo', category: '', caption: '', is_approved: 0, is_public: 0, file_path: ''
  })

  useEffect(() => { fetchMedia() }, [])

  const fetchMedia = async () => {
    try {
      const res = await api.get('/media')
      const data = res.data.data || res.data.media || []
      setMedia(Array.isArray(data) ? data : [])
    } catch {
      setMedia([])
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
      if (editItem) {
        await api.patch(`/media/${editItem.id}`, form)
        toast.success('Media updated')
        setShowModal(false)
        resetForm()
        fetchMedia()
      } else if (selectedFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('title', form.title || selectedFile.name)
        fd.append('caption', form.caption || '')
        fd.append('is_public', form.is_public)
        await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('File uploaded')
        setShowModal(false)
        resetForm()
        fetchMedia()
      } else {
        await api.post('/media', form)
        toast.success('Media added')
        setShowModal(false)
        resetForm()
        fetchMedia()
      }
    } catch {
      toast.error('Operation failed')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      title: item.title || '',
      file_type: item.file_type || 'Photo',
      category: item.category || '',
      caption: item.caption || '',
      is_approved: item.is_approved || 0,
      is_public: item.is_public || 0,
      file_path: item.file_path || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this media item?')) return
    try {
      await api.delete(`/media/${id}`)
      toast.success('Deleted')
      fetchMedia()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const approveItem = async (item) => {
    try {
      await api.patch(`/media/${item.id}`, { is_approved: 1 })
      toast.success('Media approved')
      fetchMedia()
    } catch {
      toast.error('Failed to approve')
    }
  }

  const resetForm = () => {
    setEditItem(null)
    setSelectedFile(null)
    setForm({ title: '', file_type: 'Photo', category: '', caption: '', is_approved: 0, is_public: 0, file_path: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const statusBadge = (isApproved) => {
    return isApproved
      ? <Badge bg="success">Approved</Badge>
      : <Badge bg="warning">Pending</Badge>
  }

  const approved = media.filter(m => m.is_approved === 1 || m.is_approved === true).length
  const pending = media.filter(m => !m.is_approved).length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiImage className="me-2" /> Media Management</h4>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>
          <FiPlus className="me-1" /> Upload Media
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{media.length}</div>
            <div className="kpi-label">Total Media</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{approved}</div>
            <div className="kpi-label">Approved</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#9333EA' }}>
            <div className="kpi-value" style={{ color: '#9333EA' }}>{pending}</div>
            <div className="kpi-label">Pending Review</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {media.map((m, idx) => (
                <tr key={m.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{m.title}</td>
                  <td>
                    <Badge bg={m.file_type === 'Video' ? 'danger' : 'primary'}>
                      {m.file_type || 'Photo'}
                    </Badge>
                  </td>
                  <td>{statusBadge(m.is_approved)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {!m.is_approved && (
                        <Button variant="outline-success" size="sm" onClick={() => approveItem(m)}>
                          Approve
                        </Button>
                      )}
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(m)}><FiEdit2 /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(m.id)}><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {media.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No media items'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Media' : 'Upload Media'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control name="title" value={form.title} onChange={handleChange} required />
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select name="file_type" value={form.file_type} onChange={handleChange} required>
                    <option value="Photo">Photo</option>
                    <option value="Video">Video</option>
                    <option value="Document">Document</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category" value={form.category} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>Camping</option>
                    <option>Community Service</option>
                    <option>Training</option>
                    <option>Environment</option>
                    <option>Competition</option>
                    <option>Meeting</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>File *</Form.Label>
              <div className="input-group">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="form-control"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  disabled={!!editItem}
                />
                <span className="input-group-text"><FiUploadCloud /></span>
              </div>
              {selectedFile && <small className="text-muted">Selected: {selectedFile.name}</small>}
              {editItem && <small className="text-muted">Current: {editItem.file_path}</small>}
            </Form.Group>
            {!editItem && !selectedFile && (
              <Form.Group className="mb-3">
                <Form.Label>Or enter file path</Form.Label>
                <Form.Control name="file_path" value={form.file_path} onChange={handleChange} placeholder="/uploads/filename.jpg" />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} name="caption" value={form.caption} onChange={handleChange} />
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check type="switch" label="Approved" name="is_approved" checked={!!form.is_approved} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check type="switch" label="Public" name="is_public" checked={!!form.is_public} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={uploading}>
              {uploading ? 'Uploading...' : editItem ? 'Update' : 'Upload'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
