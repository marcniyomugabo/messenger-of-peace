import { useState, useEffect } from 'react'
import { Row, Col, Table, Spinner, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { FiCheckSquare } from 'react-icons/fi'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { ATTENDANCE } from '../../config/roles'
import { formatDate, RATE_HELP } from '../../utils/attendance'
import { RateBar, MarkPill } from '../../components/attendance/AttendanceBits'

// A member's own attendance: rate, counts and every register they were expected at.
export default function MyAttendance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { hasRole } = useAuth()
  const canManage = hasRole(...ATTENDANCE)

  useEffect(() => {
    api.get('/attendance/me').then(res => setData(res.data.data)).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-5"><Spinner animation="border" size="sm" /></div>
  if (!data?.member) {
    return (
      <div>
        <h4 className="mb-4 d-flex align-items-center"><FiCheckSquare className="me-2" />My attendance</h4>
        <div className="mop-card mop-card-static p-4">
          <p className="text-muted mb-3">
            This account isn't a member of the group, so it has no attendance of its own.
            {canManage && ' The group\'s registers and every member\'s attendance are under Attendance.'}
          </p>
          {canManage && <Button as={Link} to="/dashboard/attendance" variant="primary" size="sm">Go to Attendance</Button>}
        </div>
      </div>
    )
  }

  const s = data.stats
  return (
    <div>
      <h4 className="mb-1 d-flex align-items-center"><FiCheckSquare className="me-2" />My attendance</h4>
      <p className="text-muted mb-4">{data.member.name}{data.member.unit_name ? ` · ${data.member.unit_name}` : ''}</p>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-primary)' }} title={RATE_HELP}>
            <div className="mb-1"><RateBar rate={s.rate} width={110} /></div>
            <div className="kpi-label">Attendance rate</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{s.present + s.late}</div>
            <div className="kpi-label">Attended{s.late ? ` (${s.late} late)` : ''}</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-danger)' }}>
            <div className="kpi-value" style={{ color: 'var(--mop-danger)' }}>{s.absent}</div>
            <div className="kpi-label">Missed</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#2563EB' }}>
            <div className="kpi-value" style={{ color: '#2563EB' }}>{s.excused}</div>
            <div className="kpi-label">Excused</div>
          </div>
        </Col>
      </Row>

      {s.needs_attention && (
        <div className="alert alert-warning">
          You have missed the last {s.missed_in_a_row} registers. We miss you! If something is keeping you away, please talk to your unit leader.
        </div>
      )}

      <div className="mop-card mop-card-static">
        <div className="table-responsive">
          <Table className="mop-table mb-0 align-middle">
            <thead><tr><th>Date</th><th>Register</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {data.sessions.map(r => (
                <tr key={r.id}>
                  <td className="text-nowrap fw-semibold">{formatDate(r.session_date)}</td>
                  <td>{r.title || r.session_type}<div className="small text-muted">{r.unit_name || 'Whole group'}{r.event_title ? ` · ${r.event_title}` : ''}</div></td>
                  <td><MarkPill status={r.status} /></td>
                  <td className="small text-muted">{r.reason || ''}</td>
                </tr>
              ))}
              {data.sessions.length === 0 && (
                <tr><td colSpan="4" className="text-center text-muted py-5">No registers have been taken since you joined.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}
