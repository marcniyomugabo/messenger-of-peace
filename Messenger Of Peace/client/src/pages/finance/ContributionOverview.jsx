import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Table, Badge, Row, Col, Form, InputGroup, Button } from 'react-bootstrap'
import { FiUsers, FiSearch, FiEye, FiAlertTriangle } from 'react-icons/fi'
import api from '../../services/api'

const filterOptions = [
  { value: '', label: 'All Members' },
  { value: 'paid_up', label: 'Paid Up to Date' },
  { value: 'has_unpaid', label: 'Has Unpaid Months' },
  { value: 'has_partial', label: 'Has Partial Payments' },
  { value: 'current_month_unpaid', label: 'Current Month Unpaid' },
  { value: 'has_outstanding', label: 'Members With Outstanding Balance' },
]

export default function ContributionOverview() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => { fetchData() }, [filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 500 })
      if (filter) params.append('filter', filter)
      if (search) params.append('search', search)
      const res = await api.get(`/contributions/overview?${params}`)
      setMembers(res.data.data?.members || [])
      setTotal(res.data.data?.total || 0)
    } catch { setMembers([]) }
    finally { setLoading(false) }
  }

  const handleSearch = () => fetchData()

  const statusBadge = (status) => {
    const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger', 'N/A': 'secondary' }
    return <Badge bg={map[status] || 'secondary'} className="fw-semibold">{status}</Badge>
  }

  const totalPaid = members.reduce((s, m) => s + m.total_paid, 0)
  const totalOutstanding = members.reduce((s, m) => s + m.outstanding, 0)
  const membersWithMissed = members.filter(m => m.unpaid_months > 0).length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0"><FiUsers className="me-2" /> Contribution Overview</h4>
          <small className="text-muted">Lifetime contribution status for all active members</small>
        </div>
      </div>

      <Row className="g-3 mb-4 align-items-end">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text><FiSearch /></InputGroup.Text>
            <Form.Control placeholder="Search member name, code..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select value={filter} onChange={e => setFilter(e.target.value)}>
            {filterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="primary" className="w-100" onClick={handleSearch}><FiSearch className="me-1" /> Search</Button>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <div className="kpi-card h-100" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value" style={{ color: '#6B21A8' }}>{total}</div>
            <div className="kpi-label">Total Members</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-success)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>RWF {totalPaid.toLocaleString()}</div>
            <div className="kpi-label">Total Paid</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-danger)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-danger)' }}>RWF {totalOutstanding.toLocaleString()}</div>
            <div className="kpi-label">Total Outstanding</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-danger)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-danger)' }}>{membersWithMissed}</div>
            <div className="kpi-label">Members With Missed Months</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Member</th>
                <th>Joined</th>
                <th>Months</th>
                <th>Paid</th>
                <th>Unpaid</th>
                <th>Partial</th>
                <th>Total Paid</th>
                <th>Outstanding</th>
                <th>Current Month</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m.member_id} style={m.outstanding > 0 ? { background: 'var(--mop-danger-bg)' } : {}}>
                  <td>{idx + 1}</td>
                  <td><code>{m.member_code}</code></td>
                  <td className="fw-semibold">{m.member_name}</td>
                  <td>{m.join_date}</td>
                  <td>{m.total_months}</td>
                  <td style={{ color: 'var(--mop-success)', fontWeight: 600 }}>{m.paid_months}</td>
                  <td style={{ color: m.unpaid_months > 0 ? 'var(--mop-danger)' : '#6b7280', fontWeight: 600 }}>{m.unpaid_months}</td>
                  <td style={{ color: m.partial_months > 0 ? 'var(--mop-warning)' : '#6b7280', fontWeight: 600 }}>{m.partial_months}</td>
                  <td className="fw-semibold">RWF {m.total_paid.toLocaleString()}</td>
                  <td style={{ color: m.outstanding > 0 ? 'var(--mop-danger)' : 'var(--mop-success)', fontWeight: 600 }}>RWF {m.outstanding.toLocaleString()}</td>
                  <td>{statusBadge(m.current_month_status)}</td>
                  <td>
                    <Link to={`/dashboard/member-contributions/${m.member_id}`} className="btn btn-outline-primary btn-sm" title="View Full History">
                      <FiEye />
                    </Link>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan="12" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No members found'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}
