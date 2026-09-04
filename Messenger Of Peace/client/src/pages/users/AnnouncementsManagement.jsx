import { useState, useEffect } from 'react'
import { Card, Table, Badge, Button, Modal, Form, Row, Col, InputGroup } from 'react-bootstrap'
import { FiBell, FiPlus, FiEdit3, FiTrash2, FiSearch } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', priority: 'Medium', target_audience: 'All', status: 'Draft' })

  const fetchAnnouncements = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      const res = await api.get(`/announcements/admin?${params}`)
      setAnnouncements(res.data.data || [])
      const c = {}
      ;(res.data.counts || []).forEach(r => { c[r.status] = r.count })
      setCounts(c)
    } catch { toast.error('Failed to load announcements') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAnnouncements() }, [statusFilter])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', priority: 'Medium', target_audience: 'All', status: 'Draft' })
    setShowModal(true)
  }

  const openEdit = (a) => {
    setEditing(a)
    setForm({ title: a.title, content: a.content, priority: a.priority, target_audience: a.target_audience, status: a.status })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/announcements/${editing.id}`, form)
        toast.success('Announcement updated')
      } else {
        await api.post('/announcements', form)
        toast.success('Announcement created')
      }
      setShowModal(false)
      fetchAnnouncements()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
  }

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      toast.success('Announcement deleted')
      fetchAnnouncements()
    } catch { toast.error('Failed to delete') }
  }

  const priorityColor = (p) => ({ High: '#581C87', Medium: '#9333EA', Low: '#A855F7' }[p] || '#6B7280')
  const statusColor = (s) => ({ Published: '#7C3AED', Draft: '#9CA3AF', Archived: '#581C87' }[s] || '#6B7280')

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold"><FiBell className="me-2" style={{ color: '#7C3AED' }} />Announcements</h4>
          <small className="text-muted">Create and manage group announcements</small>
        </div>
        <Button style={{ background: '#7C3AED', border: 'none' }} onClick={openCreate}>
          <FiPlus className="me-1" />New Announcement
        </Button>
      </div>

      <Row className="g-3 mb-4">
        {Object.entries(counts).map(([s, c]) => (
          <Col key={s} md={3}>
            <div className="kpi-card" style={{ borderLeftColor: statusColor(s), cursor: 'pointer' }}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
              <div className="kpi-value" style={{ color: statusColor(s) }}>{c}</div>
              <div className="kpi-label">{s}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); fetchAnnouncements() }}>
            <InputGroup>
              <InputGroup.Text style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                <FiSearch style={{ color: '#7C3AED' }} />
              </InputGroup.Text>
              <Form.Control placeholder="Search announcements..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ border: '1px solid #DDD6FE' }} />
              <Button type="submit" style={{ background: '#7C3AED', border: 'none' }}>Search</Button>
            </InputGroup>
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? <div className="text-center py-5">Loading...</div> : announcements.length === 0 ? (
            <div className="text-center py-5 text-muted"><FiBell size={48} className="mb-3 opacity-25" /><p>No announcements yet</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#F3E8FF' }}>
                  <tr>
                    <th className="ps-3" style={{ color: '#581C87' }}>Title</th>
                    <th style={{ color: '#581C87' }}>Priority</th>
                    <th style={{ color: '#581C87' }}>Audience</th>
                    <th style={{ color: '#581C87' }}>Author</th>
                    <th style={{ color: '#581C87' }}>Status</th>
                    <th style={{ color: '#581C87' }}>Date</th>
                    <th className="text-end pe-3" style={{ color: '#581C87' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map(a => (
                    <tr key={a.id}>
                      <td className="ps-3 fw-semibold">{a.title}</td>
                      <td><Badge bg="" style={{ background: priorityColor(a.priority), color: '#fff' }}>{a.priority}</Badge></td>
                      <td><small>{a.target_audience}</small></td>
                      <td><small>{a.author_name || 'Admin'}</small></td>
                      <td><Badge bg="" style={{ background: statusColor(a.status), color: '#fff' }}>{a.status}</Badge></td>
                      <td><small>{new Date(a.created_at).toLocaleDateString()}</small></td>
                      <td className="text-end pe-3">
                        <Button variant="link" size="sm" onClick={() => openEdit(a)} title="Edit">
                          <FiEdit3 style={{ color: '#7C3AED' }} />
                        </Button>
                        <Button variant="link" size="sm" onClick={() => deleteAnnouncement(a.id)} title="Delete">
                          <FiTrash2 style={{ color: '#581C87' }} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ background: '#F3E8FF' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiBell className="me-2" />{editing ? 'Edit Announcement' : 'New Announcement'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Title</Form.Label>
              <Form.Control required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title" style={{ border: '1px solid #DDD6FE' }} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Content</Form.Label>
              <Form.Control as="textarea" rows={5} required value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Write announcement content..." style={{ border: '1px solid #DDD6FE' }} />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Priority</Form.Label>
                  <Form.Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Target Audience</Form.Label>
                  <Form.Select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }}>
                    <option value="All">All</option>
                    <option value="Members">Members</option>
                    <option value="Leaders">Leaders</option>
                    <option value="Parents">Parents</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }}>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" style={{ background: '#7C3AED', border: 'none' }}>
              {editing ? 'Update' : 'Create'} Announcement
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
