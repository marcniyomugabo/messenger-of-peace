import { useState, useEffect, useRef } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiUploadCloud, FiDownload } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const INFORMATION_DOCUMENTS = [
  { id: 1, title: 'FA Posters Rwanda', description: 'First Aid posters for Rwanda scouting activities.', category: 'Safety', fileName: '2020_032_Posters-FA_A2_Rwanda_RW_LR.pdf', file: '/information/2020_032_Posters-FA_A2_Rwanda_RW_LR.pdf' },
  { id: 2, title: 'ABAHIZI Draft 4', description: 'ABAHIZI draft document - version 4.', category: 'Guide', fileName: '3. ABAHIZI  -DRAFT 4.pdf', file: '/information/3. ABAHIZI  -DRAFT 4.pdf' },
  { id: 3, title: 'ABAHIZI Volume 3 Edition 2', description: 'ABAHIZI publication volume 3, edition 2.', category: 'Guide', fileName: 'ABAHIZI  Vol3,ed2.pdf.pdf', file: '/information/ABAHIZI%20%20Vol3,ed2.pdf.pdf' },
  { id: 4, title: 'Counselling Guide', description: 'Counselling guide for scout leaders and members.', category: 'Training', fileName: 'Consouling.pdf', file: '/information/Consouling.pdf' },
  { id: 5, title: 'Religious Dimension of Scouting Pedagogy', description: 'Exploring the religious and spiritual dimensions of the scouting educational method.', category: 'Guide', fileName: 'DIMENSION-RELIGIEUSE-DE-LA-PEDAGOGIE-SCOUTE (1).pdf', file: '/information/DIMENSION-RELIGIEUSE-DE-LA-PEDAGOGIE-SCOUTE (1).pdf' },
  { id: 6, title: 'Growth and Social Impact', description: 'RSA presentation on growth and social impact - October 2025.', category: 'Training', fileName: 'Growth and Social Impact. RSA Oct 2025 - Copy.pptx', file: '/information/Growth and Social Impact. RSA Oct 2025 - Copy.pptx' },
  { id: 7, title: 'GUTEGURA IGIKORWA', description: 'GUTEGURA IGIKORWA operational guide.', category: 'Service', fileName: 'GUTEGURA IGIKORWA (1).doc', file: '/information/GUTEGURA IGIKORWA (1).doc' },
  { id: 8, title: 'Ifirimbi', description: 'Ifirimbi scouting publication.', category: 'Official', fileName: 'ifirimbi.pdf', file: '/information/ifirimbi.pdf' },
  { id: 9, title: 'Heritage from the Liberation War', description: 'Discussion on heritage from the liberation war and stopping genocide.', category: 'Official', fileName: 'Ikiganiro umurage tuvoma mu rugamba rwo kubohora u Rwanda, guhagarika jenoside(2).pdf', file: '/information/Ikiganiro umurage tuvoma mu rugamba rwo kubohora u Rwanda, guhagarika jenoside(2).pdf' },
  { id: 10, title: 'Ikoraniro', description: 'Ikoraniro scouting activity guide.', category: 'Skills', fileName: 'ikoraniro.pdf', file: '/information/ikoraniro.pdf' },
  { id: 11, title: 'Les Journees Mondiales (Copy)', description: 'World days reference document - copy version.', category: 'Official', fileName: 'LES JOURNEES MONDIALES - Copy.docx', file: '/information/LES JOURNEES MONDIALES - Copy.docx' },
  { id: 12, title: 'Les Journees Mondiales', description: 'World days official document.', category: 'Official', fileName: 'LES JOURNEES MONDIALES.docx', file: '/information/LES JOURNEES MONDIALES.docx' },
  { id: 13, title: 'Rover Guidelines EN', description: 'Rover scout guidelines - English version.', category: 'Guide', fileName: 'Rover Guidelines EN (1).pdf', file: '/information/Rover Guidelines EN (1).pdf' },
  { id: 14, title: 'Rover Guidelines', description: 'Rover scout official guidelines.', category: 'Guide', fileName: 'Rover Guidelines EN.pdf', file: '/information/Rover Guidelines EN.pdf' },
  { id: 15, title: 'Youth Programme Educational Activities', description: 'Session guide for educational activities within the Youth Programme.', category: 'Training', fileName: 'Session -Educ Activities  (Youth Programme).pdf', file: '/information/Session -Educ Activities  (Youth Programme).pdf' },
  { id: 16, title: 'Urubuto Protocol Agency Concept Note', description: 'Concept note for the Urubuto Protocol Agency initiative.', category: 'Service', fileName: 'urubuto_protocol_agency_concept_note.pdf', file: '/information/urubuto_protocol_agency_concept_note.pdf' },
  { id: 17, title: 'World Days Calendar', description: 'Complete calendar of international and scouting world days.', category: 'Official', fileName: 'World_Days_Calendar_Full.pdf', file: '/information/World_Days_Calendar_Full.pdf' },
]

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
      const res = await api.get('/information')
      setDocuments(res.data.data || INFORMATION_DOCUMENTS)
    } catch {
      setDocuments(INFORMATION_DOCUMENTS)
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
    } catch {
      if (!editItem) {
        setDocuments([{ id: Date.now(), ...form, file: `/information/${form.fileName}`, date: new Date().toISOString().split('T')[0] }, ...documents])
        toast.success('Document added')
      } else {
        setDocuments(documents.map(d => d.id === editItem.id ? { ...d, ...form } : d))
        toast.success('Document updated')
      }
      setShowModal(false)
      setForm({ title: '', description: '', category: 'Guide', fileName: '' })
      setEditItem(null)
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
      toast.success('Deleted')
    } catch {
      // silent
    }
    setDocuments(documents.filter(d => d.id !== id))
    toast.success('Document deleted')
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
