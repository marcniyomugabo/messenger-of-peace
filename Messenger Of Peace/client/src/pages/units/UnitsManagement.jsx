import { useState, useEffect } from 'react'
import { Container, Table, Button, Modal, Form, Badge } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function UnitsManagement() {
  const [units, setUnits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editUnit, setEditUnit] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', focus_area: '', icon: '' })

  useEffect(() => { fetchUnits() }, [])

  const fetchUnits = async () => {
    try {
      const res = await api.get('/units')
      setUnits(res.data.data || [])
    } catch {
      setUnits([])
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editUnit) {
        await api.put(`/units/${editUnit.id}`, form)
        toast.success('Unit updated successfully')
      } else {
        await api.post('/units', form)
        toast.success('Unit created successfully')
      }
      setShowModal(false)
      setForm({ name: '', description: '', focus_area: '', icon: '' })
      setEditUnit(null)
      fetchUnits()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleEdit = (unit) => {
    setEditUnit(unit)
    setForm({ name: unit.name, description: unit.description || '', focus_area: unit.focus_area || '', icon: unit.icon || '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this unit?')) return
    try {
      await api.delete(`/units/${id}`)
      toast.success('Unit deleted')
      fetchUnits()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Units Management</h4>
        <Button variant="primary" onClick={() => { setEditUnit(null); setForm({ name: '', description: '', focus_area: '', icon: '' }); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Unit
        </Button>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Focus Area</th>
                <th>Members</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, idx) => (
                <tr key={unit.id}>
                  <td>{idx + 1}</td>
                  <td><Badge bg="primary">{unit.icon} {unit.name}</Badge></td>
                  <td>{unit.focus_area || '-'}</td>
                  <td>{unit.member_count || 0}</td>
                  <td className="text-truncate" style={{ maxWidth: 250 }}>{unit.description || '-'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(unit)}>
                        <FiEdit2 />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(unit.id)}>
                        <FiTrash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No units found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editUnit ? 'Edit Unit' : 'Add New Unit'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Unit Name *</Form.Label>
              <Form.Control name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Abatoni" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Focus Area</Form.Label>
              <Form.Control name="focus_area" value={form.focus_area} onChange={handleChange} placeholder="e.g. Culture & History" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Icon</Form.Label>
              <Form.Control name="icon" value={form.icon} onChange={handleChange} placeholder="e.g. 🎵" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={form.description} onChange={handleChange} placeholder="Unit description" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editUnit ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
