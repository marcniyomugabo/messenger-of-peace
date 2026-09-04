import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Table, Badge, Row, Col, Card, Button, Modal, Form } from 'react-bootstrap'
import { FiArrowLeft, FiDollarSign, FiCheckCircle, FiXCircle, FiAlertTriangle, FiUser, FiCalendar } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MemberContributions() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showMultiModal, setShowMultiModal] = useState(false)
  const [payMonth, setPayMonth] = useState('')
  const [payYear, setPayYear] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payRef, setPayRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [selectedMonths, setSelectedMonths] = useState([])

  useEffect(() => { fetchData() }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/contributions/member/${id}`)
      setData(res.data.data)
    } catch { setData(null) }
    finally { setLoading(false) }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    try {
      await api.post('/contributions/payments', {
        member_id: parseInt(id), contribution_month: parseInt(payMonth), contribution_year: parseInt(payYear),
        amount: parseFloat(payAmount), payment_method: payMethod, payment_date: payDate,
        reference_number: payRef || undefined, notes: payNotes || undefined,
      })
      toast.success('Payment recorded')
      setShowPayModal(false)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleMultiPay = async (e) => {
    e.preventDefault()
    if (selectedMonths.length === 0) return
    try {
      await api.post('/contributions/payments/multi', {
        member_id: parseInt(id),
        months: selectedMonths.map(m => ({ month: m.month, year: m.year, amount: m.required_amount })),
        payment_method: payMethod, payment_date: payDate, notes: payNotes || undefined,
      })
      toast.success(`Paid ${selectedMonths.length} months`)
      setShowMultiModal(false)
      setSelectedMonths([])
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const openPayForMonth = (h) => {
    setPayMonth(h.month); setPayYear(h.year)
    setPayAmount(String(h.required_amount - h.total_paid)); setPayMethod('Cash')
    setPayDate(new Date().toISOString().split('T')[0]); setPayRef(''); setPayNotes('')
    setShowPayModal(true)
  }

  const toggleMonth = (h) => {
    setSelectedMonths(prev => {
      const exists = prev.find(m => m.month === h.month && m.year === h.year)
      if (exists) return prev.filter(m => !(m.month === h.month && m.year === h.year))
      return [...prev, { month: h.month, year: h.year, required_amount: h.required_amount - h.total_paid }]
    })
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
  if (!data) return <div className="text-center py-5">Member not found</div>

  const { member, history, total_paid, total_expected, outstanding, paid_months, partial_months, unpaid_months, rate, missed } = data

  const statusBadge = (status) => {
    const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger' }
    return <Badge bg={map[status] || 'secondary'} className="fw-semibold">{status}</Badge>
  }

  const years = []; for (let y = 2025; y <= 2030; y++) years.push(y)

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button as={Link} to="/dashboard/contributions" variant="outline-primary" size="sm"><FiArrowLeft /></Button>
        <h4 className="mb-0"><FiDollarSign className="me-2" /> Contribution History</h4>
      </div>

      <Card className="mop-card mb-4">
        <Card.Body>
          <Row className="g-4 align-items-center">
            <Col md={2} className="text-center">
              <div className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #F3E8FF, #e9d5ff)' }}>
                <FiUser size={32} style={{ color: '#6B21A8' }} />
              </div>
            </Col>
            <Col md={4}>
              <h5 className="mb-1">{member.first_name} {member.last_name}</h5>
              <p className="mb-1"><code>{member.member_code}</code></p>
              <p className="mb-0 text-muted">Joined: {member.join_date} &middot; Umusanzwe: <strong style={{ color: '#7C3AED' }}>RWF {(member.monthly_contribution || 500).toLocaleString()}/month</strong></p>
            </Col>
            <Col md={6}>
              <Row className="g-2">
                <Col xs={4} sm={2}><div className="text-center p-2 rounded" style={{ background: '#F0FDF4' }}><div className="fs-5 fw-bold" style={{ color: '#16a34a' }}>{paid_months}</div><small className="text-muted">Paid</small></div></Col>
                <Col xs={4} sm={2}><div className="text-center p-2 rounded" style={{ background: '#FEF2F2' }}><div className="fs-5 fw-bold" style={{ color: '#dc2626' }}>{unpaid_months}</div><small className="text-muted">Unpaid</small></div></Col>
                <Col xs={4} sm={2}><div className="text-center p-2 rounded" style={{ background: '#FEF9C3' }}><div className="fs-5 fw-bold" style={{ color: '#f59e0b' }}>{partial_months}</div><small className="text-muted">Partial</small></div></Col>
                <Col xs={4} sm={2}><div className="text-center p-2 rounded" style={{ background: '#F0FDF4' }}><div className="fs-5 fw-bold" style={{ color: '#16a34a' }}>{rate}%</div><small className="text-muted">Rate</small></div></Col>
                <Col xs={4} sm={2}><div className="text-center p-2 rounded" style={{ background: '#F3E8FF' }}><div className="fs-5 fw-bold" style={{ color: '#16a34a' }}>{total_paid.toLocaleString()}</div><small className="text-muted">Total Paid</small></div></Col>
                <Col xs={4} sm={2}><div className="text-center p-2 rounded" style={{ background: outstanding > 0 ? '#FEF2F2' : '#F0FDF4' }}><div className="fs-5 fw-bold" style={{ color: outstanding > 0 ? '#dc2626' : '#16a34a' }}>{outstanding.toLocaleString()}</div><small className="text-muted">Outstanding</small></div></Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {missed && missed.length > 0 && (
        <Card className="mb-4" style={{ border: '1px solid #FECACA', background: '#FEF2F2' }}>
          <Card.Body className="py-3">
            <h6 className="mb-2" style={{ color: '#dc2626' }}><FiAlertTriangle className="me-1" /> Missed Contributions</h6>
            <div className="d-flex flex-wrap gap-2">
              {missed.map((m, i) => (
                <Badge key={i} bg="danger" className="fw-normal px-3 py-2">
                  {monthNames[m.month]} {m.year} — {m.status === 'Partial' ? 'RWF ' + m.balance.toLocaleString() + ' remaining' : 'RWF ' + m.required_amount.toLocaleString() + ' unpaid'}
                </Badge>
              ))}
            </div>
            <div className="mt-2">
              <Button variant="outline-danger" size="sm" onClick={() => { setSelectedMonths(missed.map(m => ({ month: m.month, year: m.year, required_amount: m.required_amount - m.total_paid }))); setShowMultiModal(true) }}>
                <FiDollarSign className="me-1" /> Pay Missed Months
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {missed && missed.length === 0 && (
        <div className="alert alert-success d-flex align-items-center mb-4 py-2">
          <FiCheckCircle className="me-2" /> No missed contributions. All months are fully paid.
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Complete Monthly History</h6>
        <Button variant="primary" size="sm" onClick={() => { setPayMonth(''); setPayYear(''); setPayAmount(''); setShowPayModal(true) }}>
          <FiDollarSign className="me-1" /> Record Payment
        </Button>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr><th>Month</th><th>Required</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {history.map((h, idx) => (
                <tr key={idx} style={h.status === 'Unpaid' ? { background: '#FEF2F2' } : h.status === 'Partial' ? { background: '#FFFBEB' } : {}}>
                  <td className="fw-semibold">{monthNames[h.month]} {h.year}</td>
                  <td>{h.required_amount.toLocaleString()} RWF</td>
                  <td className="fw-semibold" style={{ color: h.total_paid > 0 ? '#16a34a' : '#6b7280' }}>{h.total_paid.toLocaleString()} RWF</td>
                  <td style={{ color: h.balance > 0 ? '#dc2626' : '#6b7280' }}>{h.balance.toLocaleString()} RWF</td>
                  <td>{statusBadge(h.status)}</td>
                  <td>{h.payment_date || <span className="text-muted">—</span>}</td>
                  <td>
                    {h.status !== 'Paid' && (
                      <Button variant="outline-success" size="sm" onClick={() => openPayForMonth(h)} title={`Pay ${monthNames[h.month]}`}>
                        <FiDollarSign />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-muted">No contribution history</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Single Payment Modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Record Contribution</Modal.Title></Modal.Header>
        <Form onSubmit={handleRecordPayment}>
          <Modal.Body>
            <p className="text-muted mb-3">Record payment for {member.first_name} {member.last_name}</p>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Month *</Form.Label>
                  <Form.Select value={payMonth} onChange={e => setPayMonth(e.target.value)} required>
                    <option value="">Select month</option>
                    {monthNames.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Year *</Form.Label>
                  <Form.Select value={payYear} onChange={e => setPayYear(e.target.value)} required>
                    <option value="">Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Amount (RWF) *</Form.Label>
              <Form.Control type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Method</Form.Label>
                  <Form.Select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Date</Form.Label>
                  <Form.Control type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Reference</Form.Label><Form.Control value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Notes</Form.Label><Form.Control as="textarea" rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional" /></Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Payment</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Multi Payment Modal */}
      <Modal show={showMultiModal} onHide={() => setShowMultiModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Pay Missed Months</Modal.Title></Modal.Header>
        <Form onSubmit={handleMultiPay}>
          <Modal.Body>
            <p className="text-muted mb-3">Select missed months to pay for {member.first_name} {member.last_name}</p>
            {missed && missed.map(h => (
              <Form.Check key={`${h.month}-${h.year}`} type="checkbox" label={`${monthNames[h.month]} ${h.year} — RWF ${(h.required_amount - h.total_paid).toLocaleString()}`} checked={selectedMonths.some(m => m.month === h.month && m.year === h.year)} onChange={() => toggleMonth(h)} className="mb-2" />
            ))}
            {selectedMonths.length > 0 && (
              <div className="mt-3 p-3 rounded" style={{ background: '#F3E8FF' }}>
                <strong>Total: RWF {selectedMonths.reduce((s, m) => s + m.required_amount, 0).toLocaleString()}</strong>
              </div>
            )}
            <Row className="g-3 mt-2">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Method</Form.Label>
                  <Form.Select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Date</Form.Label>
                  <Form.Control type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMultiModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={selectedMonths.length === 0}>Pay Selected Months ({selectedMonths.length})</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
