import { useState, useEffect, useRef } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiDownload, FiUploadCloud } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const PORTFOLIO_DOCUMENTS = [
  { _id: '1', title: 'First Aid for Scouts', category: 'Safety', impact: 'Emergency preparedness training', status: 'Published', description: 'First Aid training manual for scouts covering emergency response, wound care, and rescue techniques.', file: '/portfolio/FIRST AID FOR SCOUTS.pptx', fileName: 'FIRST AID FOR SCOUTS.pptx' },
  { _id: '2', title: 'Food for Life - Scouts Practical Guide', category: 'Environment', impact: 'Sustainable agriculture training', status: 'Published', description: 'Training manual on soil health, organic inputs, and sustainable crop protection for scouts.', file: '/portfolio/FOOD FOR LIFE- A SCOUTS\u2019 PRACTICAL GUIDE          Training Manual on Soil Health, Organic Inputs, and          Sustainable Crop Protection  .pdf', fileName: 'Food for Life - Scouts Practical Guide.pdf' },
  { _id: '3', title: 'Growth and Social Impact', category: 'Education', impact: 'Social impact awareness', status: 'Published', description: 'RSA presentation on growth and social impact initiatives - October 2025.', file: '/portfolio/Growth and Social Impact. RSA Oct 2025.pptx', fileName: 'Growth and Social Impact. RSA Oct 2025.pptx' },
  { _id: '4', title: 'Working with Children and Young People', category: 'Training', impact: 'Youth development training', status: 'Published', description: 'Guide for working effectively with children and young people in scouting activities.', file: '/portfolio/WORKING WITH CHILDREN AND YOUNG PEOPLE (1).pptx', fileName: 'WORKING WITH CHILDREN AND YOUNG PEOPLE.pptx' },
  { _id: '5', title: "WOSM's Education Initiative", category: 'Education', impact: 'Global scouting education', status: 'Published', description: "Presentation on WOSM's global education initiative for scouting organizations worldwide.", file: "/portfolio/WOSM'S Education Initiative.pptx", fileName: "WOSM'S Education Initiative.pptx" },
  { _id: '6', title: 'Scouting Activity Document', category: 'Service', impact: 'Community service resource', status: 'Published', description: 'Additional scouting activity documentation and guidelines.', file: '/portfolio/doc_1787157106_760.pdf', fileName: 'doc_1787157106_760.pdf' },
]

export default function PortfolioManagement() {
  const [projects, setProjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    title: '', description: '', category: '', impact: '', status: 'Draft', date: ''
  })

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      const res = await api.get('/portfolio')
      setProjects(res.data.projects || PORTFOLIO_DOCUMENTS)
    } catch {
      setProjects(PORTFOLIO_DOCUMENTS)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editItem) {
        await api.put(`/portfolio/${editItem._id}`, form)
        toast.success('Project updated')
        setShowModal(false)
        setForm({ title: '', description: '', category: '', impact: '', status: 'Draft', date: '' })
        setEditItem(null)
        fetchProjects()
      } else if (selectedFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('title', form.title)
        fd.append('category', form.category)
        fd.append('impact', form.impact)
        fd.append('description', form.description)
        fd.append('status', form.status)
        fd.append('date', form.date)
        await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Document uploaded')
        setShowModal(false)
        setForm({ title: '', description: '', category: '', impact: '', status: 'Draft', date: '' })
        setSelectedFile(null)
        fetchProjects()
      } else {
        await api.post('/portfolio', form)
        toast.success('Project created')
        setShowModal(false)
        setForm({ title: '', description: '', category: '', impact: '', status: 'Draft', date: '' })
        setEditItem(null)
        fetchProjects()
      }
    } catch {
      toast.error('Operation failed')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return
    try {
      await api.delete(`/portfolio/${id}`)
      toast.success('Deleted')
      fetchProjects()
    } catch {
      toast.error('Failed')
    }
  }

  const advanceStatus = (item) => {
    const workflow = { Draft: 'Submitted', Submitted: 'Reviewed', Reviewed: 'Published', Published: 'Published' }
    const newStatus = workflow[item.status] || item.status
    handleEdit({ ...item, status: newStatus })
  }

  const statusBadge = (status) => {
    const map = { Draft: 'secondary', Submitted: 'info', Reviewed: 'warning', Published: 'success' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiFileText className="me-2" /> Library Management</h4>
        <Button variant="primary" onClick={() => { setEditItem(null); setForm({ title: '', description: '', category: '', impact: '', status: 'Draft', date: '' }); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Project
        </Button>
      </div>

      {/* Workflow */}
      <div className="mop-card mb-4 p-3">
        <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
          <small className="text-muted fw-bold me-2">Workflow:</small>
          <Badge bg="secondary">Draft</Badge> &rarr;
          <Badge bg="info">Submitted</Badge> &rarr;
          <Badge bg="warning">Reviewed</Badge> &rarr;
          <Badge bg="success">Published</Badge>
        </div>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Category</th>
                <th>Impact</th>
                <th>File</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => (
                <tr key={p._id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{p.title}</td>
                  <td><Badge bg="secondary">{p.category}</Badge></td>
                  <td>{p.impact}</td>
                  <td className="text-muted small">{p.fileName || '-'}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {p.file && (
                        <Button variant="outline-success" size="sm" as="a" href={p.file} download>
                          <FiDownload />
                        </Button>
                      )}
                      {p.status !== 'Published' && (
                        <Button variant="outline-success" size="sm" onClick={() => advanceStatus(p)}>
                          Advance
                        </Button>
                      )}
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(p)}><FiEdit2 /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(p._id)}><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Project' : 'Add Project'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Title *</Form.Label>
                  <Form.Control name="title" value={form.title} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select name="category" value={form.category} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option>Environment</option>
                    <option>Health</option>
                    <option>Education</option>
                    <option>Board Members</option>
                    <option>Community Service</option>
                    <option>Safety</option>
                    <option>Training</option>
                    <option>Service</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Impact *</Form.Label>
                  <Form.Control name="impact" value={form.impact} onChange={handleChange} required placeholder="e.g. 200+ trees planted" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" name="date" value={form.date} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option>Draft</option>
                    <option>Submitted</option>
                    <option>Reviewed</option>
                    <option>Published</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} />
                </Form.Group>
              </Col>
              {!editItem && (
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Upload File</Form.Label>
                    <div className="input-group">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="form-control"
                        accept=".pdf,.pptx,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                      <span className="input-group-text"><FiUploadCloud /></span>
                    </div>
                    {selectedFile && <small className="text-muted">Selected: {selectedFile.name}</small>}
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={uploading}>
              {uploading ? 'Uploading...' : editItem ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
