import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiBook } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function FinancialLedger() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ total_income: 0, total_withdrawals: 0, balance: 0 })
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({
    type: 'Deposit', amount: '', description: '', reference_number: '', status: 'Pending'
  })

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/finance')
      setTransactions(res.data.data?.records || [])
      setSummary(res.data.data?.summary || { total_income: 0, total_withdrawals: 0, balance: 0 })
    } catch {
      setTransactions([])
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description || null,
        reference_number: form.reference_number || null,
      }
      if (editItem) {
        await api.put(`/finance/${editItem.id}`, { ...payload, status: form.status })
        toast.success('Transaction updated')
      } else {
        await api.post('/finance', payload)
        toast.success('Transaction recorded')
      }
      setShowModal(false)
      setForm({ type: 'Deposit', amount: '', description: '', reference_number: '', status: 'Pending' })
      setEditItem(null)
      fetchTransactions()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      type: item.type, amount: item.amount, description: item.description || '',
      reference_number: item.reference_number || '', status: item.status
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await api.delete(`/finance/${id}`)
      toast.success('Deleted')
      fetchTransactions()
    } catch {
      toast.error('Failed')
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-'

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiBook className="me-2" /> Financial Ledger</h4>
        <Button variant="primary" onClick={() => { setEditItem(null); setForm({ type: 'Deposit', amount: '', description: '', reference_number: '', status: 'Pending' }); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Transaction
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>RWF {Number(summary.total_income || 0).toLocaleString()}</div>
            <div className="kpi-label">Total Income</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#581C87' }}>
            <div className="kpi-value" style={{ color: '#581C87' }}>RWF {Number(summary.total_withdrawals || 0).toLocaleString()}</div>
            <div className="kpi-label">Total Expenses</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">RWF {Number(summary.balance || 0).toLocaleString()}</div>
            <div className="kpi-label">Current Balance</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount (RWF)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, idx) => (
                <tr key={t.id}>
                  <td>{idx + 1}</td>
                  <td>{formatDate(t.created_at)}</td>
                  <td>{t.description || '-'}</td>
                  <td>
                    <Badge bg={t.type === 'Deposit' || t.type === 'Contribution' ? 'success' : 'danger'}>
                      {t.type}
                    </Badge>
                  </td>
                  <td className={t.type === 'Deposit' || t.type === 'Contribution' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                    {t.type === 'Deposit' || t.type === 'Contribution' ? '+' : '-'}{Number(t.amount).toLocaleString()}
                  </td>
                  <td><Badge bg={t.status === 'Approved' ? 'success' : t.status === 'Rejected' ? 'danger' : 'warning'}>{t.status}</Badge></td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(t)}><FiEdit2 /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(t.id)}><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No transactions found</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit' : 'Add'} Transaction</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select name="type" value={form.type} onChange={handleChange} required>
                    <option value="Deposit">Deposit (Income)</option>
                    <option value="Withdrawal">Withdrawal (Expense)</option>
                    <option value="Adjustment">Adjustment</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount (RWF) *</Form.Label>
                  <Form.Control type="number" name="amount" value={form.amount} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control name="description" value={form.description} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Reference Number</Form.Label>
              <Form.Control name="reference_number" value={form.reference_number} onChange={handleChange} />
            </Form.Group>
            {editItem && (
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </Form.Select>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editItem ? 'Update' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
