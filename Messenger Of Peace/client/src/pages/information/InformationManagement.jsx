import { useState, useEffect, useRef } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiUploadCloud, FiDownload } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function InformationManagement() {
  const [documents, setDocuments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'Guide', fileName: '' })
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      // Only what is really saved (drafts included), with the server's field names.
      const res = await api.get('/information/admin')
      setDocuments((res.data.data || []).map(d => ({
        ...d, fileName: d.file_name || '', file: d.file_path ? encodeURI(d.file_path) : '',
      })))
    } catch {
      toast.error('Could not load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editItem) {
        await api.put(`/information/${editItem.id}`, { title: form.title, description: form.description, category: form.category })
        toast.success('Document updated')
        setShowModal(false)
        setForm({ title: '', description: '', category: 'Guide', fileName: '' })
        setEditItem(null)
        fetchDocuments()
      } else if (selectedFile) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('title', form.title)
        fd.append('category', form.category)
        fd.append('description', form.description)
        const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        const uploaded = uploadRes.data.data
        await api.post('/information', {
          title: form.title, description: form.description, category: form.category,
          fileName: uploaded.file_name, file: uploaded.file_path
        })
        toast.success('Document uploaded')
        setShowModal(false)
        setForm({ title: '', description: '', category: 'Guide', fileName: '' })
        setSelectedFile(null)
        fetchDocuments()
      } else {
        await api.post('/information', { title: form.title, description: form.description, category: form.category, fileName: form.fileName })
        toast.success('Document created')
        setShowModal(false)
        setForm({ title: '', description: '', category: 'Guide', fileName: '' })
        setEditItem(null)
        fetchDocuments()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the document')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({ title: item.title, description: item.description, category: item.category, fileName: item.fileName || '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return
    try {
      await api.delete(`/information/${id}`)
      toast.success('Document deleted')
      fetchDocuments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the document')
    }
  }

  const categoryBadge = (cat) => {
    const map = { Guide: '#6B21A8', Safety: '#581C87', Service: '#7C3AED', Skills: '#6D28D9', Training: '#9333EA', Official: '#7c3aed' }
    const color = map[cat] || '#6B7280'
    return <Badge style={{ background: color }}>{cat}</Badge>
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiFileText className="me-2" /> Information Management</h4>
        <Button variant="primary" onClick={() => { setEditItem(null); setForm({ title: '', description: '', category: 'Guide', fileName: '' }); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Document
        </Button>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Category</th>
                <th>File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => (
                <tr key={doc.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{doc.title}</td>
                  <td>{categoryBadge(doc.category)}</td>
                  <td className="text-muted small">{doc.fileName || '-'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {doc.file && (
                        <Button variant="outline-success" size="sm" as="a" href={doc.file} download>
                          <FiDownload />
                        </Button>
                      )}
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(doc)}>
                        <FiEdit2 />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(doc.id)}>
                        <FiTrash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No documents'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Document' : 'Add Document'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control name="title" value={form.title} onChange={handleChange} required placeholder="Document title" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category *</Form.Label>
              <Form.Select name="category" value={form.category} onChange={handleChange} required>
                <option>Guide</option>
                <option>Safety</option>
                <option>Service</option>
                <option>Skills</option>
                <option>Training</option>
                <option>Official</option>
              </Form.Select>
            </Form.Group>
            {!editItem && (
              <Form.Group className="mb-3">
                <Form.Label>Upload File</Form.Label>
                <div className="input-group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="form-control"
                    accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                  <span className="input-group-text"><FiUploadCloud /></span>
                </div>
                {selectedFile && <small className="text-muted">Selected: {selectedFile.name}</small>}
                {!selectedFile && (
                  <Form.Control className="mt-2" name="fileName" value={form.fileName} onChange={handleChange} placeholder="Or type file name e.g. scout-handbook.pdf" />
                )}
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} placeholder="Brief description" />
            </Form.Group>
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
