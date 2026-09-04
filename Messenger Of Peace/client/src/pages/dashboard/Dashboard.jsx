import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Badge } from 'react-bootstrap'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useAuth } from '../../context/AuthContext'
import {
  FiUsers, FiMail, FiActivity, FiUserPlus, FiClock,
  FiArrowUpRight, FiAlertCircle, FiCalendar, FiCheckCircle,
  FiImage, FiBookOpen, FiInfo, FiAward, FiFileText, FiCheckSquare
} from 'react-icons/fi'
import api from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

function KpiCard({ label, value, icon, color, link }) {
  return (
    <a href={link} className="text-decoration-none">
      <div className="kpi-card h-100" style={{ borderLeftColor: color, cursor: link ? 'pointer' : 'default' }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <span style={{ color, fontSize: '1.2rem' }}>{icon}</span>
        </div>
        <div className="kpi-value" style={{ color }}>{value ?? 0}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </a>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [totalMembers, setTotalMembers] = useState(0)
  const [activeMembers, setActiveMembers] = useState(0)
  const [pendingMembers, setPendingMembers] = useState(0)

  const [totalMessages, setTotalMessages] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const [totalActivities, setTotalActivities] = useState(0)
  const [upcomingActivities, setUpcomingActivities] = useState([])

  const [totalApplications, setTotalApplications] = useState(0)
  const [pendingApplications, setPendingApplications] = useState([])
  const [approvedCount, setApprovedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)

  const [recentMembers, setRecentMembers] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [recentActivities, setRecentActivities] = useState([])

  const [galleryImages, setGalleryImages] = useState(0)
  const [galleryAlbums, setGalleryAlbums] = useState(0)
  const [libraryCount, setLibraryCount] = useState(0)
  const [infoCount, setInfoCount] = useState(0)
  const [leadershipCount, setLeadershipCount] = useState(0)
  const [attendanceCount, setAttendanceCount] = useState(0)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [membersRes, messagesRes, activitiesRes, applicationsRes, galleryRes, libraryRes, infoRes, leadershipRes, attendanceRes] = await Promise.allSettled([
        api.get('/members'),
        api.get('/contact-messages'),
        api.get('/activities'),
        api.get('/applications'),
        api.get('/gallery/images'),
        api.get('/library'),
        api.get('/information'),
        api.get('/leadership'),
        api.get('/attendance'),
      ])

      if (membersRes.status === 'fulfilled') {
        const data = membersRes.value.data.data || membersRes.value.data || []
        const list = Array.isArray(data) ? data : []
        setTotalMembers(list.length)
        setActiveMembers(list.filter(m => m.status === 'Active').length)
        setPendingMembers(list.filter(m => m.status === 'Applicant').length)
        setRecentMembers(list.filter(m => m.status === 'Active').slice(0, 5))
      }

      if (messagesRes.status === 'fulfilled') {
        const data = messagesRes.value.data.data || messagesRes.value.data.messages || []
        const list = Array.isArray(data) ? data : []
        setTotalMessages(list.length)
        const unread = list.filter(m => m.status === 'Unread' || m.is_read === 0 || m.is_read === false).length
        setUnreadMessages(unread)
        setRecentMessages(list.slice(0, 5))
      }

      if (activitiesRes.status === 'fulfilled') {
        const data = activitiesRes.value.data.data || activitiesRes.value.data || []
        const list = Array.isArray(data) ? data : []
        const published = list.filter(a => a.status === 'Published')
        setTotalActivities(published.length)
        const upcoming = published.filter(a => new Date(a.start_date) >= new Date()).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        setUpcomingActivities(upcoming.slice(0, 5))
        setRecentActivities(published.slice(0, 5))
      }

      if (applicationsRes.status === 'fulfilled') {
        const data = applicationsRes.value.data.data || applicationsRes.value.data.applications || []
        const list = Array.isArray(data) ? data : []
        setTotalApplications(list.length)
        const pending = list.filter(a => a.status === 'Pending')
        setPendingApplications(pending.slice(0, 5))
        setApprovedCount(list.filter(a => a.status === 'Approved').length)
        setRejectedCount(list.filter(a => a.status === 'Rejected').length)
      }

      if (galleryRes.status === 'fulfilled') {
        const data = galleryRes.value.data.data || galleryRes.value.data || []
        const list = Array.isArray(data) ? data : []
        setGalleryImages(list.length)
      }
      if (libraryRes.status === 'fulfilled') {
        const data = libraryRes.value.data.data || libraryRes.value.data || []
        const list = Array.isArray(data) ? data : []
        setLibraryCount(list.length)
      }
      if (infoRes.status === 'fulfilled') {
        const data = infoRes.value.data.data || infoRes.value.data || []
        const list = Array.isArray(data) ? data : []
        setInfoCount(list.length)
      }
      if (leadershipRes.status === 'fulfilled') {
        const data = leadershipRes.value.data.data || leadershipRes.value.data || []
        const list = Array.isArray(data) ? data : []
        setLeadershipCount(Array.isArray(list) ? list.length : 0)
      }
      if (attendanceRes.status === 'fulfilled') {
        const data = attendanceRes.value.data.data || attendanceRes.value.data || []
        const list = Array.isArray(data) ? data : []
        setAttendanceCount(list.length)
      }
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

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

  const memberStatusData = {
    labels: ['Active', 'Applicants'],
    datasets: [{
      data: [activeMembers, pendingMembers],
      backgroundColor: ['#7C3AED', '#F59E0B'],
      borderWidth: 0,
    }],
  }

  const applicationStatusData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{
      data: [totalApplications - approvedCount - rejectedCount, approvedCount, rejectedCount],
      backgroundColor: ['#F59E0B', '#10B981', '#EF4444'],
      borderWidth: 0,
    }],
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Dashboard</h4>
          <p className="text-muted small mb-0">
            Welcome back, <strong>{user?.email}</strong>
          </p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchAllData}>
          <FiClock className="me-1" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xl={3} md={6}>
          <KpiCard
            label="Total Messages"
            value={totalMessages}
            icon={<FiMail />}
            color="#6B21A8"
            link="/dashboard/messages"
          />
        </Col>
        <Col xl={3} md={6}>
          <KpiCard
            label="Unread Messages"
            value={unreadMessages}
            icon={<FiMail />}
            color={unreadMessages > 0 ? '#DC2626' : '#10B981'}
            link="/dashboard/messages"
          />
        </Col>
        <Col xl={3} md={6}>
          <KpiCard
            label="Total Members"
            value={totalMembers}
            icon={<FiUsers />}
            color="#7C3AED"
            link="/dashboard/members"
          />
        </Col>
        <Col xl={3} md={6}>
          <KpiCard
            label="Activities"
            value={totalActivities}
            icon={<FiActivity />}
            color="#9333EA"
            link="/dashboard/activities"
          />
        </Col>
      </Row>

      {/* CMS Content Overview */}
      <div className="mb-4">
        <h6 className="text-muted mb-3" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Content Management
        </h6>
        <Row className="g-3">
          <Col xl={2} md={4} sm={6}>
            <a href="/dashboard/gallery" className="text-decoration-none">
              <div className="kpi-card h-100 text-center" style={{ borderLeftColor: '#EC4899' }}>
                <FiImage size={24} className="mb-2" style={{ color: '#EC4899' }} />
                <div className="kpi-value" style={{ color: '#EC4899', fontSize: '1.5rem' }}>{galleryImages}</div>
                <div className="kpi-label">Gallery</div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>{galleryAlbums} albums</small>
              </div>
            </a>
          </Col>
          <Col xl={2} md={4} sm={6}>
            <a href="/dashboard/library" className="text-decoration-none">
              <div className="kpi-card h-100 text-center" style={{ borderLeftColor: '#3B82F6' }}>
                <FiBookOpen size={24} className="mb-2" style={{ color: '#3B82F6' }} />
                <div className="kpi-value" style={{ color: '#3B82F6', fontSize: '1.5rem' }}>{libraryCount}</div>
                <div className="kpi-label">Library</div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>resources</small>
              </div>
            </a>
          </Col>
          <Col xl={2} md={4} sm={6}>
            <a href="/dashboard/information" className="text-decoration-none">
              <div className="kpi-card h-100 text-center" style={{ borderLeftColor: '#10B981' }}>
                <FiInfo size={24} className="mb-2" style={{ color: '#10B981' }} />
                <div className="kpi-value" style={{ color: '#10B981', fontSize: '1.5rem' }}>{infoCount}</div>
                <div className="kpi-label">Information</div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>documents</small>
              </div>
            </a>
          </Col>
          <Col xl={2} md={4} sm={6}>
            <a href="/dashboard/activities" className="text-decoration-none">
              <div className="kpi-card h-100 text-center" style={{ borderLeftColor: '#F59E0B' }}>
                <FiAward size={24} className="mb-2" style={{ color: '#F59E0B' }} />
                <div className="kpi-value" style={{ color: '#F59E0B', fontSize: '1.5rem' }}>{totalActivities}</div>
                <div className="kpi-label">Activities</div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>published</small>
              </div>
            </a>
          </Col>
          <Col xl={2} md={4} sm={6}>
            <a href="/dashboard/leadership" className="text-decoration-none">
              <div className="kpi-card h-100 text-center" style={{ borderLeftColor: '#8B5CF6' }}>
                <FiUsers size={24} className="mb-2" style={{ color: '#8B5CF6' }} />
                <div className="kpi-value" style={{ color: '#8B5CF6', fontSize: '1.5rem' }}>{leadershipCount}</div>
                <div className="kpi-label">Board Members</div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>leaders</small>
              </div>
            </a>
          </Col>
          <Col xl={2} md={4} sm={6}>
            <a href="/dashboard/attendance" className="text-decoration-none">
              <div className="kpi-card h-100 text-center" style={{ borderLeftColor: '#14B8A6' }}>
                <FiCheckSquare size={24} className="mb-2" style={{ color: '#14B8A6' }} />
                <div className="kpi-value" style={{ color: '#14B8A6', fontSize: '1.5rem' }}>{attendanceCount}</div>
                <div className="kpi-label">Attendance</div>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>records</small>
              </div>
            </a>
          </Col>
        </Row>
      </div>

      {/* Secondary Stats */}
      <Row className="g-3 mb-4">
        <Col xl={3} md={6}>
          <KpiCard
            label="Pending Join Requests"
            value={totalApplications - approvedCount - rejectedCount}
            icon={<FiUserPlus />}
            color="#F59E0B"
            link="/dashboard/join-requests"
          />
        </Col>
        <Col xl={3} md={6}>
          <KpiCard
            label="Active Members"
            value={activeMembers}
            icon={<FiCheckCircle />}
            color="#10B981"
            link="/dashboard/members"
          />
        </Col>
        <Col xl={3} md={6}>
          <KpiCard
            label="Approved Requests"
            value={approvedCount}
            icon={<FiCheckCircle />}
            color="#7C3AED"
            link="/dashboard/join-requests"
          />
        </Col>
        <Col xl={3} md={6}>
          <KpiCard
            label="Library Resources"
            value={recentActivities.length}
            icon={<FiActivity />}
            color="#8B5CF6"
            link="/dashboard/library"
          />
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="mop-card h-100">
            <Card.Header className="py-3">
              <h6 className="mb-0 text-white">Members Overview</h6>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <Doughnut data={memberStatusData} options={{
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { padding: 16 } } }
              }} />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="mop-card h-100">
            <Card.Header className="py-3">
              <h6 className="mb-0 text-white">Join Requests Status</h6>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <Doughnut data={applicationStatusData} options={{
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { padding: 16 } } }
              }} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Data Tables */}
      <Row className="g-4 mb-4">
        {/* Recent Messages */}
        <Col lg={4}>
          <Card className="mop-card">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white">Recent Messages</h6>
              <a href="/dashboard/messages" className="btn btn-sm btn-light">View All</a>
            </Card.Header>
            <Card.Body className="p-0">
              {recentMessages.length > 0 ? recentMessages.map((m, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 p-3 border-bottom">
                  <div className="rounded-circle text-white d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0, background: (m.status === 'Unread' || m.is_read === 0) ? '#DC2626' : '#7C3AED' }}>
                    <FiMail size={14} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="small mb-0 fw-semibold">{m.name || 'Unknown'}</p>
                    <small className="text-muted text-truncate d-block" style={{ maxWidth: 180 }}>{m.subject || m.message}</small>
                  </div>
                  <span className={`badge ${(m.status === 'Unread' || m.is_read === 0) ? 'bg-danger' : 'bg-success'}`}>
                    {(m.status === 'Unread' || m.is_read === 0) ? 'New' : 'Read'}
                  </span>
                </div>
              )) : (
                <p className="text-center text-muted py-3 small">No messages yet</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Upcoming Activities */}
        <Col lg={4}>
          <Card className="mop-card">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white">Upcoming Activities</h6>
              <a href="/dashboard/activities" className="btn btn-sm btn-light">View All</a>
            </Card.Header>
            <Card.Body className="p-0">
              {upcomingActivities.length > 0 ? upcomingActivities.map((a, idx) => (
                <div key={idx} className="d-flex align-items-start gap-2 p-3 border-bottom">
                  <div className="rounded bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36, fontSize: '0.7rem' }}>
                    {a.start_date ? new Date(a.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'TBD'}
                  </div>
                  <div>
                    <p className="small mb-0 fw-semibold">{a.title}</p>
                    <small className="text-muted">{a.location || 'TBD'}</small>
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted py-3 small">No upcoming activities</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Pending Join Requests */}
        <Col lg={4}>
          <Card className="mop-card">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white">Pending Join Requests</h6>
              <a href="/dashboard/join-requests" className="btn btn-sm btn-light">View All</a>
            </Card.Header>
            <Card.Body className="p-0">
              {pendingApplications.length > 0 ? pendingApplications.map((a, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 p-3 border-bottom">
                  <div className="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, fontSize: '0.8rem', flexShrink: 0 }}>
                    {a.first_name?.[0]}{a.last_name?.[0]}
                  </div>
                  <div className="flex-grow-1">
                    <p className="small mb-0 fw-semibold">{a.first_name} {a.last_name}</p>
                    <small className="text-muted">{a.unit_preference || 'Any unit'}</small>
                  </div>
                  <span className="badge bg-warning">Pending</span>
                </div>
              )) : (
                <p className="text-center text-muted py-3 small">No pending requests</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Members */}
      <Row className="g-4 mb-4">
        <Col lg={12}>
          <Card className="mop-card">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white">Recent Members</h6>
              <a href="/dashboard/members" className="btn btn-sm btn-light">View All</a>
            </Card.Header>
            <Card.Body className="p-0">
              {recentMembers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th className="px-3">Name</th>
                        <th>Member Code</th>
                        <th>Unit</th>
                        <th>Status</th>
                        <th>Join Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMembers.map((m, idx) => (
                        <tr key={idx}>
                          <td className="px-3">
                            <div className="d-flex align-items-center gap-2">
                              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                                {m.first_name?.[0]}{m.last_name?.[0]}
                              </div>
                              <span className="fw-semibold">{m.first_name} {m.last_name}</span>
                            </div>
                          </td>
                          <td><code>{m.member_code}</code></td>
                          <td>{m.unit_name || '-'}</td>
                          <td><Badge bg={m.status === 'Active' ? 'success' : 'secondary'}>{m.status}</Badge></td>
                          <td>{m.join_date ? new Date(m.join_date).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted py-3 small">No members yet</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
