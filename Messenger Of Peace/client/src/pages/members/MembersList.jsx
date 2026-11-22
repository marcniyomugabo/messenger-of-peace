import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Table, Form, Badge, Button, Row, Col, InputGroup, Modal } from 'react-bootstrap'
import { FiSearch, FiEye, FiTrash2, FiUserPlus, FiRefreshCw, FiDollarSign, FiCreditCard, FiAlertTriangle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { today } from '../../utils/date'
import { startOfYear, RATE_HELP } from '../../utils/attendance'
import { RateBar } from '../../components/attendance/AttendanceBits'
import { useAuth } from '../../context/AuthContext'
import { FINANCE, LEADERS } from '../../config/roles'

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MembersList() {
  // Same rules as the server: payments are recorded by finance roles, members deactivated by leaders.
  const { hasRole } = useAuth()
  const canRecordPayment = hasRole(...FINANCE)
  const canDeactivate = hasRole(...LEADERS)
  const [members, setMembers] = useState([])
  const [units, setUnits] = useState([])
  const [contributions, setContributions] = useState([])
  const [search, setSearch] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payMember, setPayMember] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', month: '', year: '', method: 'Cash', date: '', notes: '' })

  const now = new Date()

  // Attendance rate this year and the missed-in-a-row flag, by member id.
  const [attendance, setAttendance] = useState({})

  useEffect(() => {
    fetchMembers()
    fetchUnits()
    fetchContributions()
    api.get('/attendance/summary', { params: { from: startOfYear(), to: today() } })
      .then(res => setAttendance(Object.fromEntries((res.data.data.members || []).map(m => [m.member_id, m]))))
      .catch(() => setAttendance({}))
  }, [])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: 200 })
      if (filterUnit) params.append('unit_id', filterUnit)
      if (filterStatus) params.append('status', filterStatus)
      if (search) params.append('search', search)
      const res = await api.get(`/members/admin?${params}`)
      setMembers(res.data.data?.members || [])
      setTotal(res.data.data?.total || 0)
    } catch (err) {
      console.error('Failed to fetch members:', err)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      const res = await api.get('/units')
      setUnits(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch units:', err)
    }
  }

  const fetchContributions = async () => {
    try {
      const res = await api.get(`/contributions?month=${now.getMonth() + 1}&year=${now.getFullYear()}&limit=500`)
      setContributions(res.data.data?.contributions || [])
    } catch {
      setContributions([])
    }
  }

  const getMemberContribution = (memberId) => {
    return contributions.find(c => c.member_id === memberId)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this member?')) return
    try {
      await api.delete(`/members/${id}`)
      setMembers(members.filter(m => m.id !== id))
      toast.success('Member deactivated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete member')
    }
  }

  const openEditUmusanzwe = (member) => {
    setEditMember(member)
    setMonthlyAmount(member.monthly_contribution || '')
    setShowEditModal(true)
  }

  const handleSaveUmusanzwe = async () => {
    if (!editMember || !monthlyAmount) return
    setSaving(true)
    try {
      await api.put(`/members/${editMember.id}`, {
        monthly_contribution: parseFloat(monthlyAmount)
      })
      setMembers(members.map(m => m.id === editMember.id ? { ...m, monthly_contribution: parseFloat(monthlyAmount) } : m))
      toast.success(`Umusanzwe updated to RWF ${parseFloat(monthlyAmount).toLocaleString()}`)
      setShowEditModal(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const openPayModal = (member) => {
    const contrib = getMemberContribution(member.id)
    const required = member.monthly_contribution || 500
    const paid = contrib?.total_paid || 0
    const balance = required - paid
    setPayMember(member)
    setPayForm({
      amount: balance > 0 ? String(balance) : String(required),
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      method: 'Cash',
      date: today(),
      notes: ''
    })
    setShowPayModal(true)
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    if (!payMember || !payForm.amount) return
    try {
      await api.post('/contributions/payments', {
        member_id: payMember.id,
        contribution_month: parseInt(payForm.month),
        contribution_year: parseInt(payForm.year),
        amount: parseFloat(payForm.amount),
        payment_method: payForm.method,
        payment_date: payForm.date,
        notes: payForm.notes || undefined,
      })
      toast.success(`Payment recorded for ${payMember.first_name} ${payMember.last_name}`)
      setShowPayModal(false)
      fetchContributions()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    }
  }

  const filtered = members.filter(m => {
    const matchSearch = !search || `${m.first_name} ${m.last_name} ${m.member_code || ''} ${m.email || ''} ${m.phone || ''}`.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const statusBadge = (status) => {
    const map = { Active: 'success', Inactive: 'secondary', Applicant: 'warning', Suspended: 'danger', Alumni: 'info' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  const contribBadge = (contrib) => {
    if (!contrib) return <Badge bg="danger">Unpaid</Badge>
    const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger' }
    return <Badge bg={map[contrib.status] || 'secondary'}>{contrib.status} — {Number(contrib.total_paid).toLocaleString()} RWF</Badge>
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">Members Management</h4>
          <small className="text-muted">{total} total members</small>
        </div>
        <Button as={Link} to="/dashboard/members/new" variant="primary">
          <FiUserPlus className="me-1" /> Add Member
        </Button>
      </div>

      <div className="mop-card mb-4">
        <div className="card-body">
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text><FiSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Search by name, code, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                <option value="">All Units</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.member_count || 0})</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Applicant">Applicant</option>
                <option value="Suspended">Suspended</option>
                <option value="Alumni">Alumni</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="primary" className="w-100" onClick={() => { fetchMembers(); fetchContributions(); }}>
                <FiRefreshCw className="me-1" /> Search
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Unit</th>
                <th>Contribution</th>
                <th title={`Attendance this year. ${RATE_HELP}`}>Attendance</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member, idx) => {
                const contrib = getMemberContribution(member.id)
                return (
                  <tr key={member.id}>
                    <td>{idx + 1}</td>
                    <td><code>{member.member_code || '-'}</code></td>
                    <td className="fw-semibold">{member.first_name} {member.last_name}</td>
                    <td>{member.phone || '-'}</td>
                    <td><Badge bg="primary">{member.unit_name || 'Unassigned'}</Badge></td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        {contribBadge(contrib)}
                        {canRecordPayment && (
                          <Button variant="outline-success" size="sm" onClick={() => openPayModal(member)} title="Record Payment">
                            <FiCreditCard />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td>
                      {attendance[member.id] ? (
                        <div className="d-flex align-items-center gap-1">
                          <RateBar rate={attendance[member.id].rate} width={50} />
                          {attendance[member.id].needs_attention && (
                            <FiAlertTriangle className="text-danger" title={`Missed the last ${attendance[member.id].missed_in_a_row} registers`} />
                          )}
                        </div>
                      ) : <span className="text-muted small">–</span>}
                    </td>
                    <td>{statusBadge(member.status)}</td>
                    <td>{member.join_date || '-'}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button as={Link} to={`/dashboard/members/${member.id}`} variant="outline-primary" size="sm" title="View">
                          <FiEye />
                        </Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => openEditUmusanzwe(member)} title="Set Umusanzwe">
                          <FiDollarSign />
                        </Button>
                        {canDeactivate && (
                          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(member.id)} title="Deactivate">
                            <FiTrash2 />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center py-4 text-muted">
                    {loading ? 'Loading...' : 'No members found'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Set Umusanzwe - {editMember?.first_name} {editMember?.last_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Set the monthly contribution (umusanzwe) amount for this member.</p>
          <Form.Group>
            <Form.Label>Monthly Contribution (RWF) *</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="e.g. 500"
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveUmusanzwe} disabled={saving || !monthlyAmount}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Record Payment Modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FiCreditCard className="me-2" /> Record Payment — {payMember?.first_name} {payMember?.last_name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRecordPayment}>
          <Modal.Body>
            <p className="text-muted mb-3">Record umusanzwe payment for this member.</p>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Month *</Form.Label>
                  <Form.Select value={payForm.month} onChange={e => setPayForm({ ...payForm, month: e.target.value })} required>
                    {monthNames.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Year *</Form.Label>
                  <Form.Select value={payForm.year} onChange={e => setPayForm({ ...payForm, year: e.target.value })} required>
                    {[2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Amount (RWF) *</Form.Label>
              <Form.Control type="number" min="1" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Method</Form.Label>
                  <Form.Select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                    <option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Date</Form.Label>
                  <Form.Control type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Optional" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button type="submit" variant="success">Record Payment</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
