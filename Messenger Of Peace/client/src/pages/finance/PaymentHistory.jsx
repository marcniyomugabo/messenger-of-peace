import { useState, useEffect } from 'react'
import { Table, Badge, Row, Col, Form, InputGroup, Button, Modal } from 'react-bootstrap'
import { FiSearch, FiDollarSign, FiEdit2, FiX } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function PaymentHistory() {
  const now = new Date()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editPayment, setEditPayment] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', payment_method: '', payment_date: '', reference_number: '', notes: '' })

  useEffect(() => { fetchPayments() }, [filterMonth, filterYear, filterMethod])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 500 })
      if (filterMonth && filterYear) { params.append('month', filterMonth); params.append('year', filterYear) }
      if (filterMethod) params.append('payment_method', filterMethod)
      if (search) params.append('search', search)
      const res = await api.get(`/contributions/payments?${params}`)
      setPayments(res.data.data?.payments || [])
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => fetchPayments()

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/contributions/payments/${editPayment.id}`, {
        amount: parseFloat(editForm.amount),
        payment_method: editForm.payment_method,
        payment_date: editForm.payment_date,
        reference_number: editForm.reference_number || undefined,
        notes: editForm.notes || undefined,
      })
      toast.success('Payment updated')
      setShowEditModal(false)
      fetchPayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this payment? The amount will be reversed from the member\'s contribution.')) return
    try {
      await api.patch(`/contributions/payments/${id}/cancel`)
      toast.success('Payment cancelled')
      fetchPayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed')
    }
  }

  const filtered = payments.filter(p => {
    if (search) {
      const s = search.toLowerCase()
      if (!(p.member_name || '').toLowerCase().includes(s) && !(p.member_code || '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount), 0)
  const years = []; for (let y = 2025; y <= 2030; y++) years.push(y)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0"><FiDollarSign className="me-2" /> Payment History</h4>
          <small className="text-muted">All recorded contribution payments</small>
        </div>
      </div>

      <div className="mop-card mb-4">
        <div className="card-body">
          <Row className="g-3">
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text><FiSearch /></InputGroup.Text>
                <Form.Control placeholder="Search member..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                <option value="">All Months</option>
                {monthNames.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank">Bank</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Button variant="primary" onClick={handleSearch} className="w-100"><FiSearch className="me-1" /> Search</Button>
            </Col>
          </Row>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <small className="text-muted">{filtered.length} payments &middot; Total: <strong>RWF {totalAmount.toLocaleString()}</strong></small>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Code</th>
                <th>Month</th>
                <th>Amount (RWF)</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{p.member_name}</td>
                  <td><code>{p.member_code}</code></td>
                  <td>{monthNames[p.contribution_month]} {p.contribution_year}</td>
                  <td className="fw-semibold" style={{ color: '#7C3AED' }}>{Number(p.amount).toLocaleString()}</td>
                  <td><Badge bg="info">{p.payment_method || 'N/A'}</Badge></td>
                  <td>{p.payment_date || 'N/A'}</td>
                  <td>
                    <Badge bg={p.status === 'Completed' ? 'success' : p.status === 'Cancelled' ? 'danger' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      {p.status === 'Completed' && (
                        <>
                          <Button variant="outline-secondary" size="sm" onClick={() => { setEditPayment(p); setEditForm({ amount: p.amount, payment_method: p.payment_method || 'Cash', payment_date: p.payment_date || '', reference_number: p.reference_number || '', notes: p.notes || '' }); setShowEditModal(true); }}>
                            <FiEdit2 />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleCancel(p.id)}>
                            <FiX />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No payments found'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEdit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Amount (RWF) *</Form.Label>
              <Form.Control type="number" min="1" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                <option value="Cash">Cash</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Bank">Bank</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Date</Form.Label>
              <Form.Control type="date" value={editForm.payment_date} onChange={e => setEditForm({ ...editForm, payment_date: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Reference Number</Form.Label>
              <Form.Control value={editForm.reference_number} onChange={e => setEditForm({ ...editForm, reference_number: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Update Payment</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
