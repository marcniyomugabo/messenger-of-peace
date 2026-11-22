import { useState, useEffect } from 'react'
import { Container, Table, Button, Modal, Form, Badge } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function LeadershipManagement() {
  const [leaders, setLeaders] = useState([])
  const [members, setMembers] = useState([])
  const [units, setUnits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editLeader, setEditLeader] = useState(null)
  const [form, setForm] = useState({ member_id: '', position: '', unit_id: '', start_date: '', end_date: '', description: '', display_order: '' })

  useEffect(() => {
    fetchLeaders()
    fetchMembers()
    fetchUnits()
  }, [])

  const fetchLeaders = async () => {
    try {
      const res = await api.get('/leadership')
      setLeaders(res.data.data || [])
    } catch {
      setLeaders([])
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await api.get('/members/admin')
      setMembers(res.data.data?.members || res.data.data || [])
    } catch {
      setMembers([])
    }
  }

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
      const payload = {
        member_id: parseInt(form.member_id),
        position: form.position,
        unit_id: form.unit_id ? parseInt(form.unit_id) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        description: form.description || null,
        display_order: form.display_order === '' ? 100 : parseInt(form.display_order),
      }
      if (editLeader) {
        await api.put(`/leadership/${editLeader.id}`, payload)
        toast.success('Leader updated')
      } else {
        await api.post('/leadership', payload)
        toast.success('Leader added')
      }
      setShowModal(false)
      setForm({ member_id: '', position: '', unit_id: '', start_date: '', end_date: '', description: '', display_order: '' })
      setEditLeader(null)
      fetchLeaders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleEdit = (leader) => {
    setEditLeader(leader)
    setForm({
      member_id: leader.member_id || '',
      position: leader.position || '',
      unit_id: leader.unit_id || '',
      start_date: leader.start_date ? leader.start_date.split('T')[0] : '',
      end_date: leader.end_date ? leader.end_date.split('T')[0] : '',
      description: leader.description || '',
      display_order: leader.display_order ?? '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leader?')) return
    try {
      await api.delete(`/leadership/${id}`)
      toast.success('Leader deleted')
      fetchLeaders()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Board Members Management</h4>
        <Button variant="primary" onClick={() => { setEditLeader(null); setForm({ member_id: '', position: '', unit_id: '', start_date: '', end_date: '', description: '', display_order: '' }); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Leader
        </Button>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>Order</th>
                <th>Member</th>
                <th>Position</th>
                <th>Unit</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, idx) => (
                <tr key={leader.id}>
                  <td>{leader.display_order ?? idx + 1}</td>
                  <td className="fw-semibold">{leader.member_name || 'N/A'}</td>
                  <td><Badge bg="primary">{leader.position}</Badge></td>
                  <td>{leader.unit_name || 'All Units'}</td>
                  <td>{leader.start_date || '-'}</td>
                  <td>{leader.end_date || 'Present'}</td>
                  <td>
                    <Badge bg={leader.is_active ? 'success' : 'secondary'}>
                      {leader.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(leader)}>
                        <FiEdit2 />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(leader.id)}>
                        <FiTrash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {leaders.length === 0 && (
                <tr><td colSpan="8" className="text-center py-4 text-muted">No board members found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editLeader ? 'Edit Leader' : 'Add Leader'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Member *</Form.Label>
              <Form.Select name="member_id" value={form.member_id} onChange={handleChange} required>
                <option value="">Select member</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Position *</Form.Label>
              <Form.Control name="position" value={form.position} onChange={handleChange} required placeholder="e.g. Chief de Groupe" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Unit</Form.Label>
              <Form.Select name="unit_id" value={form.unit_id} onChange={handleChange}>
                <option value="">All Units (Group Level)</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Date *</Form.Label>
              <Form.Control type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control type="date" name="end_date" value={form.end_date} onChange={handleChange} />
              <Form.Text className="text-muted">Leave blank if currently active</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} name="description" value={form.description} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Order on website</Form.Label>
              <Form.Control type="number" min="1" name="display_order" value={form.display_order} onChange={handleChange} placeholder="1 = shown first (the Chief)" />
              <Form.Text className="text-muted">Lower numbers appear first on the public Board Members page.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editLeader ? 'Update' : 'Add'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
