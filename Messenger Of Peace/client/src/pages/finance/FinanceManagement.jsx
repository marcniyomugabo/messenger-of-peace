import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Badge, Row, Col, InputGroup } from 'react-bootstrap'
import { FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiSearch, FiTrendingUp, FiTrendingDown, FiActivity } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function FinanceManagement() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ total_income: 0, total_withdrawals: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({
    type: 'Deposit', amount: '', description: '', reference_number: '', status: 'Pending'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const res = await api.get('/finance')
      setTransactions(res.data.data?.records || [])
      setSummary(res.data.data?.summary || { total_income: 0, total_withdrawals: 0, balance: 0 })
    } catch {
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ type: 'Deposit', amount: '', description: '', reference_number: '', status: 'Pending' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      type: item.type || 'Deposit',
      amount: item.amount || '',
      description: item.description || '',
      reference_number: item.reference_number || '',
      status: item.status || 'Pending'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount')
    setSaving(true)
    try {
      if (editItem) {
        await api.put(`/finance/${editItem.id}`, form)
        toast.success('Transaction updated')
      } else {
        await api.post('/finance', form)
        toast.success('Transaction recorded')
      }
      setShowModal(false)
      fetchTransactions()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this ${item.type.toLowerCase()} of RWF ${Number(item.amount).toLocaleString()}?`)) return
    try {
      await api.delete(`/finance/${item.id}`)
      toast.success('Transaction deleted')
      fetchTransactions()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete transaction')
    }
  }

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference_number?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'All' || t.type === filterType
    return matchSearch && matchType
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold"><FiDollarSign className="me-2" style={{ color: '#7C3AED' }} />Finance Management</h4>
          <small className="text-muted">Manage income, expenses, and financial records</small>
        </div>
        <Button style={{ background: '#7C3AED', border: 'none' }} onClick={openCreate}>
          <FiPlus className="me-1" />Record Transaction
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card h-100" style={{ borderLeftColor: '#16a34a' }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FiTrendingUp style={{ color: '#16a34a', fontSize: '1.2rem' }} />
            </div>
            <div className="kpi-value" style={{ color: '#16a34a' }}>RWF {summary.total_income?.toLocaleString()}</div>
            <div className="kpi-label">Total Income</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card h-100" style={{ borderLeftColor: '#dc2626' }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FiTrendingDown style={{ color: '#dc2626', fontSize: '1.2rem' }} />
            </div>
            <div className="kpi-value" style={{ color: '#dc2626' }}>RWF {summary.total_withdrawals?.toLocaleString()}</div>
            <div className="kpi-label">Total Expenses</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card h-100" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <FiActivity style={{ color: '#7C3AED', fontSize: '1.2rem' }} />
            </div>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>RWF {summary.balance?.toLocaleString()}</div>
            <div className="kpi-label">Balance</div>
          </div>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex gap-3">
            <InputGroup className="flex-grow-1">
              <InputGroup.Text style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                <FiSearch style={{ color: '#7C3AED' }} />
              </InputGroup.Text>
              <Form.Control placeholder="Search transactions..." value={search}
                onChange={e => setSearch(e.target.value)} style={{ border: '1px solid #DDD6FE' }} />
            </InputGroup>
            <Form.Select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ width: 160, border: '1px solid #DDD6FE' }}>
              <option>All Types</option>
              <option>Deposit</option>
              <option>Withdrawal</option>
            </Form.Select>
          </div>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FiDollarSign size={48} className="mb-3 opacity-25" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#F3E8FF' }}>
                  <tr>
                    <th className="ps-3" style={{ color: '#581C87' }}>Type</th>
                    <th style={{ color: '#581C87' }}>Description</th>
                    <th style={{ color: '#581C87' }}>Reference</th>
                    <th style={{ color: '#581C87' }}>Amount (RWF)</th>
                    <th style={{ color: '#581C87' }}>Status</th>
                    <th style={{ color: '#581C87' }}>Date</th>
                    <th className="text-end pe-3" style={{ color: '#581C87' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id}>
                      <td className="ps-3">
                        <Badge style={{ background: item.type === 'Deposit' ? '#16a34a' : '#dc2626', color: '#fff' }}>
                          {item.type}
                        </Badge>
                      </td>
                      <td><small>{item.description || '-'}</small></td>
                      <td><small className="text-muted">{item.reference_number || '-'}</small></td>
                      <td className="fw-semibold" style={{ color: item.type === 'Deposit' ? '#16a34a' : '#dc2626' }}>
                        {item.type === 'Deposit' ? '+' : '-'} RWF {Number(item.amount)?.toLocaleString()}
                      </td>
                      <td>
                        <Badge style={{
                          background: item.status === 'Approved' ? '#16a34a' : item.status === 'Rejected' ? '#dc2626' : '#f59e0b',
                          color: '#fff'
                        }}>
                          {item.status}
                        </Badge>
                      </td>
                      <td><small className="text-muted">{new Date(item.created_at || item.date).toLocaleDateString()}</small></td>
                      <td className="text-end pe-3">
                        <Button variant="link" size="sm" onClick={() => openEdit(item)}>
                          <FiEdit2 style={{ color: '#7C3AED' }} />
                        </Button>
                        <Button variant="link" size="sm" onClick={() => handleDelete(item)}>
                          <FiTrash2 style={{ color: '#dc2626' }} />
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

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton style={{ background: '#F3E8FF' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiDollarSign className="me-2" />{editItem ? 'Edit Transaction' : 'Record Transaction'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Type *</Form.Label>
                  <Form.Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }}>
                    <option>Deposit</option>
                    <option>Withdrawal</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Amount (RWF) *</Form.Label>
                  <Form.Control type="number" min="1" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="Enter amount" style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Description</Form.Label>
                  <Form.Control value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="What is this transaction for?" style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Reference Number</Form.Label>
                  <Form.Control value={form.reference_number}
                    onChange={e => setForm({ ...form, reference_number: e.target.value })}
                    placeholder="e.g. receipt #001" style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }}>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" style={{ background: '#7C3AED', border: 'none' }} disabled={saving}>
              {saving ? 'Saving...' : editItem ? 'Update' : 'Record'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
