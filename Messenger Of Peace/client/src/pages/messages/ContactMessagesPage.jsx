import { useState, useEffect } from 'react'
import { Card, Table, Badge, Button, Modal, Form, InputGroup, Row, Col } from 'react-bootstrap'
import { FiMail, FiSearch, FiEye, FiTrash2, FiArchive, FiCheckCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState([])
  const [counts, setCounts] = useState({ Unread: 0, Read: 0, Replied: 0, Archived: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [replyText, setReplyText] = useState('')

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      const res = await api.get(`/contact-messages?${params}`)
      setMessages(res.data.data || [])
      const c = { Unread: 0, Read: 0, Replied: 0, Archived: 0 }
      ;(res.data.counts || []).forEach(r => { c[r.status] = r.count })
      setCounts(c)
    } catch { toast.error('Failed to load messages') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchMessages() }, [statusFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchMessages()
  }

  const viewMessage = async (msg) => {
    setSelected(msg)
    setShowModal(true)
    if (msg.status === 'Unread') {
      try {
        await api.patch(`/contact-messages/${msg.id}`, { status: 'Read' })
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'Read' } : m))
        setSelected(prev => prev ? { ...prev, status: 'Read' } : prev)
        setCounts(prev => ({ ...prev, Unread: Math.max(0, prev.Unread - 1), Read: prev.Read + 1 }))
      } catch {}
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/contact-messages/${id}`, { status })
      toast.success(`Message marked as ${status}`)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
      fetchMessages()
    } catch { toast.error('Failed to update') }
  }

  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return
    try {
      await api.delete(`/contact-messages/${id}`)
      toast.success('Message deleted')
      setMessages(prev => prev.filter(m => m.id !== id))
      setShowModal(false)
    } catch { toast.error('Failed to delete') }
  }

  const statusColor = (s) => ({ Unread: '#9333EA', Read: '#6B7280', Replied: '#7C3AED', Archived: '#9CA3AF' }[s] || '#6B7280')

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold"><FiMail className="me-2" style={{ color: '#7C3AED' }} />Contact Messages</h4>
          <small className="text-muted">Manage messages from the contact form</small>
        </div>
      </div>

      <Row className="g-3 mb-4">
        {['Unread', 'Read', 'Replied', 'Archived'].map(s => (
          <Col key={s} md={3}>
            <div className="kpi-card" style={{ borderLeftColor: statusColor(s), cursor: 'pointer' }}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
              <div className="kpi-value" style={{ color: statusColor(s) }}>{counts[s] || 0}</div>
              <div className="kpi-label">{s} Messages</div>
            </div>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <InputGroup>
              <InputGroup.Text style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                <FiSearch style={{ color: '#7C3AED' }} />
              </InputGroup.Text>
              <Form.Control placeholder="Search by name, email, or subject..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ border: '1px solid #DDD6FE' }} />
              <Button type="submit" style={{ background: '#7C3AED', border: 'none' }}>Search</Button>
            </InputGroup>
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? <div className="text-center py-5">Loading...</div> : messages.length === 0 ? (
            <div className="text-center py-5 text-muted"><FiMail size={48} className="mb-3 opacity-25" /><p>No messages found</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#F3E8FF' }}>
                  <tr>
                    <th className="ps-3" style={{ color: '#581C87' }}>From</th>
                    <th style={{ color: '#581C87' }}>Subject</th>
                    <th style={{ color: '#581C87' }}>Date</th>
                    <th style={{ color: '#581C87' }}>Status</th>
                    <th className="text-end pe-3" style={{ color: '#581C87' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(msg => (
                    <tr key={msg.id} style={{ fontWeight: msg.status === 'Unread' ? 600 : 400 }}>
                      <td className="ps-3">
                        <div>{msg.name}</div><small className="text-muted">{msg.email}</small>
                      </td>
                      <td>{msg.subject}</td>
                      <td><small>{new Date(msg.created_at).toLocaleDateString()}</small></td>
                      <td><Badge bg="" style={{ background: statusColor(msg.status), color: '#fff' }}>{msg.status}</Badge></td>
                      <td className="text-end pe-3">
                        <Button variant="link" size="sm" onClick={() => viewMessage(msg)} title="View">
                          <FiEye style={{ color: '#7C3AED' }} />
                        </Button>
                        {msg.status !== 'Replied' && (
                          <Button variant="link" size="sm" onClick={() => updateStatus(msg.id, 'Replied')} title="Mark Replied">
                            <FiCheckCircle style={{ color: '#6D28D9' }} />
                          </Button>
                        )}
                        <Button variant="link" size="sm" onClick={() => updateStatus(msg.id, 'Archived')} title="Archive">
                          <FiArchive style={{ color: '#9333EA' }} />
                        </Button>
                        <Button variant="link" size="sm" onClick={() => deleteMessage(msg.id)} title="Delete">
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
            <FiMail className="me-2" />{selected?.subject}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <div>
              <Row className="mb-3">
                <Col md={6}><strong>From:</strong> {selected.name}</Col>
                <Col md={6}><strong>Email:</strong> {selected.email}</Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}><strong>Date:</strong> {new Date(selected.created_at).toLocaleString()}</Col>
                <Col md={6}>
                  <strong>Status:</strong>{' '}
                  <Badge bg="" style={{ background: statusColor(selected.status), color: '#fff' }}>{selected.status}</Badge>
                </Col>
              </Row>
              <hr />
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#374151' }}>{selected.message}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Close</Button>
          {selected && selected.status !== 'Replied' && (
            <Button style={{ background: '#7C3AED', border: 'none' }}
              onClick={() => { updateStatus(selected.id, 'Replied'); setShowModal(false) }}>
              <FiCheckCircle className="me-1" />Mark as Replied
            </Button>
          )}
          {selected && (
            <Button variant="outline-danger" onClick={() => deleteMessage(selected.id)}>
              <FiTrash2 className="me-1" />Delete
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  )
}
