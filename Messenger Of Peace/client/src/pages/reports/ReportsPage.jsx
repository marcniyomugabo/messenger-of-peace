import { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Spinner, Table, Badge } from 'react-bootstrap'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { FiUsers, FiCheckSquare, FiDollarSign, FiCalendar, FiFileText, FiDownload, FiImage } from 'react-icons/fi'
import api from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const COLORS = { primary: '#6B21A8', success: '#7C3AED', danger: '#581C87', warning: '#9333EA', info: '#6D28D9' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [membership, setMembership] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [finance, setFinance] = useState(null)
  const [events, setEvents] = useState(null)

  const reportTypes = [
    { id: 'overview', label: 'Overview Report', icon: <FiFileText />, desc: 'General overview of all group activities and statistics' },
    { id: 'membership', label: 'Membership Report', icon: <FiUsers />, desc: 'Member demographics, growth, and unit distribution' },
    { id: 'attendance', label: 'Attendance Report', icon: <FiCheckSquare />, desc: 'Attendance trends and individual member attendance rates' },
    { id: 'finance', label: 'Financial Report', icon: <FiDollarSign />, desc: 'Income, expenses, contributions, and balance summary' },
    { id: 'events', label: 'Events Report', icon: <FiCalendar />, desc: 'Events summary, participation, and impact metrics' },
  ]

  useEffect(() => { loadReport(selectedReport) }, [selectedReport])

  const loadReport = async (type) => {
    setLoading(true)
    try {
      if (type === 'overview' || type === 'membership') {
        const res = await api.get('/reports/membership')
        setMembership(res.data.data)
      }
      if (type === 'overview' || type === 'attendance') {
        const res = await api.get('/reports/attendance')
        setAttendance(res.data.data)
      }
      if (type === 'overview' || type === 'finance') {
        const res = await api.get('/reports/finance')
        setFinance(res.data.data)
      }
      if (type === 'overview' || type === 'events') {
        const res = await api.get('/reports/events')
        setEvents(res.data.data)
      }
    } catch {
      // Silently fail - show empty state
    } finally {
      setLoading(false)
    }
  }

  const membershipChart = membership ? {
    labels: membership.by_unit?.map(u => u.unit_name) || ['Abatoni', 'Inkesha', 'Abahizi', 'Ingenzi'],
    datasets: [{
      label: 'Active Members',
      data: membership.by_unit?.map(u => u.active_count) || [],
      backgroundColor: [COLORS.primary, COLORS.success, COLORS.danger],
      borderRadius: 8,
    }],
  } : null

  const memberDoughnut = membership?.totals ? {
    labels: ['Active', 'Inactive', 'Applicants', 'Alumni'],
    datasets: [{
      data: [
        membership.totals.active || 0,
        membership.totals.inactive || 0,
        membership.totals.applicants || 0,
        membership.totals.alumni || 0,
      ],
      backgroundColor: [COLORS.success, COLORS.warning, COLORS.info, '#6B7280'],
      borderWidth: 0,
    }],
  } : null

  const financeChart = finance?.contributions ? (() => {
    const monthlyData = new Array(12).fill(0)
    finance.contributions.forEach(c => {
      const m = parseInt(c.contribution_month)
      if (m >= 1 && m <= 12) monthlyData[m - 1] += parseFloat(c.total) || 0
    })
    return {
      labels: MONTHS,
      datasets: [{
        label: 'Contributions (RWF)',
        data: monthlyData,
        backgroundColor: COLORS.success,
        borderRadius: 6,
      }],
    }
  })() : null

  const txChart = finance?.transactions ? (() => {
    const monthlyIncome = new Array(12).fill(0)
    const monthlyExpense = new Array(12).fill(0)
    finance.transactions.forEach(t => {
      const d = new Date(t.created_at)
      const m = d.getMonth()
      if (t.type === 'Deposit' || t.type === 'Contribution') monthlyIncome[m] += parseFloat(t.amount) || 0
      else if (t.type === 'Withdrawal') monthlyExpense[m] += parseFloat(t.amount) || 0
    })
    return {
      labels: MONTHS,
      datasets: [
        { label: 'Income', data: monthlyIncome, backgroundColor: COLORS.success, borderRadius: 6 },
        { label: 'Expenses', data: monthlyExpense, backgroundColor: COLORS.danger, borderRadius: 6 },
      ],
    }
  })() : null

  const eventsChart = events?.summary ? (() => {
    const categories = {}
    events.summary.forEach(s => {
      if (!categories[s.category]) categories[s.category] = 0
      categories[s.category] += s.count
    })
    return {
      labels: Object.keys(categories),
      datasets: [{
        label: 'Events',
        data: Object.values(categories),
        backgroundColor: [COLORS.primary, COLORS.success, COLORS.danger, COLORS.warning, COLORS.info, '#6B7280'],
        borderWidth: 0,
      }],
    }
  })() : null

  const handleExport = (type, data) => {
    let content = `MOP Scout Group - ${type} Report\nGenerated: ${new Date().toLocaleDateString()}\n\n`
    if (type === 'membership' && membership) {
      content += `Total Members: ${membership.totals?.total || 0}\nActive: ${membership.totals?.active || 0}\n\nBy Unit:\n`
      membership.by_unit?.forEach(u => { content += `  ${u.unit_name}: ${u.active_count} active / ${u.total_count} total\n` })
    } else if (type === 'finance' && finance) {
      content += `Contributions: ${JSON.stringify(finance.contributions, null, 2)}\n\nTransactions: ${JSON.stringify(finance.transactions, null, 2)}`
    } else if (type === 'events' && events) {
      content += `Event Summary:\n${JSON.stringify(events.summary, null, 2)}\n\nTop Participation:\n${JSON.stringify(events.top_participation, null, 2)}`
    } else {
      content += 'Report data available via the dashboard.'
    }
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mop-${type}-report.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Reports</h4>
        {loading && <Spinner animation="border" size="sm" />}
      </div>

      <Row className="g-3 mb-4">
        {reportTypes.map((report) => (
          <Col lg={4} md={6} key={report.id}>
            <Card
              className="mop-card h-100"
              style={{
                cursor: 'pointer',
                border: selectedReport === report.id ? '2px solid #6B21A8' : '2px solid transparent',
              }}
              onClick={() => setSelectedReport(report.id)}
            >
              <Card.Body className="d-flex align-items-start gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 45, height: 45, background: '#F3E8FF', color: '#6B21A8', flexShrink: 0 }}>
                  {report.icon}
                </div>
                <div>
                  <h6 className="mb-1">{report.label}</h6>
                  <small className="text-muted">{report.desc}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {selectedReport === 'overview' && (
        <Row className="g-4">
          <Col lg={6}>
            <Card className="mop-card">
              <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white">Members by Unit</h6>
                <Button variant="outline-light" size="sm" onClick={() => handleExport('membership')}>
                  <FiDownload className="me-1" /> Export
                </Button>
              </Card.Header>
              <Card.Body>
                {membershipChart ? <Bar data={membershipChart} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <p className="text-muted">Loading...</p>}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            <Card className="mop-card">
              <Card.Header className="py-3">
                <h6 className="mb-0 text-white">Member Status</h6>
              </Card.Header>
              <Card.Body className="d-flex align-items-center justify-content-center">
                {memberDoughnut ? <Doughnut data={memberDoughnut} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /> : <p className="text-muted">Loading...</p>}
              </Card.Body>
            </Card>
          </Col>
          <Col md={12}>
            <Card className="mop-card">
              <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white">Financial Overview (RWF)</h6>
                <Button variant="outline-light" size="sm" onClick={() => handleExport('finance')}>
                  <FiDownload className="me-1" /> Export
                </Button>
              </Card.Header>
              <Card.Body>
                {txChart ? <Bar data={txChart} options={{ responsive: true }} /> : <p className="text-muted">Loading...</p>}
              </Card.Body>
            </Card>
          </Col>
          {membership?.totals && (
            <Col md={12}>
              <Card className="mop-card">
                <Card.Body>
                  <Row className="g-4 text-center">
                    <Col md={3}><div className="kpi-value">{membership.totals.total || 0}</div><div className="kpi-label">Total Members</div></Col>
                    <Col md={3}><div className="kpi-value" style={{ color: COLORS.success }}>{membership.totals.active || 0}</div><div className="kpi-label">Active</div></Col>
                    <Col md={3}><div className="kpi-value" style={{ color: COLORS.warning }}>{membership.totals.applicants || 0}</div><div className="kpi-label">Applicants</div></Col>
                    <Col md={3}><div className="kpi-value" style={{ color: '#6B7280' }}>{membership.totals.inactive || 0}</div><div className="kpi-label">Inactive</div></Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {selectedReport === 'membership' && (
        <Card className="mop-card">
          <Card.Header className="py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 text-white">Membership Report</h6>
            <Button variant="outline-light" size="sm" onClick={() => handleExport('membership')}>
              <FiDownload className="me-1" /> Export
            </Button>
          </Card.Header>
          <Card.Body>
            <Row className="g-4 text-center mb-4">
              <Col md={3}><div className="kpi-value">{membership?.totals?.total || 0}</div><div className="kpi-label">Total Members</div></Col>
              <Col md={3}><div className="kpi-value" style={{ color: COLORS.success }}>{membership?.totals?.active || 0}</div><div className="kpi-label">Active</div></Col>
              <Col md={3}><div className="kpi-value" style={{ color: COLORS.warning }}>{membership?.totals?.applicants || 0}</div><div className="kpi-label">Applicants</div></Col>
              <Col md={3}><div className="kpi-value" style={{ color: '#6B7280' }}>{membership?.totals?.inactive || 0}</div><div className="kpi-label">Inactive</div></Col>
            </Row>
            {membershipChart && <Bar data={membershipChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
            {membership?.by_unit && (
              <Row className="g-3 mt-3">
                {membership.by_unit.map(u => (
                  <Col md={4} key={u.id}>
                    <div className="text-center p-3 rounded" style={{ background: '#F9FAFB' }}>
                      <h5 style={{ color: COLORS.primary }}>{u.unit_name}</h5>
                      <div className="d-flex justify-content-center gap-3">
                        <span><strong>{u.active_count}</strong> active</span>
                        <span><strong>{u.total_count}</strong> total</span>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Card.Body>
        </Card>
      )}

      {selectedReport === 'attendance' && (
        <Card className="mop-card">
          <Card.Header className="py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 text-white">Attendance Report</h6>
            <Button variant="outline-light" size="sm" onClick={() => handleExport('attendance')}>
              <FiDownload className="me-1" /> Export
            </Button>
          </Card.Header>
          <Card.Body>
            {attendance?.top_attendees?.length > 0 ? (
              <Table className="mop-table mb-0">
                <thead>
                  <tr><th>Member</th><th>Unit</th><th>Sessions Present</th><th>Total Sessions</th><th>Rate</th></tr>
                </thead>
                <tbody>
                  {attendance.top_attendees.map((a, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{a.name}</td>
                      <td>{a.unit_name || 'N/A'}</td>
                      <td>{a.sessions_present}</td>
                      <td>{a.total_sessions}</td>
                      <td><Badge bg={a.total_sessions > 0 && (a.sessions_present / a.total_sessions) > 0.8 ? 'success' : 'warning'}>
                        {a.total_sessions > 0 ? Math.round((a.sessions_present / a.total_sessions) * 100) : 0}%
                      </Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted text-center py-4">No attendance data available</p>
            )}
            {attendance?.by_unit?.length > 0 && (
              <>
                <h6 className="mt-4 mb-3">Attendance by Unit</h6>
                <Row className="g-3">
                  {attendance.by_unit.map((u, i) => (
                    <Col md={4} key={i}>
                      <div className="text-center p-3 rounded" style={{ background: '#F9FAFB' }}>
                        <h6>{u.unit_name || 'All Units'}</h6>
                        <div className="text-muted small">{u.meeting_date}</div>
                        <div><strong>{u.count}</strong> {u.status}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {selectedReport === 'finance' && (
        <Card className="mop-card">
          <Card.Header className="py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 text-white">Financial Report</h6>
            <Button variant="outline-light" size="sm" onClick={() => handleExport('finance')}>
              <FiDownload className="me-1" /> Export
            </Button>
          </Card.Header>
          <Card.Body>
            {txChart && <Bar data={txChart} options={{ responsive: true }} />}
            {finance?.contributions?.length > 0 && (
              <>
                <h6 className="mt-4 mb-3">Contributions by Month</h6>
                <Table className="mop-table mb-0">
                  <thead>
                    <tr><th>Month</th><th>Status</th><th>Count</th><th>Total (RWF)</th></tr>
                  </thead>
                  <tbody>
                    {finance.contributions.map((c, i) => (
                      <tr key={i}>
                        <td>{MONTHS[parseInt(c.contribution_month) - 1] || c.contribution_month}</td>
                        <td><Badge bg={c.status === 'Paid' ? 'success' : 'warning'}>{c.status}</Badge></td>
                        <td>{c.count}</td>
                        <td className="fw-semibold">{parseFloat(c.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
            {finance?.transactions?.length > 0 && (
              <>
                <h6 className="mt-4 mb-3">Transactions Summary</h6>
                <Row className="g-3">
                  {finance.transactions.map((t, i) => (
                    <Col md={4} key={i}>
                      <div className="text-center p-3 rounded" style={{ background: '#F9FAFB' }}>
                        <h6 style={{ color: t.type === 'Withdrawal' ? COLORS.danger : COLORS.success }}>{t.type}</h6>
                        <div className="text-muted small">{t.status}</div>
                        <div><strong>{parseFloat(t.total).toLocaleString()}</strong> RWF</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {selectedReport === 'events' && (
        <Card className="mop-card">
          <Card.Header className="py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 text-white">Events Report</h6>
            <Button variant="outline-light" size="sm" onClick={() => handleExport('events')}>
              <FiDownload className="me-1" /> Export
            </Button>
          </Card.Header>
          <Card.Body>
            {eventsChart && (
              <Row className="g-4 mb-4">
                <Col md={6}>
                  <h6>Events by Category</h6>
                  <Doughnut data={eventsChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                </Col>
                <Col md={6}>
                  <h6>Category Breakdown</h6>
                  {events.summary?.map((s, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span>{s.category}</span>
                      <div>
                        <Badge bg="success" className="me-1">{s.status}: {s.count}</Badge>
                      </div>
                    </div>
                  ))}
                </Col>
              </Row>
            )}
            {events?.top_participation?.length > 0 && (
              <>
                <h6 className="mb-3">Top Events by Participation</h6>
                <Table className="mop-table mb-0">
                  <thead>
                    <tr><th>Event</th><th>Date</th><th>Registered</th></tr>
                  </thead>
                  <tbody>
                    {events.top_participation.map((e, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{e.title}</td>
                        <td>{e.start_date ? new Date(e.start_date).toLocaleDateString() : 'N/A'}</td>
                        <td><Badge bg="primary">{e.registered}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
