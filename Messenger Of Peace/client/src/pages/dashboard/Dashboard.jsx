import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Row, Col, Card, Badge } from 'react-bootstrap'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useAuth } from '../../context/AuthContext'
import {
  FiUsers, FiMail, FiUserPlus, FiClock, FiAlertCircle, FiCheckCircle, FiImage, FiBookOpen,
  FiInfo, FiAward, FiCheckSquare, FiShield, FiDollarSign, FiAlertTriangle, FiFileText, FiBell, FiActivity,
} from 'react-icons/fi'
import api from '../../services/api'
import { PEOPLE, CONTENT, ATTENDANCE, LEADERS, FINANCE, SAFEGUARDING } from '../../config/roles'
import { formatDate, startOfYear } from '../../utils/attendance'
import { today } from '../../utils/date'

ChartJS.register(ArcElement, Tooltip, Legend)

// A number that opens the page it is about. Only shown for pages this role can open.
function KpiCard({ label, value, icon, color, link, note }) {
  return (
    <Link to={link} className="text-decoration-none">
      <div className="kpi-card h-100" style={{ borderLeftColor: color }}>
        <div className="d-flex align-items-center gap-2 mb-2"><span style={{ color, fontSize: '1.2rem' }}>{icon}</span></div>
        <div className="kpi-value" style={{ color }}>{value ?? 0}</div>
        <div className="kpi-label">{label}</div>
        {note && <small className="text-muted" style={{ fontSize: '0.72rem' }}>{note}</small>}
      </div>
    </Link>
  )
}

const listOf = (res) => {
  const d = res?.data?.data ?? res?.data
  if (Array.isArray(d)) return d
  return d?.applications || d?.messages || d?.concerns || d?.members || d?.notifications || []
}
const sectionTitle = (text) => (
  <h6 className="text-muted mb-3" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{text}</h6>
)

export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const can = (group) => hasRole(...group)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [d, setD] = useState({})

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setError(null)
    // Only ask for what this role may see (same groups as the sidebar and the server).
    const ask = (group, path, params) => (group.includes(user?.role) ? api.get(path, { params }) : Promise.resolve(null))
    const keys = ['stats', 'members', 'messages', 'applications', 'concerns', 'sessions', 'summary', 'contributions',
      'galleryImages', 'albums', 'library', 'information', 'posts', 'activities', 'leadership']
    const results = await Promise.allSettled([
      ask(PEOPLE, '/dashboard'),
      ask(PEOPLE, '/members'),
      ask(PEOPLE, '/contact-messages'),
      ask(PEOPLE, '/member-applications'),
      ask(SAFEGUARDING, '/concerns'),
      ask(ATTENDANCE, '/attendance/sessions', { limit: 1 }),
      ask(ATTENDANCE, '/attendance/summary', { from: startOfYear(), to: today() }),
      ask(FINANCE, '/contributions/summary'),
      ask(CONTENT, '/gallery/images'),
      ask(CONTENT, '/gallery'),
      ask(CONTENT, '/library/admin', { limit: 200 }),
      ask(CONTENT, '/information'),
      ask(CONTENT, '/posts/admin'),
      ask(LEADERS, '/activities'),
      ask(LEADERS, '/leadership'),
    ])
    const r = Object.fromEntries(keys.map((k, i) => [k, results[i].status === 'fulfilled' ? results[i].value : null]))
    if (results.every(x => x.status === 'rejected')) setError('Failed to load dashboard data')

    const counts = r.stats?.data?.data?.members || {}
    const messages = listOf(r.messages)
    const applications = r.applications?.data?.data?.applications || []
    const concerns = listOf(r.concerns)
    const summary = r.summary?.data?.data?.members || []
    const activities = listOf(r.activities).filter(a => a.status === 'Published')
    setD({
      totalMembers: Number(counts.total) || 0,
      activeMembers: Number(counts.active) || 0,
      applicants: Number(counts.applicants) || 0,
      recentMembers: (r.members?.data?.data?.members || []).slice(0, 5),
      messages: messages.length,
      unread: messages.filter(m => m.status === 'Unread' || m.is_read === 0 || m.is_read === false).length,
      recentMessages: messages.slice(0, 5),
      pending: applications.filter(a => a.status === 'Pending'),
      approved: applications.filter(a => a.status === 'Approved').length,
      rejected: applications.filter(a => a.status === 'Rejected').length,
      openConcerns: concerns.filter(c => c.status !== 'Closed').length,
      urgentConcerns: concerns.filter(c => c.status !== 'Closed' && c.child_in_danger).length,
      lastRegister: r.sessions?.data?.data?.sessions?.[0] || null,
      registers: r.sessions?.data?.data?.total || 0,
      attention: summary.filter(m => m.needs_attention).length,
      contributions: r.contributions?.data?.data || null,
      galleryImages: listOf(r.galleryImages).length,
      albums: Number(r.albums?.data?.total) || listOf(r.albums).length,
      library: listOf(r.library).length,
      information: listOf(r.information).length,
      news: listOf(r.posts).length,
      activities: activities.length,
      upcoming: activities.filter(a => new Date(a.start_date) >= new Date()).sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).slice(0, 5),
      leaders: listOf(r.leadership).length,
    })
    setLoading(false)
  }, [user?.role])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} />
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <FiAlertCircle size={48} className="text-danger mb-3" />
          <h5>Unable to Load Dashboard</h5>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={fetchAllData}>Try Again</button>
        </div>
      </div>
    )
  }

  const people = can(PEOPLE), att = can(ATTENDANCE), fin = can(FINANCE), safe = can(SAFEGUARDING), content = can(CONTENT), leaders = can(LEADERS)
  const c = d.contributions
  const nothing = !people && !att && !fin && !safe && !content && !leaders

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Dashboard</h4>
          <p className="text-muted small mb-0">Welcome back, <strong>{user?.email}</strong></p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchAllData}><FiClock className="me-1" /> Refresh</button>
      </div>

      {nothing && (
        <Card className="mop-card mop-card-static mb-4">
          <Card.Body className="p-4">
            <h6 className="mb-2"><FiBell className="me-2" />Your notifications</h6>
            <p className="text-muted mb-3">Your role has no management pages yet. Messages for you arrive in Notifications, and you can change your password from the menu at the top right.</p>
            <Link to="/dashboard/notifications" className="btn btn-primary btn-sm">Open notifications</Link>
          </Card.Body>
        </Card>
      )}

      {/* What needs doing now, for this role */}
      {(people || att || fin || safe) && (
        <div className="mb-4">
          {sectionTitle('Needs attention')}
          <Row className="g-3">
            {people && (
              <Col xl={3} md={6}>
                <KpiCard label="Pending join requests" value={d.pending.length} icon={<FiUserPlus />} color={d.pending.length ? '#D97706' : '#10B981'} link="/dashboard/join-requests" />
              </Col>
            )}
            {people && (
              <Col xl={3} md={6}>
                <KpiCard label="Unread messages" value={d.unread} icon={<FiMail />} color={d.unread ? 'var(--mop-danger)' : '#10B981'} link="/dashboard/messages" note={`${d.messages} in total`} />
              </Col>
            )}
            {safe && (
              <Col xl={3} md={6}>
                <KpiCard label="Open concerns" value={d.openConcerns} icon={<FiShield />} color={d.urgentConcerns ? 'var(--mop-danger)' : d.openConcerns ? '#D97706' : '#10B981'} link="/dashboard/concerns"
                  note={d.urgentConcerns ? `${d.urgentConcerns} marked urgent` : null} />
              </Col>
            )}
            {att && (
              <Col xl={3} md={6}>
                <KpiCard label="Last register" value={d.lastRegister?.rate != null ? `${d.lastRegister.rate}%` : '–'} icon={<FiCheckSquare />} color="#14B8A6" link="/dashboard/attendance"
                  note={d.lastRegister ? `${formatDate(d.lastRegister.session_date)} · ${d.lastRegister.unit_name || 'Whole group'}` : 'No register yet'} />
              </Col>
            )}
            {att && (
              <Col xl={3} md={6}>
                <KpiCard label="Missed 3+ registers in a row" value={d.attention} icon={<FiAlertTriangle />} color={d.attention ? 'var(--mop-danger)' : '#10B981'} link="/dashboard/attendance?tab=members" />
              </Col>
            )}
            {fin && c && (
              <Col xl={3} md={6}>
                <KpiCard label={`Contributions, ${new Date(c.year, c.month - 1).toLocaleDateString('en-GB', { month: 'long' })}`} value={`${c.rate ?? 0}%`} icon={<FiDollarSign />}
                  color={(c.rate ?? 0) >= 80 ? '#10B981' : '#D97706'} link="/dashboard/contributions"
                  note={`${Number(c.collected || 0).toLocaleString()} of ${Number(c.expected || 0).toLocaleString()} RWF · ${c.unpaid || 0} unpaid`} />
              </Col>
            )}
            {fin && c && (
              <Col xl={3} md={6}>
                <KpiCard label="Members with missed months" value={c.members_with_missed || 0} icon={<FiAlertTriangle />} color={c.members_with_missed ? '#D97706' : '#10B981'}
                  link="/dashboard/contribution-overview" note={`${Number(c.outstanding || 0).toLocaleString()} RWF outstanding`} />
              </Col>
            )}
          </Row>
        </div>
      )}

      {/* Members */}
      {people && (
        <>
          <div className="mb-4">
            {sectionTitle('Members')}
            <Row className="g-3">
              <Col xl={3} md={6}><KpiCard label="Total members" value={d.totalMembers} icon={<FiUsers />} color="#7C3AED" link="/dashboard/members" /></Col>
              <Col xl={3} md={6}><KpiCard label="Active members" value={d.activeMembers} icon={<FiCheckCircle />} color="#10B981" link="/dashboard/members" /></Col>
              <Col xl={3} md={6}><KpiCard label="Approved join requests" value={d.approved} icon={<FiCheckCircle />} color="#7C3AED" link="/dashboard/join-requests" /></Col>
              <Col xl={3} md={6}><KpiCard label="Rejected join requests" value={d.rejected} icon={<FiUserPlus />} color="#6B7280" link="/dashboard/join-requests" /></Col>
            </Row>
          </div>

          <Row className="g-4 mb-4">
            <Col lg={6}>
              <Card className="mop-card mop-card-static h-100">
                <Card.Header className="py-3"><h6 className="mb-0 text-white">Members overview</h6></Card.Header>
                <Card.Body className="d-flex align-items-center justify-content-center">
                  {d.activeMembers + d.applicants > 0 ? (
                    <div style={{ maxWidth: 260, width: '100%' }}>
                      <Doughnut data={{ labels: ['Active', 'Applicants'], datasets: [{ data: [d.activeMembers, d.applicants], backgroundColor: ['#7C3AED', '#F59E0B'], borderWidth: 0 }] }}
                        options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                  ) : <p className="text-muted small mb-0">No members yet</p>}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="mop-card mop-card-static h-100">
                <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-white">Pending join requests</h6>
                  <Link to="/dashboard/join-requests" className="btn btn-sm btn-light">View all</Link>
                </Card.Header>
                <Card.Body className="p-0">
                  {d.pending.length > 0 ? d.pending.slice(0, 5).map(a => (
                    <div key={a.id} className="d-flex align-items-center gap-2 p-3 border-bottom">
                      <div className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                        {a.first_name?.[0]}{a.second_name?.[0]}
                      </div>
                      <div className="flex-grow-1">
                        <p className="small mb-0 fw-semibold">{a.first_name} {a.second_name}</p>
                        <small className="text-muted">{a.unit ? a.unit.charAt(0).toUpperCase() + a.unit.slice(1) : 'Any unit'} · {a.application_code}</small>
                      </div>
                      <span className="badge bg-warning text-dark">Pending</span>
                    </div>
                  )) : <p className="text-center text-muted py-4 small mb-0">No pending requests</p>}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col lg={5}>
              <Card className="mop-card mop-card-static h-100">
                <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-white">Recent messages</h6>
                  <Link to="/dashboard/messages" className="btn btn-sm btn-light">View all</Link>
                </Card.Header>
                <Card.Body className="p-0">
                  {d.recentMessages.length > 0 ? d.recentMessages.map(m => {
                    const unread = m.status === 'Unread' || m.is_read === 0
                    return (
                      <div key={m.id} className="d-flex align-items-center gap-2 p-3 border-bottom">
                        <div className="rounded-circle text-white d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, flexShrink: 0, background: unread ? 'var(--mop-danger)' : '#7C3AED' }}><FiMail size={14} /></div>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <p className="small mb-0 fw-semibold">{m.name || 'Unknown'}</p>
                          <small className="text-muted text-truncate d-block">{m.subject || m.message}</small>
                        </div>
                        <span className={`badge ${unread ? 'bg-danger' : 'bg-success'}`}>{unread ? 'New' : 'Read'}</span>
                      </div>
                    )
                  }) : <p className="text-center text-muted py-4 small mb-0">No messages yet</p>}
                </Card.Body>
              </Card>
            </Col>
            <Col lg={7}>
              <Card className="mop-card mop-card-static h-100">
                <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-white">Recent members</h6>
                  <Link to="/dashboard/members" className="btn btn-sm btn-light">View all</Link>
                </Card.Header>
                <Card.Body className="p-0">
                  {d.recentMembers.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead><tr><th className="px-3">Name</th><th>Code</th><th>Unit</th><th>Status</th></tr></thead>
                        <tbody>
                          {d.recentMembers.map(m => (
                            <tr key={m.id}>
                              <td className="px-3"><Link to={`/dashboard/members/${m.id}`} className="fw-semibold text-decoration-none">{m.first_name} {m.last_name}</Link></td>
                              <td><code>{m.member_code}</code></td>
                              <td>{m.unit_name || '-'}</td>
                              <td><Badge bg={m.status === 'Active' ? 'success' : 'secondary'}>{m.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-center text-muted py-4 small mb-0">No members yet</p>}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Website content this role manages */}
      {(content || leaders) && (
        <div className="mb-4">
          {sectionTitle('Website content')}
          <Row className="g-3">
            {content && <Col xl={2} md={4} sm={6}><KpiCard label="Gallery photos" value={d.galleryImages} icon={<FiImage />} color="#EC4899" link="/dashboard/gallery" note={`${d.albums} album(s)`} /></Col>}
            {content && <Col xl={2} md={4} sm={6}><KpiCard label="Library" value={d.library} icon={<FiBookOpen />} color="#3B82F6" link="/dashboard/library" note="resources" /></Col>}
            {content && <Col xl={2} md={4} sm={6}><KpiCard label="Information" value={d.information} icon={<FiInfo />} color="#10B981" link="/dashboard/information" note="documents" /></Col>}
            {content && <Col xl={2} md={4} sm={6}><KpiCard label="News" value={d.news} icon={<FiFileText />} color="#D97706" link="/dashboard/news" note="stories" /></Col>}
            {leaders && <Col xl={2} md={4} sm={6}><KpiCard label="Activities" value={d.activities} icon={<FiActivity />} color="#9333EA" link="/dashboard/activities" note="published" /></Col>}
            {leaders && <Col xl={2} md={4} sm={6}><KpiCard label="Board members" value={d.leaders} icon={<FiAward />} color="#8B5CF6" link="/dashboard/board-members" note="leaders" /></Col>}
          </Row>
        </div>
      )}

      {leaders && (
        <Row className="g-4 mb-4">
          <Col lg={6}>
            <Card className="mop-card mop-card-static h-100">
              <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white">Upcoming activities</h6>
                <Link to="/dashboard/activities" className="btn btn-sm btn-light">View all</Link>
              </Card.Header>
              <Card.Body className="p-0">
                {d.upcoming.length > 0 ? d.upcoming.map(a => (
                  <div key={a.id} className="d-flex align-items-start gap-2 p-3 border-bottom">
                    <div className="rounded bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 36, fontSize: '0.7rem' }}>
                      {a.start_date ? new Date(a.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'TBD'}
                    </div>
                    <div>
                      <p className="small mb-0 fw-semibold">{a.title}</p>
                      <small className="text-muted">{a.location || 'Place to be confirmed'}</small>
                    </div>
                  </div>
                )) : <p className="text-center text-muted py-4 small mb-0">No upcoming activities</p>}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
