import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col, Tabs, Tab } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiBook, FiCheck, FiX } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// Group money: income received and expenses paid (finance_income / finance_expenses).
// Only approved expenses count in the balance; approving needs the finance.approve permission.

const INCOME_CATEGORIES = ['Donations', 'Fundraising', 'Grants', 'Events', 'Other']
const EXPENSE_CATEGORIES = ['Supplies', 'Transport', 'Events', 'Training', 'Uniforms', 'Other']

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const emptyForm = () => ({ date: today(), amount: '', source: '', vendor: '', category: '', reference: '', description: '' })
const money = (n) => `RWF ${Number(n || 0).toLocaleString()}`

export default function FinancialLedger() {
  const { user } = useAuth()
  const canApprove = user?.role === 'super_admin' || (user?.permissions || []).includes('finance.approve')

  const [tab, setTab] = useState('income')
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [balance, setBalance] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [inc, exp, bal] = await Promise.allSettled([
      api.get('/finance/income', { params: { limit: 200 } }),
      api.get('/finance/expenses', { params: { limit: 200 } }),
      api.get('/finance/balance'),
    ])
    setIncome(inc.status === 'fulfilled' ? inc.value.data.data || [] : [])
    setExpenses(exp.status === 'fulfilled' ? exp.value.data.data || [] : [])
    setBalance(bal.status === 'fulfilled' ? bal.value.data.data || {} : {})
  }

  const isIncome = tab === 'income'
  const path = isIncome ? '/finance/income' : '/finance/expenses'

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      date: item.date || today(), amount: item.amount, source: item.source || '', vendor: item.vendor || '',
      category: item.category || '', reference: item.reference || '', description: item.description || '',
    })
    setShowModal(true)
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      date: form.date, amount: parseFloat(form.amount), category: form.category || null,
      reference: form.reference || null, description: form.description || null,
      ...(isIncome ? { source: form.source || null } : { vendor: form.vendor || null }),
    }
    try {
      if (editItem) await api.put(`${path}/${editItem.id}`, payload)
      else await api.post(path, payload)
      toast.success(editItem ? 'Saved' : (isIncome ? 'Income recorded' : 'Expense recorded'))
      setShowModal(false)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this ${isIncome ? 'income' : 'expense'} record?`)) return
    try {
      await api.delete(`${path}/${item.id}`)
      toast.success('Deleted')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const setStatus = async (item, status) => {
    try {
      await api.put(`/finance/expenses/${item.id}`, { status })
      toast.success(`Expense ${status.toLowerCase()}`)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const statusBadge = (s) => <Badge bg={s === 'Approved' ? 'success' : s === 'Rejected' ? 'danger' : 'warning'}>{s}</Badge>
  // Approved expenses are locked for people who cannot approve.
  const canChange = (item) => isIncome || item.status !== 'Approved' || canApprove

  const rows = isIncome ? income : expenses

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiBook className="me-2" /> Income &amp; Expenses</h4>
        <Button variant="primary" onClick={openAdd}>
          <FiPlus className="me-1" /> {isIncome ? 'Record Income' : 'Record Expense'}
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{money(balance.total_income)}</div>
            <div className="kpi-label">Total Income</div>
            <small className="text-muted">This month: {money(balance.current_month_income)}</small>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#581C87' }}>
            <div className="kpi-value" style={{ color: '#581C87' }}>{money(balance.total_expenses)}</div>
            <div className="kpi-label">Approved Expenses</div>
            <small className="text-muted">This month: {money(balance.current_month_expenses)}</small>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{money(balance.balance)}</div>
            <div className="kpi-label">Balance</div>
            <small className="text-muted">Income minus approved expenses</small>
          </div>
        </Col>
      </Row>

      <Tabs activeKey={tab} onSelect={(k) => setTab(k)} className="mb-3">
        <Tab eventKey="income" title={`Income (${income.length})`} />
        <Tab eventKey="expenses" title={`Expenses (${expenses.length})`} />
      </Tabs>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>{isIncome ? 'Source' : 'Vendor'}</th>
                <th>Category</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Amount (RWF)</th>
                {!isIncome && <th>Status</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td>{idx + 1}</td>
                  <td>{r.date}</td>
                  <td>{(isIncome ? r.source : r.vendor) || '-'}</td>
                  <td>{r.category || '-'}</td>
                  <td>{r.description || '-'}</td>
                  <td className="small">{r.reference || '-'}</td>
                  <td className={isIncome ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                    {isIncome ? '+' : '-'}{Number(r.amount).toLocaleString()}
                  </td>
                  {!isIncome && <td>{statusBadge(r.status)}</td>}
                  <td>
                    <div className="d-flex gap-1">
                      {!isIncome && canApprove && r.status === 'Pending' && (
                        <>
                          <Button variant="outline-success" size="sm" title="Approve" onClick={() => setStatus(r, 'Approved')}><FiCheck /></Button>
                          <Button variant="outline-danger" size="sm" title="Reject" onClick={() => setStatus(r, 'Rejected')}><FiX /></Button>
                        </>
                      )}
                      {canChange(r) && (
                        <>
                          <Button variant="outline-secondary" size="sm" title="Edit" onClick={() => openEdit(r)}><FiEdit2 /></Button>
                          <Button variant="outline-danger" size="sm" title="Delete" onClick={() => handleDelete(r)}><FiTrash2 /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={isIncome ? 8 : 9} className="text-center py-4 text-muted">No {isIncome ? 'income' : 'expenses'} recorded</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit' : 'Record'} {isIncome ? 'Income' : 'Expense'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Date *</Form.Label>
                  <Form.Control type="date" name="date" value={form.date} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Amount (RWF) *</Form.Label>
                  <Form.Control type="number" min="1" name="amount" value={form.amount} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>{isIncome ? 'Source' : 'Vendor / Paid to'}</Form.Label>
                  <Form.Control name={isIncome ? 'source' : 'vendor'} value={isIncome ? form.source : form.vendor} onChange={handleChange}
                    placeholder={isIncome ? 'e.g. Parents committee' : 'e.g. Kigali Stationery'} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category" value={form.category} onChange={handleChange}>
                    <option value="">Select category</option>
                    {(isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Reference / Receipt No.</Form.Label>
                  <Form.Control name="reference" value={form.reference} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={2} name="description" value={form.description} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            {!isIncome && !editItem && (
              <small className="text-muted d-block mt-3">New expenses start as Pending and count in the balance once approved.</small>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editItem ? 'Save' : 'Record'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
