import { useState, useEffect } from 'react'
import { Table, Button, Modal, Badge, Row, Col, Form } from 'react-bootstrap'
import { FiCheck, FiX, FiEye, FiUserPlus, FiCopy } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { ageOn } from '../../utils/date'

const UNIT_MAP = {
  abatoni: { name: 'Abatoni', color: '#6B21A8' },
  inkesha: { name: 'Inkesha', color: '#1D4ED8' },
  abahizi: { name: 'Abahizi', color: '#15803D' },
  ingenzi: { name: 'Ingenzi', color: '#6B21A8' },
}

export default function ApplicationsManagement() {
  const [applications, setApplications] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  // Login details of a just-approved member; the server sends the password only once.
  const [newLogin, setNewLogin] = useState(null)

  useEffect(() => { fetchApplications() }, [])

  const fetchApplications = async () => {
    try {
      const res = await api.get('/member-applications')
      const data = res.data.data || res.data
      setApplications(data.applications || data || [])
    } catch { setApplications([]) }
    finally { setLoading(false) }
  }

  const handleReview = async (app, status) => {
    const label = status === 'Approved' ? 'approve' : 'reject'
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${app.first_name} ${app.second_name}'s application?`)) return
    try {
      const res = await api.patch(`/member-applications/${app.id}/review`, { status, notes: reviewNotes || null })
      setApplications(applications.map(a => a.id === app.id ? { ...a, status } : a))
      const emailedTo = res.data.data?.emailed_to
      toast.success(`Application ${label}d` + (emailedTo ? ` - email sent to ${emailedTo}` : ''))
      setShowModal(false)
      setReviewNotes('')
      const login = res.data.data?.login
      if (login) setNewLogin({ name: `${app.first_name} ${app.second_name}`, ...login, emailedTo })
    } catch { toast.error(`Failed to ${label}`) }
  }

  const copyLogin = async () => {
    const text = `Messengers of Peace login\nEmail: ${newLogin.email}\nTemporary password: ${newLogin.temporary_password}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Login details copied')
    } catch {
      toast.error('Could not copy - please write the details down')
    }
  }

  const statusBadge = (status) => {
    const map = { Pending: 'warning', Reviewed: 'info', Approved: 'success', Rejected: 'danger' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  const filtered = applications.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      if (!(a.first_name || '').toLowerCase().includes(s) && !(a.second_name || '').toLowerCase().includes(s) && !(a.application_code || '').toLowerCase().includes(s) && !(a.phone || '').includes(s)) return false
    }
    return true
  })

  const pending = applications.filter(a => a.status === 'Pending').length
  const approved = applications.filter(a => a.status === 'Approved').length
  const rejected = applications.filter(a => a.status === 'Rejected').length

  const unitInfo = (unit) => UNIT_MAP[unit] || { name: unit, color: '#6B21A8' }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiUserPlus className="me-2" /> Membership Applications</h4>
        <Button variant="outline-primary" size="sm" onClick={fetchApplications}>Refresh</Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}><div className="kpi-card" style={{ borderLeftColor: '#9333EA' }}><div className="kpi-value" style={{ color: '#9333EA' }}>{pending}</div><div className="kpi-label">Pending</div></div></Col>
        <Col md={3} sm={6}><div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}><div className="kpi-value" style={{ color: '#7C3AED' }}>{approved}</div><div className="kpi-label">Approved</div></div></Col>
        <Col md={3} sm={6}><div className="kpi-card" style={{ borderLeftColor: '#581C87' }}><div className="kpi-value" style={{ color: '#581C87' }}>{rejected}</div><div className="kpi-label">Rejected</div></div></Col>
        <Col md={3} sm={6}><div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}><div className="kpi-value" style={{ color: '#6B21A8' }}>{applications.length}</div><div className="kpi-label">Total</div></div></Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Form.Control placeholder="Search name, code, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </Col>
        <Col md={3}>
          <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </Form.Select>
        </Col>
      </Row>

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
                <th>Studying</th>
                <th>Job</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, idx) => {
                const u = unitInfo(app.unit)
                return (
                  <tr key={app.id}>
                    <td>{idx + 1}</td>
                    <td><code className="small">{app.application_code || '-'}</code></td>
                    <td className="fw-semibold">{app.first_name} {app.second_name}</td>
                    <td className="small">{app.phone}</td>
                    <td><Badge style={{ background: u.color }}>{u.name}</Badge></td>
                    <td><Badge bg={app.studying ? 'primary' : 'secondary'}>{app.studying ? 'Yes' : 'No'}</Badge></td>
                    <td className="small text-muted">{app.has_job ? app.job : (app.current_activity ? 'Other' : '-')}</td>
                    <td className="small">{app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}</td>
                    <td>{statusBadge(app.status)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button variant="outline-primary" size="sm" onClick={() => { setSelected(app); setReviewNotes(''); setShowModal(true) }}><FiEye /></Button>
                        {app.status === 'Pending' && (
                          <>
                            <Button variant="outline-success" size="sm" onClick={() => handleReview(app, 'Approved')}><FiCheck /></Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleReview(app, 'Rejected')}><FiX /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="10" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No applications'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <span className="me-2">{selected?.application_code || ''}</span>
            {selected && statusBadge(selected.status)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <Row className="g-3">
              <Col md={6}>
                <h6 className="fw-bold" style={{ color: '#6B21A8' }}>Personal Information</h6>
                <p className="mb-1"><strong>Name:</strong> {selected.first_name} {selected.second_name}</p>
                {selected.gender && <p className="mb-1"><strong>Gender:</strong> {selected.gender}</p>}
                {selected.date_of_birth && <p className="mb-1"><strong>Date of birth:</strong> {selected.date_of_birth} ({ageOn(selected.date_of_birth)} years)</p>}
                <p className="mb-1"><strong>Phone:</strong> {selected.phone}</p>
                {selected.email && <p className="mb-1"><strong>Email:</strong> {selected.email}</p>}
                <p className="mb-1"><strong>Location:</strong> {selected.location || 'N/A'}</p>
                {selected.district && <p className="mb-1"><strong>District:</strong> {selected.district}</p>}
                {selected.sector && <p className="mb-1"><strong>Sector:</strong> {selected.sector}</p>}
                {selected.cell && <p className="mb-1"><strong>Cell:</strong> {selected.cell}</p>}
              </Col>
              <Col md={6}>
                <h6 className="fw-bold" style={{ color: '#6B21A8' }}>Scout Unit</h6>
                {(() => { const u = unitInfo(selected.unit); return <p><Badge style={{ background: u.color, fontSize: '0.85rem' }}>{u.name}</Badge></p> })()}
              </Col>
              <Col md={6}>
                <h6 className="fw-bold" style={{ color: '#6B21A8' }}>Education / Employment</h6>
                <p className="mb-1"><strong>Studying:</strong> {selected.studying ? 'Yes' : 'No'}</p>
                {selected.studying ? (
                  <>
                    {selected.school_name && <p className="mb-1"><strong>School:</strong> {selected.school_name}</p>}
                    {selected.school_location && <p className="mb-1"><strong>School Location:</strong> {selected.school_location}</p>}
                  </>
                ) : (
                  <>
                    <p className="mb-1"><strong>Has Job:</strong> {selected.has_job ? 'Yes' : 'No'}</p>
                    {selected.has_job ? (
                      <>
                        {selected.job && <p className="mb-1"><strong>Job:</strong> {selected.job}</p>}
                        {selected.company && <p className="mb-1"><strong>Company:</strong> {selected.company}</p>}
                      </>
                    ) : (
                      selected.current_activity && <p className="mb-1"><strong>Current Activity:</strong> {selected.current_activity}</p>
                    )}
                  </>
                )}
              </Col>
              <Col md={6}>
                <h6 className="fw-bold" style={{ color: '#6B21A8' }}>Parent / Guardian</h6>
                <p className="mb-1"><strong>Name:</strong> {selected.parent_first_name} {selected.parent_second_name}</p>
                <p className="mb-1"><strong>Phone:</strong> {selected.parent_phone}</p>
                <h6 className="fw-bold mt-3" style={{ color: '#6B21A8' }}>Emergency contact</h6>
                {selected.emergency_name || selected.emergency_phone ? (
                  <p className="mb-1">{[selected.emergency_name, selected.emergency_relation].filter(Boolean).join(', ')} · {selected.emergency_phone || 'no phone'}</p>
                ) : (
                  <p className="mb-1 text-muted small">The parent / guardian above.</p>
                )}
                <h6 className="fw-bold mt-3" style={{ color: '#6B21A8' }}>Details</h6>
                <p className="small text-muted">Applied: {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : 'N/A'}</p>
                {selected.reviewed_by_name && <p className="small text-muted">Reviewed by: {selected.reviewed_by_name}</p>}
                {selected.admin_notes && <p className="small"><strong>Notes:</strong> {selected.admin_notes}</p>}
              </Col>
              {selected.status === 'Pending' && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Review Notes (optional)</Form.Label>
                    <Form.Control as="textarea" rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Notes about this review..." />
                  </Form.Group>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          {selected?.status === 'Pending' && (
            <>
              <Button variant="danger" onClick={() => handleReview(selected, 'Rejected')}><FiX className="me-1" /> Reject</Button>
              <Button variant="success" onClick={() => handleReview(selected, 'Approved')}><FiCheck className="me-1" /> Approve</Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={!!newLogin} onHide={() => setNewLogin(null)} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Login details for {newLogin?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2"><strong>Email:</strong> <code>{newLogin?.email}</code></p>
          <p className="mb-3"><strong>Temporary password:</strong> <code className="fs-5">{newLogin?.temporary_password}</code></p>
          {newLogin?.emailedTo ? (
            <div className="alert alert-success small mb-0">
              These details were also emailed to <strong>{newLogin.emailedTo}</strong>. They are shown here
              only once; keep a copy in case the email does not arrive.
            </div>
          ) : (
            <div className="alert alert-warning small mb-0">
              Shown only once. Give these to the member (or their parent) and ask them to change
              the password after their first login.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={copyLogin}><FiCopy className="me-1" /> Copy</Button>
          <Button variant="primary" onClick={() => setNewLogin(null)}>Done</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
