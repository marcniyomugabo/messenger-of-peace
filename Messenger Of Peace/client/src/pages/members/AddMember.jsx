import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col } from 'react-bootstrap'
import { FiArrowLeft, FiUserPlus, FiEdit2 } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { today } from '../../utils/date'

// Add a member (/dashboard/members/new) or edit one (/dashboard/members/:id/edit).
export default function AddMember() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = !!id
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: '', date_of_birth: '', phone: '', whatsapp: '',
    emergency_name: '', emergency_phone: '', emergency_relation: '',
    email: '', school: '', location: '', unit_id: '', role_in_group: '',
    skills: '', talents: '', notes: '', monthly_contribution: 500, status: 'Active',
    join_date: today()
  })

  // Editing: fill the form with the member's record and emergency contact.
  useEffect(() => {
    if (!editing) return
    api.get(`/members/${id}`).then(res => {
      const m = res.data.data || {}
      const emergency = (m.guardians || []).find(g => g.is_emergency) || {}
      const text = v => (v === null || v === undefined ? '' : String(v))
      setForm(f => ({
        ...f,
        first_name: text(m.first_name), last_name: text(m.last_name), gender: text(m.gender), date_of_birth: text(m.date_of_birth),
        phone: text(m.phone), whatsapp: text(m.whatsapp), email: text(m.email), school: text(m.school), location: text(m.location),
        unit_id: text(m.unit_id), role_in_group: text(m.role_in_group), skills: text(m.skills), talents: text(m.talents),
        notes: text(m.notes), monthly_contribution: m.monthly_contribution ?? 500, status: m.status || 'Active',
        join_date: text(m.join_date),
        emergency_name: text(emergency.guardian_name), emergency_phone: text(emergency.phone), emergency_relation: text(emergency.relationship),
      }))
    }).catch(err => toast.error(err.response?.data?.message || 'Could not load the member'))
  }, [editing, id])

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
      if (editing) {
        await api.put(`/members/${id}`, form)
        toast.success('Member saved')
        navigate(`/dashboard/members/${id}`)
      } else {
        await api.post('/members', form)
        toast.success('Member added successfully')
        navigate('/dashboard/members')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || (editing ? 'Failed to save the member' : 'Failed to add member')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate(editing ? `/dashboard/members/${id}` : '/dashboard/members')}>
          <FiArrowLeft /> Back
        </Button>
        <h4 className="mb-0">{editing ? <><FiEdit2 className="me-2" /> Edit Member</> : <><FiUserPlus className="me-2" /> Add New Member</>}</h4>
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
                  <Form.Label>Gender</Form.Label>
                  <Form.Select name="gender" value={form.gender} onChange={handleChange}>
                    <option value="">Not given</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} max={today()} />
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

            <h6 className="fw-bold mb-1" style={{ color: '#6B21A8' }}>Emergency Contact</h6>
            <p className="text-muted small mb-3">Who to call if something happens (usually a parent or guardian).</p>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Name</Form.Label>
                  <Form.Control name="emergency_name" value={form.emergency_name} onChange={handleChange} maxLength={150} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control name="emergency_phone" value={form.emergency_phone} onChange={handleChange} maxLength={30} placeholder="+250..." />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Relationship</Form.Label>
                  <Form.Control name="emergency_relation" value={form.emergency_relation} onChange={handleChange} maxLength={60} placeholder="e.g. mother" />
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
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Join Date</Form.Label>
                  <Form.Control type="date" name="join_date" value={form.join_date} max={today()} onChange={handleChange} />
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
                {loading ? 'Saving...' : editing ? 'Save Member' : 'Add Member'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
