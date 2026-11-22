import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Row, Col, Table, Badge, Spinner } from 'react-bootstrap'
import { FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiBook, FiShield, FiDollarSign, FiCheckSquare } from 'react-icons/fi'
import api from '../../services/api'
import { ageOn } from '../../utils/date'
import { RateBar } from '../../components/attendance/AttendanceBits'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtDate = (d) => (d ? new Date(String(d).slice(0, 10)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '–')
const money = (n) => `${Number(n || 0).toLocaleString('en-US')} RWF`

function Detail({ icon, label, value }) {
  return (
    <div className="d-flex gap-3 py-2 border-bottom">
      <span className="text-muted mt-1">{icon}</span>
      <div>
        <div className="small text-muted">{label}</div>
        <div className="fw-semibold">{value || <span className="text-muted fw-normal">Not given</span>}</div>
      </div>
    </div>
  )
}

// A member's own page: details, unit, family contacts, contributions and attendance.
export default function MyProfile() {
  const [profile, setProfile] = useState(null)
  const [money_, setMoney] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([api.get('/members/me'), api.get('/contributions/me'), api.get('/attendance/me')]).then(([p, c, a]) => {
      setProfile(p.status === 'fulfilled' ? p.value.data.data : null)
      setMoney(c.status === 'fulfilled' ? c.value.data.data : null)
      setAttendance(a.status === 'fulfilled' ? a.value.data.data?.stats : null)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-center py-5"><Spinner animation="border" size="sm" /></div>
  if (!profile) {
    return (
      <div>
        <h4 className="mb-4"><FiUser className="me-2" />My profile</h4>
        <div className="mop-card mop-card-static p-4 text-muted">This account isn't linked to a member of the group, so there is no member profile to show.</div>
      </div>
    )
  }

  const age = ageOn(profile.date_of_birth)
  const months = (money_?.history || []).slice(-12).reverse()

  return (
    <div>
      {/* Header */}
      <div className="mop-card mop-card-static p-4 mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
            style={{ width: 72, height: 72, fontSize: '1.6rem', background: 'linear-gradient(135deg, var(--mop-primary), var(--mop-secondary))' }}>
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          <div className="flex-grow-1">
            <h4 className="mb-1">{profile.first_name} {profile.last_name}</h4>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {profile.member_code && <code>{profile.member_code}</code>}
              {profile.unit_name && <Badge bg="primary">{profile.unit_name}{profile.unit_focus ? ` · ${profile.unit_focus}` : ''}</Badge>}
              {profile.leadership_position && <Badge bg="dark">{profile.leadership_position}</Badge>}
              <Badge bg={profile.status === 'Active' ? 'success' : 'secondary'}>{profile.status}</Badge>
            </div>
          </div>
          <div className="text-md-end small text-muted">Member since<br /><strong className="text-dark">{fmtDate(profile.join_date)}</strong></div>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <div className="mop-card mop-card-static p-4 h-100">
            <h6 className="mb-3"><FiUser className="me-2" />My details</h6>
            <Detail icon={<FiCalendar />} label="Date of birth" value={profile.date_of_birth ? `${fmtDate(profile.date_of_birth)}${age !== '' ? ` (${age} years)` : ''}` : ''} />
            <Detail icon={<FiUser />} label="Gender" value={profile.gender} />
            <Detail icon={<FiPhone />} label="Phone" value={profile.phone} />
            <Detail icon={<FiMail />} label="Email" value={profile.email} />
            <Detail icon={<FiMapPin />} label="Where I live" value={profile.location} />
            <Detail icon={<FiBook />} label="School" value={profile.school} />
            <p className="small text-muted mt-3 mb-0">Something wrong or out of date? Please tell the group secretary so it can be corrected.</p>
          </div>
        </Col>
        <Col lg={6}>
          <div className="mop-card mop-card-static p-4 h-100">
            <h6 className="mb-3"><FiShield className="me-2" />Parent, guardian and emergency contact</h6>
            {profile.guardians.length === 0 ? <p className="text-muted mb-0">No contacts on record.</p> : profile.guardians.map((g, i) => (
              <div key={i} className="py-2 border-bottom">
                <div className="fw-semibold">{g.guardian_name} {g.is_emergency ? <Badge bg="danger" className="ms-1">Emergency contact</Badge> : null}</div>
                <div className="small text-muted">{[g.relationship, g.phone].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
            <div className="mt-4">
              <h6 className="mb-2"><FiCheckSquare className="me-2" />Attendance</h6>
              {attendance ? (
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <RateBar rate={attendance.rate} width={140} />
                  <span className="small text-muted">{attendance.present + attendance.late} attended · {attendance.absent} missed · {attendance.excused} excused</span>
                  <Link to="/dashboard/my-attendance" className="small">See every register</Link>
                </div>
              ) : <p className="text-muted small mb-0">No attendance yet.</p>}
            </div>
          </div>
        </Col>
      </Row>

      {/* Contributions */}
      <div className="mop-card mop-card-static p-4">
        <h6 className="mb-3"><FiDollarSign className="me-2" />My contributions</h6>
        {!money_ ? <p className="text-muted mb-0">No contribution information.</p> : (
          <>
            <Row className="g-3 mb-3">
              <Col sm={4}><div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}><div className="kpi-value" style={{ color: 'var(--mop-success)', fontSize: '1.3rem' }}>{money(money_.total_paid)}</div><div className="kpi-label">Paid in total</div></div></Col>
              <Col sm={4}><div className="kpi-card" style={{ borderLeftColor: money_.outstanding > 0 ? 'var(--mop-danger)' : 'var(--mop-success)' }}><div className="kpi-value" style={{ color: money_.outstanding > 0 ? 'var(--mop-danger)' : 'var(--mop-success)', fontSize: '1.3rem' }}>{money(Math.max(0, money_.outstanding))}</div><div className="kpi-label">Still to pay</div></div></Col>
              <Col sm={4}><div className="kpi-card" style={{ borderLeftColor: 'var(--mop-primary)' }}><div className="kpi-value" style={{ fontSize: '1.3rem' }}>{money(profile.monthly_contribution || money_.member?.monthly_contribution)}</div><div className="kpi-label">Each month</div></div></Col>
            </Row>
            <div className="table-responsive">
              <Table className="mop-table mb-0 align-middle">
                <thead><tr><th>Month</th><th>Due</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {months.map(h => (
                    <tr key={`${h.year}-${h.month}`}>
                      <td className="fw-semibold">{MONTHS[h.month - 1]} {h.year}</td>
                      <td>{money(h.required_amount)}</td>
                      <td>{money(h.total_paid)}</td>
                      <td><Badge bg={h.status === 'Paid' ? 'success' : h.status === 'Partial' ? 'warning' : 'danger'} text={h.status === 'Partial' ? 'dark' : undefined}>{h.status}</Badge></td>
                    </tr>
                  ))}
                  {months.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-4">No months yet.</td></tr>}
                </tbody>
              </Table>
            </div>
            {(money_.history || []).length > 12 && <p className="small text-muted mt-2 mb-0">Showing the last 12 months.</p>}
          </>
        )}
      </div>
    </div>
  )
}
