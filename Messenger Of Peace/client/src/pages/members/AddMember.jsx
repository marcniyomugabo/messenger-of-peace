import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col } from 'react-bootstrap'
import { FiArrowLeft, FiUserPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function AddMember() {
  const navigate = useNavigate()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', phone: '', whatsapp: '',
    email: '', school: '', location: '', unit_id: '', role_in_group: '',
    skills: '', talents: '', notes: '', monthly_contribution: 500, status: 'Active'
  })

  useEffect(() => {
    api.get('/units').then(res => {
      const data = res.data.data || res.data || []
      setUnits(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First name and last name are required')
      return
    }
    setLoading(true)
    try {
      await api.post('/members', form)
      toast.success('Member added successfully')
      navigate('/dashboard/members')
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to add member'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/dashboard/members')}>
          <FiArrowLeft /> Back
        </Button>
        <h4 className="mb-0"><FiUserPlus className="me-2" /> Add New Member</h4>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <h6 className="fw-bold mb-3" style={{ color: '#6B21A8' }}>Personal Information</h6>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control name="first_name" value={form.first_name} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control name="last_name" value={form.last_name} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control name="phone" value={form.phone} onChange={handleChange} placeholder="+250..." />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>WhatsApp</Form.Label>
                  <Form.Control name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+250..." />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold mb-3" style={{ color: '#6B21A8' }}>Unit & Role</h6>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Scout Unit</Form.Label>
                  <Form.Select name="unit_id" value={form.unit_id} onChange={handleChange}>
                    <option value="">Select unit</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Role in Group</Form.Label>
                  <Form.Control name="role_in_group" value={form.role_in_group} onChange={handleChange} placeholder="e.g. Patrol Leader" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={form.status} onChange={handleChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Applicant">Applicant</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold mb-3" style={{ color: '#6B21A8' }}>Education & Location</h6>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>School</Form.Label>
                  <Form.Control name="school" value={form.school} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Location</Form.Label>
                  <Form.Control name="location" value={form.location} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Monthly Contribution (RWF)</Form.Label>
                  <Form.Control type="number" name="monthly_contribution" value={form.monthly_contribution} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold mb-3" style={{ color: '#6B21A8' }}>Skills & Notes</h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Skills</Form.Label>
                  <Form.Control name="skills" value={form.skills} onChange={handleChange} placeholder="e.g. First aid, cooking" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Talents</Form.Label>
                  <Form.Control name="talents" value={form.talents} onChange={handleChange} placeholder="e.g. Singing, sports" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control as="textarea" rows={2} name="notes" value={form.notes} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/dashboard/members')}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
