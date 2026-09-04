import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Badge, Button, Table } from 'react-bootstrap'
import { FiArrowLeft, FiUser, FiPhone, FiMail, FiMapPin, FiDollarSign, FiExternalLink } from 'react-icons/fi'
import api from '../../services/api'

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MemberDetail() {
  const { id } = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contribData, setContribData] = useState(null)

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await api.get(`/members/${id}`)
        setMember(res.data.data)
        const contribRes = await api.get(`/contributions/member/${id}`)
        setContribData(contribRes.data.data)
      } catch {
        setMember(null)
      } finally {
        setLoading(false)
      }
    }
    fetchMember()
  }, [id])

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
  if (!member) return <div className="text-center py-5">Member not found</div>

  const attendance = member.recent_attendance || []
  const guardians = member.guardians || []
  const contributions = contribData?.contributions || member.recent_contributions || []

  const statusBadge = (status) => {
    const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button as={Link} to="/dashboard/members" variant="outline-primary" size="sm">
          <FiArrowLeft />
        </Button>
        <h4 className="mb-0">Member Profile</h4>
      </div>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="mop-card text-center">
            <Card.Body className="p-4">
              <div className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: 100, height: 100, background: 'linear-gradient(135deg, #F3E8FF, #e9d5ff)' }}>
                <FiUser size={40} style={{ color: '#6B21A8' }} />
              </div>
              <h4 style={{ color: '#6B21A8' }}>{member.first_name} {member.last_name}</h4>
              <Badge bg={member.status === 'Active' ? 'success' : member.status === 'Applicant' ? 'warning' : 'secondary'} className="mb-3">
                {member.status}
              </Badge>
              <div className="text-start mt-3">
                <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                  <FiMail /> <span>{member.email || 'N/A'}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                  <FiPhone /> <span>{member.phone || 'N/A'}</span>
                </div>
                {member.location && (
                  <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                    <FiMapPin /> <span>{member.location}</span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="mop-card mb-4">
            <Card.Header className="py-3">
              <h6 className="mb-0 text-white">Personal Information</h6>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}><strong>Member Code:</strong> {member.member_code || 'N/A'}</Col>
                <Col md={6}><strong>Unit:</strong> <Badge bg="primary">{member.unit_name || 'N/A'}</Badge></Col>
                <Col md={6}><strong>Date of Birth:</strong> {member.date_of_birth || 'N/A'}</Col>
                <Col md={6}><strong>School:</strong> {member.school || 'N/A'}</Col>
                <Col md={6}><strong>Location:</strong> {member.location || 'N/A'}</Col>
                <Col md={6}><strong>Join Date:</strong> {member.join_date || 'N/A'}</Col>
                <Col md={6}>
                  <strong>Monthly Umusanzwe:</strong>{' '}
                  <span className="fw-bold" style={{ color: '#7C3AED' }}>
                    RWF {(member.monthly_contribution || 500).toLocaleString()}
                  </span>
                </Col>
                {member.leadership_position && (
                  <Col md={6}>
                    <strong>Board Role:</strong>{' '}
                    <Badge bg="warning" text="dark">{member.leadership_position}</Badge>
                  </Col>
                )}
                {member.leadership_start && (
                  <Col md={6}>
                    <strong>Since:</strong> {member.leadership_start}
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>

          {/* Contribution Summary */}
          {contribData && (
            <Card className="mop-card mb-4">
              <Card.Header className="py-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white"><FiDollarSign className="me-2" />Contribution Summary</h6>
                <Link to={`/dashboard/member-contributions/${id}`} className="btn btn-sm btn-light">
                  Full History <FiExternalLink className="ms-1" />
                </Link>
              </Card.Header>
              <Card.Body>
                <Row className="g-3 mb-4">
                  <Col md={2} sm={4} xs={6}>
                    <div className="text-center p-3 rounded" style={{ background: '#F0FDF4' }}>
                      <div className="fs-5 fw-bold" style={{ color: '#16a34a' }}>{contribData.paid_months || 0}</div>
                      <small className="text-muted">Paid Months</small>
                    </div>
                  </Col>
                  <Col md={2} sm={4} xs={6}>
                    <div className="text-center p-3 rounded" style={{ background: '#FEF2F2' }}>
                      <div className="fs-5 fw-bold" style={{ color: '#dc2626' }}>{contribData.unpaid_months || 0}</div>
                      <small className="text-muted">Unpaid</small>
                    </div>
                  </Col>
                  <Col md={2} sm={4} xs={6}>
                    <div className="text-center p-3 rounded" style={{ background: '#FEF9C3' }}>
                      <div className="fs-5 fw-bold" style={{ color: '#f59e0b' }}>{contribData.partial_months || 0}</div>
                      <small className="text-muted">Partial</small>
                    </div>
                  </Col>
                  <Col md={2} sm={4} xs={6}>
                    <div className="text-center p-3 rounded" style={{ background: '#EDE9FE' }}>
                      <div className="fs-5 fw-bold" style={{ color: '#7C3AED' }}>{contribData.rate || 0}%</div>
                      <small className="text-muted">Rate</small>
                    </div>
                  </Col>
                  <Col md={2} sm={4} xs={6}>
                    <div className="text-center p-3 rounded" style={{ background: '#F0FDF4' }}>
                      <div className="fs-5 fw-bold" style={{ color: '#16a34a' }}>RWF {(contribData.total_paid || 0).toLocaleString()}</div>
                      <small className="text-muted">Total Paid</small>
                    </div>
                  </Col>
                  <Col md={2} sm={4} xs={6}>
                    <div className="text-center p-3 rounded" style={{ background: contribData.outstanding > 0 ? '#FEF2F2' : '#F0FDF4' }}>
                      <div className="fs-5 fw-bold" style={{ color: contribData.outstanding > 0 ? '#dc2626' : '#16a34a' }}>
                        RWF {(contribData.outstanding || 0).toLocaleString()}
                      </div>
                      <small className="text-muted">Outstanding</small>
                    </div>
                  </Col>
                </Row>

                {contribData.missed && contribData.missed.length > 0 && (
                  <div className="alert alert-warning d-flex align-items-center mb-4 py-2">
                    <span className="small"><strong>{contribData.missed.length}</strong> missed month(s). <Link to={`/dashboard/member-contributions/${id}`}>View & Pay</Link></span>
                  </div>
                )}

                {contributions.length > 0 && (
                  <>
                    <h6>Recent Payments</h6>
                    <Table className="mop-table" size="sm">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Required</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.slice(0, 6).map((c, idx) => (
                          <tr key={idx}>
                            <td>{monthNames[c.contribution_month]} {c.contribution_year}</td>
                            <td>{Number(c.required_amount).toLocaleString()} RWF</td>
                            <td style={{ color: '#16a34a', fontWeight: 600 }}>{Number(c.total_paid).toLocaleString()} RWF</td>
                            <td style={{ color: c.balance > 0 ? '#dc2626' : '#6b7280' }}>{Number(c.balance).toLocaleString()} RWF</td>
                            <td>{statusBadge(c.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}
              </Card.Body>
            </Card>
          )}

          {guardians.length > 0 && (
            <Card className="mop-card mb-4">
              <Card.Header className="py-3">
                <h6 className="mb-0 text-white">Guardians / Parents</h6>
              </Card.Header>
              <div className="table-responsive">
                <Table className="mop-table mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Relationship</th>
                      <th>Phone</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardians.map((g, idx) => (
                      <tr key={idx}>
                        <td className="fw-semibold">{g.full_name || g.guardian_name || g.name || 'N/A'}</td>
                        <td>{g.relationship || g.relation || '-'}</td>
                        <td>{g.phone || '-'}</td>
                        <td>{g.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}

          <Card className="mop-card">
            <Card.Header className="py-3">
              <h6 className="mb-0 text-white">Recent Attendance</h6>
            </Card.Header>
            <div className="table-responsive">
              <Table className="mop-table mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length > 0 ? attendance.map((a, idx) => (
                    <tr key={idx}>
                      <td>{a.meeting_date}</td>
                      <td>{a.event_title || 'Regular Meeting'}</td>
                      <td>
                        <Badge bg={a.status === 'Present' ? 'success' : a.status === 'Absent' ? 'danger' : 'warning'}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center text-muted py-3">No attendance records</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
