import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiArchive, FiExternalLink, FiFileText, FiUpload } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// News stories for the public News page and "Latest news" on Home.
const STATUS_COLOR = { Draft: 'secondary', Published: 'success', Archived: 'dark' }
const EMPTY = { title: '', category: '', status: 'Draft', published_at: '', featured_image: '', excerpt: '', content: '' }
const day = d => (d ? String(d).slice(0, 10) : '')
const shown = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

export default function NewsManagement() {
  const { user } = useAuth()
  const canArchive = ['super_admin', 'chief'].includes(user?.role)
  const [stories, setStories] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, story = edit
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/posts/admin')
      setStories(res.data.data || [])
      setCategories(res.data.categories || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load the news')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ ...EMPTY, category: categories[0] || '' }); setEditing({}) }
  const openEdit = (s) => {
    setForm({
      title: s.title || '', category: s.category || categories[0] || '', status: s.status || 'Draft',
      published_at: day(s.published_at), featured_image: s.featured_image || '', excerpt: s.excerpt || '', content: s.content || '',
    })
    setEditing(s)
  }
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const uploadPicture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(f => ({ ...f, featured_image: res.data.data.file_path }))
      toast.success('Picture uploaded')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing.id) await api.put(`/posts/${editing.id}`, form)
      else await api.post('/posts', form)
      toast.success(form.status === 'Published' ? 'Story published' : 'Story saved')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the story')
    } finally {
      setSaving(false)
    }
  }

  const archive = async (s) => {
    if (!window.confirm(`Archive "${s.title}"? It will be hidden from the website (you can publish it again later).`)) return
    try {
      await api.delete(`/posts/${s.id}`)
      toast.success('Story archived')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not archive')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiFileText className="me-2" /> News</h4>
        <Button variant="primary" onClick={openNew}><FiPlus className="me-1" /> New story</Button>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr><th>Story</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {stories.map(s => (
                <tr key={s.id} className={s.status === 'Archived' ? 'text-muted' : ''}>
                  <td className="fw-semibold">
                    <div className="d-flex align-items-center gap-2">
                      {s.featured_image && <img src={s.featured_image} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />}
                      <span>{s.title}</span>
                    </div>
                  </td>
                  <td>{s.category || '-'}</td>
                  <td><Badge bg={STATUS_COLOR[s.status] || 'secondary'}>{s.status}</Badge></td>
                  <td className="small">{shown(s.published_at || s.created_at)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="outline-secondary" title="Edit" onClick={() => openEdit(s)}><FiEdit2 /></Button>
                      {s.status === 'Published' && (
                        <Button size="sm" variant="outline-primary" title="View on the website" href={`/news/${s.slug}`} target="_blank" rel="noopener noreferrer"><FiExternalLink /></Button>
                      )}
                      {canArchive && s.status !== 'Archived' && (
                        <Button size="sm" variant="outline-danger" title="Archive" onClick={() => archive(s)}><FiArchive /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stories.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No stories yet. Click "New story" to write the first one.'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={!!editing} onHide={() => setEditing(null)} size="lg" centered>
        <Form onSubmit={save}>
          <Modal.Header closeButton><Modal.Title>{editing?.id ? 'Edit story' : 'New story'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control name="title" value={form.title} onChange={handleChange} required minLength={3} maxLength={200} />
            </Form.Group>
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Label>Category</Form.Label>
                <Form.Select name="category" value={form.category} onChange={handleChange}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="Draft">Draft (not on the website)</option>
                  <option value="Published">Published</option>
                  {editing?.id && <option value="Archived">Archived (hidden)</option>}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" name="published_at" value={form.published_at} onChange={handleChange} />
                <Form.Text className="text-muted">Empty = the day it is published.</Form.Text>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Picture</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                <Form.Control name="featured_image" value={form.featured_image} onChange={handleChange} placeholder="Upload a picture, or paste a /images/... or https:// address" />
                <Form.Label className="btn btn-outline-primary mb-0 text-nowrap">
                  <FiUpload className="me-1" />{uploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" hidden onChange={uploadPicture} disabled={uploading} />
                </Form.Label>
              </div>
              {form.featured_image && <img src={form.featured_image} alt="" className="mt-2 rounded" style={{ maxHeight: 140, maxWidth: '100%' }} />}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Short summary</Form.Label>
              <Form.Control as="textarea" rows={2} name="excerpt" value={form.excerpt} onChange={handleChange} maxLength={300} />
              <Form.Text className="text-muted">Shown on the news list and on Home. Empty = the start of the story.</Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Story *</Form.Label>
              <Form.Control as="textarea" rows={10} name="content" value={form.content} onChange={handleChange} required minLength={20} />
              <Form.Text className="text-muted">Leave an empty line between paragraphs.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || uploading}>{saving ? 'Saving...' : form.status === 'Published' ? 'Publish' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
