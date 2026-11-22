import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Table, Button, Modal, Form, Badge, Row, Col, InputGroup } from 'react-bootstrap'
import { FiDollarSign, FiSearch, FiEye, FiPlus, FiCalendar, FiUsers, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { today } from '../../utils/date'

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ContributionsDashboard() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [contributions, setContributions] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'Cash', payment_date: today(), reference_number: '', notes: '' })
  const [showMultiModal, setShowMultiModal] = useState(false)
  const [multiSelections, setMultiSelections] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // The contribution list already has each member's name, code and unit. (It used to also load
      // the full member list, which the treasurer may not read: that made the whole page fail for them.)
      const [sumRes, contribRes] = await Promise.all([
        api.get(`/contributions/summary?month=${selectedMonth}&year=${selectedYear}`),
        api.get(`/contributions?month=${selectedMonth}&year=${selectedYear}&limit=200`),
      ])
      setSummary(sumRes.data.data)
      setContributions(contribRes.data.data?.contributions || [])
    } catch (err) { toast.error(err.response?.data?.message || 'Could not load contributions') }
    finally { setLoading(false) }
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!selectedMember) return
    try {
      await api.post('/contributions/payments', {
        member_id: selectedMember.member_id || selectedMember.id,
        contribution_month: selectedMember.contribution_month || selectedMonth,
        contribution_year: selectedMember.contribution_year || selectedYear,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        payment_date: payForm.payment_date,
        reference_number: payForm.reference_number || undefined,
        notes: payForm.notes || undefined,
      })
      toast.success('Payment recorded')
      setShowPayModal(false)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const openPayModal = (contrib) => {
    setSelectedMember(contrib)
    const remaining = (contrib.required_amount || 500) - (contrib.total_paid || 0)
    setPayForm({ amount: remaining > 0 ? remaining : '', payment_method: 'Cash', payment_date: today(), reference_number: '', notes: '' })
    setShowPayModal(true)
  }

  const handleMultiPay = async (e) => {
    e.preventDefault()
    if (!selectedMember || multiSelections.length === 0) return
    try {
      const totalAmount = multiSelections.reduce((s, m) => s + m.amount, 0)
      await api.post('/contributions/payments', {
        member_id: selectedMember.member_id || selectedMember.id,
        contribution_month: multiSelections[0].month,
        contribution_year: multiSelections[0].year,
        amount: totalAmount,
        payment_method: payForm.payment_method,
        payment_date: payForm.payment_date,
        notes: `Multi-month payment for: ${multiSelections.map(m => `${monthNames[m.month]} ${m.year}`).join(', ')}`,
      })
      toast.success(`Paid ${multiSelections.length} months (RWF ${totalAmount.toLocaleString()})`)
      setShowMultiModal(false)
      setMultiSelections([])
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const statusBadge = (status) => {
    const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger', 'N/A': 'secondary' }
    return <Badge bg={map[status] || 'secondary'} className="fw-semibold">{status}</Badge>
  }

  const filtered = contributions.filter(c => {
    if (search) {
      const s = search.toLowerCase()
      if (!(c.member_name || '').toLowerCase().includes(s) && !(c.member_code || '').toLowerCase().includes(s)) return false
    }
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  const years = []; for (let y = 2025; y <= 2030; y++) years.push(y)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0"><FiDollarSign className="me-2" /> Monthly Contributions</h4>
          <small className="text-muted">Track umusanzwe payments for {monthNames[selectedMonth]} {selectedYear}</small>
        </div>
        <div className="d-flex gap-2">
          <Link to="/dashboard/contribution-overview" className="btn btn-outline-primary btn-sm"><FiUsers className="me-1" /> All Members Overview</Link>
          <Link to="/dashboard/contribution-reports" className="btn btn-outline-primary btn-sm"><FiCalendar className="me-1" /> Reports</Link>
        </div>
      </div>

      <Row className="g-3 mb-4 align-items-center">
        <Col md={3}>
          <Form.Select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {monthNames.slice(1).map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Form.Select>
        </Col>
        <Col md={3}>
          <InputGroup>
            <InputGroup.Text><FiSearch /></InputGroup.Text>
            <Form.Control placeholder="Search member name, code..." value={search} onChange={e => setSearch(e.target.value)} />
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </Form.Select>
        </Col>
      </Row>

      {summary && (
        <Row className="g-3 mb-4">
          <Col lg={2} md={4} sm={6}>
            <div className="kpi-card h-100" style={{ borderLeftColor: '#6B21A8' }}>
              <div className="kpi-value" style={{ color: '#6B21A8' }}>{summary.total}</div>
              <div className="kpi-label">Total Members</div>
            </div>
          </Col>
          <Col lg={2} md={4} sm={6}>
            <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-success)' }}>
              <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{summary.paid}</div>
              <div className="kpi-label">Paid</div>
            </div>
          </Col>
          <Col lg={2} md={4} sm={6}>
            <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-warning)' }}>
              <div className="kpi-value" style={{ color: 'var(--mop-warning)' }}>{summary.partial}</div>
              <div className="kpi-label">Partial</div>
            </div>
          </Col>
          <Col lg={2} md={4} sm={6}>
            <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-danger)' }}>
              <div className="kpi-value" style={{ color: 'var(--mop-danger)' }}>{summary.unpaid}</div>
              <div className="kpi-label">Unpaid</div>
            </div>
          </Col>
          <Col lg={2} md={4} sm={6}>
            <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-success)' }}>
              <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>RWF {(summary.collected || 0).toLocaleString()}</div>
              <div className="kpi-label">Collected</div>
            </div>
          </Col>
          <Col lg={2} md={4} sm={6}>
            <div className="kpi-card h-100" style={{ borderLeftColor: '#7C3AED' }}>
              <div className="kpi-value" style={{ color: '#7C3AED' }}>{summary.rate || 0}%</div>
              <div className="kpi-label">Collection Rate</div>
            </div>
          </Col>
        </Row>
      )}

      {summary && summary.members_with_missed > 0 && (
        <div className="alert alert-warning d-flex align-items-center mb-4 py-2" role="alert">
          <FiAlertTriangle className="me-2" />
          <span><strong>{summary.members_with_missed}</strong> members have missed contribution months. Outstanding total: <strong>RWF {(summary.outstanding || 0).toLocaleString()}</strong></span>
        </div>
      )}

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Member</th>
                <th>Unit</th>
                <th>Required</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c.id}>
                  <td>{idx + 1}</td>
                  <td><code>{c.member_code}</code></td>
                  <td className="fw-semibold">{c.member_name}</td>
                  <td><Badge bg="primary">{c.unit_name || 'N/A'}</Badge></td>
                  <td>{Number(c.required_amount).toLocaleString()} RWF</td>
                  <td className="fw-semibold" style={{ color: c.total_paid >= c.required_amount ? 'var(--mop-success)' : '#7C3AED' }}>{Number(c.total_paid).toLocaleString()} RWF</td>
                  <td style={{ color: c.balance > 0 ? 'var(--mop-danger)' : '#6b7280' }}>{Number(c.balance).toLocaleString()} RWF</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {c.status !== 'Paid' && (
                        <Button variant="outline-success" size="sm" onClick={() => openPayModal(c)} title="Record Payment"><FiDollarSign /></Button>
                      )}
                      <Link to={`/dashboard/member-contributions/${c.member_id}`} className="btn btn-outline-primary btn-sm" title="Full History"><FiEye /></Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No contributions found'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Record Contribution</Modal.Title></Modal.Header>
        <Form onSubmit={handleRecordPayment}>
          <Modal.Body>
            {selectedMember && (
              <div className="mb-3 p-3 rounded" style={{ background: '#F3E8FF' }}>
                <p className="mb-1"><strong>Member:</strong> {selectedMember.member_name}</p>
                <p className="mb-1"><strong>Code:</strong> {selectedMember.member_code}</p>
                <p className="mb-1"><strong>Month:</strong> {monthNames[selectedMember.contribution_month || selectedMonth]} {selectedMember.contribution_year || selectedYear}</p>
                <p className="mb-0"><strong>Required:</strong> {Number(selectedMember.required_amount || 500).toLocaleString()} RWF</p>
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Amount Paid (RWF) *</Form.Label>
              <Form.Control type="number" min="1" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                    <option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Date</Form.Label>
                  <Form.Control type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Reference / Receipt</Form.Label>
              <Form.Control value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="Optional" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Optional" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Payment</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
