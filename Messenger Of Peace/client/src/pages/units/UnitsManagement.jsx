import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiSlash, FiRotateCcw } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { ageRange } from '../../utils/units'

// Units shown on the public Units page, the Home page and the Join Us form.
const EMPTY = { name: '', focus_area: '', min_age: '', max_age: '', color: '#6B21A8', icon: '', display_order: '', description: '', activities: '' }

export default function UnitsManagement() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUnits() }, [])

  const fetchUnits = async () => {
    try {
      const res = await api.get('/units/admin')
      setUnits(res.data.data || [])
    } catch (err) {
      setUnits([])
      toast.error(err.response?.data?.message || 'Could not load units')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const openNew = () => {
    setEditUnit(null)
    setForm({ ...EMPTY, display_order: String(units.length + 1) })
    setShowModal(true)
  }

  const handleEdit = (unit) => {
    setEditUnit(unit)
    const text = v => (v === null || v === undefined ? '' : String(v))
    setForm({
      name: text(unit.name), focus_area: text(unit.focus_area), min_age: text(unit.min_age), max_age: text(unit.max_age),
      color: unit.color || '#6B21A8', icon: text(unit.icon), display_order: text(unit.display_order),
      description: text(unit.description), activities: text(unit.activities),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editUnit) {
        await api.put(`/units/${editUnit.id}`, form)
        toast.success('Unit updated')
      } else {
        await api.post('/units', form)
        toast.success('Unit created')
      }
      setShowModal(false)
      fetchUnits()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (unit, active) => {
    if (!active && !window.confirm(`Deactivate ${unit.name}? It will be hidden from the website and the Join Us form. Its members keep their unit.`)) return
    try {
      if (active) await api.put(`/units/${unit.id}`, { is_active: 1 })
      else await api.delete(`/units/${unit.id}`)
      toast.success(active ? 'Unit reactivated' : 'Unit deactivated')
      fetchUnits()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Units Management</h4>
        <Button variant="primary" onClick={openNew}>
          <FiPlus className="me-1" /> Add Unit
        </Button>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>English name</th>
                <th>Ages</th>
                <th>Members</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map(unit => (
                <tr key={unit.id} className={unit.is_active ? '' : 'text-muted'}>
                  <td>{unit.display_order}</td>
                  <td>
                    <Badge bg="" style={{ backgroundColor: unit.color || '#6B21A8' }}>{unit.icon} {unit.name}</Badge>
                  </td>
                  <td>{unit.focus_area || '-'}</td>
                  <td>{ageRange(unit.min_age, unit.max_age) || '-'}</td>
                  <td>{unit.member_count || 0}</td>
                  <td>{unit.is_active ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Deactivated</Badge>}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" title="Edit" onClick={() => handleEdit(unit)}>
                        <FiEdit2 />
                      </Button>
                      {unit.is_active ? (
                        <Button variant="outline-danger" size="sm" title="Deactivate" onClick={() => setActive(unit, false)}>
                          <FiSlash />
                        </Button>
                      ) : (
                        <Button variant="outline-success" size="sm" title="Reactivate" onClick={() => setActive(unit, true)}>
                          <FiRotateCcw />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No units found'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editUnit ? 'Edit Unit' : 'Add New Unit'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Unit Name *</Form.Label>
                  <Form.Control name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Abatoni" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>English name</Form.Label>
                  <Form.Control name="focus_area" value={form.focus_area} onChange={handleChange} placeholder="e.g. Cub Scouts" />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>Youngest age</Form.Label>
                  <Form.Control type="number" min="0" max="120" name="min_age" value={form.min_age} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>Oldest age</Form.Label>
                  <Form.Control type="number" min="0" max="120" name="max_age" value={form.max_age} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col xs={4} md={2}>
                <Form.Group>
                  <Form.Label>Colour</Form.Label>
                  <Form.Control type="color" name="color" value={form.color} onChange={handleChange} className="w-100" />
                </Form.Group>
              </Col>
              <Col xs={4} md={2}>
                <Form.Group>
                  <Form.Label>Icon</Form.Label>
                  <Form.Control name="icon" value={form.icon} onChange={handleChange} placeholder="🏕️" />
                </Form.Group>
              </Col>
              <Col xs={4} md={2}>
                <Form.Group>
                  <Form.Label>Order</Form.Label>
                  <Form.Control type="number" name="display_order" value={form.display_order} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} />
                  <Form.Text className="text-muted">The first sentence is also shown on the Home page.</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Activities & Programs</Form.Label>
                  <Form.Control as="textarea" rows={6} name="activities" value={form.activities} onChange={handleChange} />
                  <Form.Text className="text-muted">One activity per line.</Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{editUnit ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
