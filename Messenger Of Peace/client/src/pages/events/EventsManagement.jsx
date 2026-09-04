import { useState, useEffect } from 'react'
import { Container, Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function EventsManagement() {
  const [events, setEvents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', category: '', start_date: '', end_date: '', venue: '', status: 'Draft'
  })

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/admin')
      setEvents(res.data.data?.events || [])
    } catch {
      setEvents([])
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editEvent) {
        await api.put(`/events/${editEvent.id}`, form)
        toast.success('Event updated')
      } else {
        await api.post('/events', form)
        toast.success('Event created')
      }
      setShowModal(false)
      setForm({ title: '', description: '', category: '', start_date: '', end_date: '', venue: '', status: 'Draft' })
      setEditEvent(null)
      fetchEvents()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleEdit = (event) => {
    setEditEvent(event)
    setForm({
      title: event.title, description: event.description || '', category: event.category || '',
      start_date: event.start_date ? event.start_date.split('T')[0] : '',
      end_date: event.end_date ? event.end_date.split('T')[0] : '',
      venue: event.venue || '', status: event.status
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return
    try {
      await api.delete(`/events/${id}`)
      toast.success('Event deleted')
      fetchEvents()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const statusBadge = (status) => {
    const map = { Draft: 'secondary', Published: 'success', Ongoing: 'info', Completed: 'primary', Cancelled: 'danger' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-'

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiCalendar className="me-2" /> Events Management</h4>
        <Button variant="primary" onClick={() => { setEditEvent(null); setForm({ title: '', description: '', category: '', start_date: '', end_date: '', venue: '', status: 'Draft' }); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Event
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
                <th>Start Date</th>
                <th>End Date</th>
                <th>Venue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr key={event.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{event.title}</td>
                  <td><Badge bg="secondary">{event.category}</Badge></td>
                  <td>{formatDate(event.start_date)}</td>
                  <td>{formatDate(event.end_date)}</td>
                  <td>{event.venue || '-'}</td>
                  <td>{statusBadge(event.status)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(event)}>
                        <FiEdit2 />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(event.id)}>
                        <FiTrash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan="8" className="text-center py-4 text-muted">No events found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editEvent ? 'Edit Event' : 'Add Event'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Title *</Form.Label>
                  <Form.Control name="title" value={form.title} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category *</Form.Label>
                  <Form.Select name="category" value={form.category} onChange={handleChange} required>
                    <option value="">Select category</option>
                    <option>Training</option>
                    <option>Debate</option>
                    <option>Community Service</option>
                    <option>Visit</option>
                    <option>Meeting</option>
                    <option>Celebration</option>
                    <option>Camp</option>
                    <option>Talent/Arts</option>
                    <option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control type="date" name="end_date" value={form.end_date} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Venue</Form.Label>
                  <Form.Control name="venue" value={form.venue} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editEvent ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
