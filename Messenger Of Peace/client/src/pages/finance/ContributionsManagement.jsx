import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiDollarSign, FiUsers } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function ContributionsManagement() {
  const [contributions, setContributions] = useState([])
  const [members, setMembers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    member_id: '', amount: '', contribution_month: '', contribution_year: new Date().getFullYear().toString(), status: 'Pending', notes: ''
  })
  const [bulkForm, setBulkForm] = useState({
    contribution_month: '', contribution_year: new Date().getFullYear().toString(), amount: '', status: 'Pending', notes: ''
  })

  useEffect(() => {
    fetchContributions()
    fetchMembers()
  }, [])

  const fetchContributions = async () => {
    try {
      const res = await api.get('/contributions')
      setContributions(res.data.data?.contributions || [])
    } catch {
      setContributions([])
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await api.get('/members/admin?limit=500')
      setMembers(res.data.data?.members || [])
    } catch {
      setMembers([])
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleBulkChange = (e) => setBulkForm({ ...bulkForm, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editItem) {
        await api.patch(`/contributions/${editItem.id}`, {
          status: form.status,
          notes: form.notes || null,
        })
        toast.success('Contribution updated')
      } else {
        await api.post('/contributions', {
          member_id: parseInt(form.member_id),
          amount: parseFloat(form.amount),
          contribution_month: parseInt(form.contribution_month),
          contribution_year: parseInt(form.contribution_year),
          status: form.status,
          notes: form.notes || null,
        })
        toast.success('Contribution recorded')
      }
      setShowModal(false)
      setForm({ member_id: '', amount: '', contribution_month: '', contribution_year: new Date().getFullYear().toString(), status: 'Pending', notes: '' })
      setEditItem(null)
      fetchContributions()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/contributions/bulk', {
        contribution_month: parseInt(bulkForm.contribution_month),
        contribution_year: parseInt(bulkForm.contribution_year),
        amount: bulkForm.amount ? parseFloat(bulkForm.amount) : undefined,
        status: bulkForm.status,
        notes: bulkForm.notes || null,
      })
      const d = res.data.data
      toast.success(`${d.created} contributions recorded, ${d.skipped} already exist`)
      setShowBulkModal(false)
      setBulkForm({ contribution_month: '', contribution_year: new Date().getFullYear().toString(), amount: '', status: 'Pending', notes: '' })
      fetchContributions()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk operation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      member_id: item.member_id || '',
      amount: item.amount || '',
      contribution_month: item.contribution_month || '',
      contribution_year: item.contribution_year || '',
      status: item.status || 'Pending',
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  const handleMemberSelect = (e) => {
    const memberId = e.target.value
    const member = members.find(m => m.id === parseInt(memberId))
    setForm({
      ...form,
      member_id: memberId,
      amount: member?.monthly_contribution || form.amount || ''
    })
  }

  const statusBadge = (status) => {
    const map = { Paid: 'success', Pending: 'warning', Partial: 'info', Exempted: 'secondary', Rejected: 'danger' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  const totalPaid = contributions.filter(c => c.status === 'Paid').reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPending = contributions.filter(c => c.status !== 'Paid').reduce((sum, c) => sum + Number(c.amount), 0)

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const activeMembers = members.filter(m => m.status === 'Active')

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiDollarSign className="me-2" /> Contributions</h4>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => setShowBulkModal(true)}>
            <FiUsers className="me-1" /> Record for All
          </Button>
          <Button variant="primary" onClick={() => { setEditItem(null); setForm({ member_id: '', amount: '', contribution_month: '', contribution_year: new Date().getFullYear().toString(), status: 'Pending', notes: '' }); setShowModal(true) }}>
            <FiPlus className="me-1" /> Add Contribution
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>RWF {totalPaid.toLocaleString()}</div>
            <div className="kpi-label">Total Paid</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#9333EA' }}>
            <div className="kpi-value" style={{ color: '#9333EA' }}>RWF {totalPending.toLocaleString()}</div>
            <div className="kpi-label">Pending</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{contributions.length}</div>
            <div className="kpi-label">Total Records</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Amount (RWF)</th>
                <th>Period</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c, idx) => (
                <tr key={c.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{c.member_name || 'N/A'}</td>
                  <td>{Number(c.amount).toLocaleString()}</td>
                  <td>{monthNames[c.contribution_month] || c.contribution_month} {c.contribution_year}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td className="text-muted small">{c.notes || '-'}</td>
                  <td>
                    <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(c)}><FiEdit2 /></Button>
                  </td>
                </tr>
              ))}
              {contributions.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No contributions found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Single Contribution Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit' : 'Record'} Contribution</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {!editItem && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Member *</Form.Label>
                  <Form.Select name="member_id" value={form.member_id} onChange={handleMemberSelect} required>
                    <option value="">Select member</option>
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.member_code}) - Umusanzwe: RWF {(m.monthly_contribution || 500).toLocaleString()}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount (RWF) *</Form.Label>
                      <Form.Control type="number" name="amount" value={form.amount} onChange={handleChange} required placeholder="Auto-filled from member's umusanzwe" />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Month *</Form.Label>
                      <Form.Select name="contribution_month" value={form.contribution_month} onChange={handleChange} required>
                        <option value="">Month</option>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <option key={m} value={m}>{monthNames[m]}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Year *</Form.Label>
                      <Form.Control name="contribution_year" value={form.contribution_year} onChange={handleChange} required />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
            {editItem && (
              <Form.Group className="mb-3">
                <Form.Label>Status *</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Exempted">Exempted</option>
                  <option value="Rejected">Rejected</option>
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control name="notes" value={form.notes} onChange={handleChange} placeholder="Optional note" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editItem ? 'Update' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bulk Contribution Modal */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Record Umusanzwe for All Active Members</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleBulkSubmit}>
          <Modal.Body>
            <p className="text-muted mb-3">
              This will record a contribution for all <strong>{activeMembers.length}</strong> active members at once.
              If a member already has a record for the selected month, it will be skipped.
              Each member's own umusanzwe amount will be used, or you can override with a custom amount below.
            </p>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Month *</Form.Label>
                  <Form.Select name="contribution_month" value={bulkForm.contribution_month} onChange={handleBulkChange} required>
                    <option value="">Select month</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{monthNames[m]}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Year *</Form.Label>
                  <Form.Control name="contribution_year" value={bulkForm.contribution_year} onChange={handleBulkChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Override Amount (RWF) - Leave empty to use each member's umusanzwe</Form.Label>
              <Form.Control type="number" name="amount" value={bulkForm.amount} onChange={handleBulkChange} placeholder="Leave empty for individual amounts" min="0" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" value={bulkForm.status} onChange={handleBulkChange}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control name="notes" value={bulkForm.notes} onChange={handleBulkChange} placeholder="Optional note for all" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBulkModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Processing...' : `Record for ${activeMembers.length} Members`}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
