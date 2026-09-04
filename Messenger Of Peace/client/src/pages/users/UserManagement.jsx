import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Badge, Button, Modal, Form, Row, Col, InputGroup, Nav } from 'react-bootstrap'
import { FiUsers, FiPlus, FiEdit3, FiTrash2, FiKey, FiSearch, FiUserCheck, FiActivity, FiRefreshCw, FiClock } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [activityUser, setActivityUser] = useState(null)
  const [activityLogs, setActivityLogs] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', phone: '', role_id: '', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const [tab, setTab] = useState('users')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', roleFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      const res = await api.get(`/users?${params}`)
      setUsers(res.data.data || [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter, search])

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles')
      setRoles(res.data.data || [])
    } catch {
      try {
        const res = await api.get('/users/roles')
        setRoles(res.data.data || [])
      } catch {}
    }
  }

  useEffect(() => { fetchUsers(); fetchRoles() }, [fetchUsers])

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', first_name: '', last_name: '', phone: '', role_id: '', password: '' })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone || '',
      role_id: u.role_id ? String(u.role_id) : '',
      password: ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const payload = { first_name: form.first_name, last_name: form.last_name, phone: form.phone }
        if (form.role_id) payload.role_id = Number(form.role_id)
        await api.put(`/users/${editing.id}`, payload)
        toast.success('User updated successfully')
      } else {
        await api.post('/users', form)
        toast.success('User created successfully')
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save')
    }
  }

  const toggleActive = async (user) => {
    const newStatus = user.is_active ? 0 : 1
    try {
      await api.put(`/users/${user.id}`, { is_active: newStatus })
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Deactivate user ${user.first_name} ${user.last_name}?`)) return
    try {
      await api.delete(`/users/${user.id}`)
      toast.success('User deactivated')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate user')
    }
  }

  const openResetPassword = (userId) => {
    setSelectedUserId(userId)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/users/${selectedUserId}/reset-password`, { password: newPassword })
      toast.success('Password reset successfully')
      setShowPasswordModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password')
    }
  }

  const openActivityLog = async (user) => {
    setActivityUser(user)
    setActivityLogs([])
    setShowActivityModal(true)
    setActivityLoading(true)
    try {
      const res = await api.get(`/users/${user.id}/activity`)
      setActivityLogs(res.data.data || [])
    } catch {
      setActivityLogs([])
    } finally {
      setActivityLoading(false)
    }
  }

  const roleColor = (roleName) => {
    const name = roleName?.toLowerCase() || ''
    if (name.includes('super_admin') || name.includes('super')) return '#3B0764'
    if (name.includes('admin')) return '#581C87'
    if (name.includes('chief')) return '#6B21A8'
    if (name.includes('secretary')) return '#7C3AED'
    if (name.includes('treasurer')) return '#9333EA'
    if (name.includes('leader')) return '#A855F7'
    if (name.includes('media')) return '#8B5CF6'
    if (name.includes('member')) return '#C084FC'
    return '#6B7280'
  }

  const getRoleName = (user) => user.role_name || roles.find(r => r.id === user.role_id)?.name || 'member'

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold"><FiUserCheck className="me-2" style={{ color: '#7C3AED' }} />User Management</h4>
          <small className="text-muted">Manage admin and staff user accounts, roles, and activity</small>
        </div>
        <Button style={{ background: '#7C3AED', border: 'none' }} onClick={openCreate}>
          <FiPlus className="me-1" />Add User
        </Button>
      </div>

      <Nav variant="pills" className="mb-4" activeKey={tab} onSelect={k => setTab(k)}>
        <Nav.Item>
          <Nav.Link eventKey="users" style={{ color: tab === 'users' ? '#fff' : '#7C3AED' }}>
            <FiUsers className="me-1" /> Users
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="activity" style={{ color: tab === 'activity' ? '#fff' : '#7C3AED' }}>
            <FiActivity className="me-1" /> Recent Activity
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === 'users' && (
        <>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Form onSubmit={e => { e.preventDefault(); fetchUsers() }}>
                <Row className="g-2">
                  <Col md={4}>
                    <InputGroup>
                      <InputGroup.Text style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                        <FiSearch style={{ color: '#7C3AED' }} />
                      </InputGroup.Text>
                      <Form.Control placeholder="Search by name or email..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ border: '1px solid #DDD6FE' }} />
                    </InputGroup>
                  </Col>
                  <Col md={3}>
                    <Form.Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                      style={{ border: '1px solid #DDD6FE' }}>
                      <option value="">All Roles</option>
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      style={{ border: '1px solid #DDD6FE' }}>
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button type="submit" style={{ background: '#7C3AED', border: 'none', width: '100%' }}>
                      <FiRefreshCw className="me-1" />Go
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">Loading...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FiUsers size={48} className="mb-3 opacity-25" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: '#F3E8FF' }}>
                      <tr>
                        <th className="ps-3" style={{ color: '#581C87' }}>User</th>
                        <th style={{ color: '#581C87' }}>Email</th>
                        <th style={{ color: '#581C87' }}>Role</th>
                        <th style={{ color: '#581C87' }}>Status</th>
                        <th style={{ color: '#581C87' }}>Last Login</th>
                        <th className="text-end pe-3" style={{ color: '#581C87' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{ width: 36, height: 36, background: roleColor(getRoleName(u)), fontSize: '0.8rem' }}>
                                {u.first_name?.[0]}{u.last_name?.[0]}
                              </div>
                              <div>
                                <div className="fw-semibold">{u.first_name} {u.last_name}</div>
                                {u.phone && <small className="text-muted">{u.phone}</small>}
                              </div>
                            </div>
                          </td>
                          <td><small>{u.email}</small></td>
                          <td>
                            <Badge style={{ background: roleColor(getRoleName(u)), color: '#fff' }}>
                              {getRoleName(u)}
                            </Badge>
                          </td>
                          <td>
                            <Badge style={{ background: u.is_active ? '#7C3AED' : '#9CA3AF', color: '#fff' }}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted d-flex align-items-center gap-1">
                              <FiClock size={12} />
                              {u.last_login ? new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                            </small>
                          </td>
                          <td className="text-end pe-3">
                            <Button variant="link" size="sm" onClick={() => openEdit(u)} title="Edit">
                              <FiEdit3 style={{ color: '#7C3AED' }} />
                            </Button>
                            <Button variant="link" size="sm" onClick={() => openResetPassword(u.id)} title="Reset Password">
                              <FiKey style={{ color: '#9333EA' }} />
                            </Button>
                            <Button variant="link" size="sm" onClick={() => openActivityLog(u)} title="Activity Log">
                              <FiActivity style={{ color: '#6D28D9' }} />
                            </Button>
                            <Button variant="link" size="sm" onClick={() => toggleActive(u)}
                              title={u.is_active ? 'Deactivate' : 'Activate'}>
                              <FiUserCheck style={{ color: u.is_active ? '#9333EA' : '#7C3AED' }} />
                            </Button>
                            <Button variant="link" size="sm" onClick={() => handleDeleteUser(u)} title="Deactivate Account">
                              <FiTrash2 style={{ color: '#581C87' }} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {tab === 'activity' && (
        <Card className="border-0 shadow-sm">
          <Card.Header style={{ background: '#F3E8FF', borderBottom: '1px solid #DDD6FE' }}>
            <h6 className="mb-0 fw-bold" style={{ color: '#581C87' }}>
              <FiActivity className="me-2" />Recent User Activity
            </h6>
          </Card.Header>
          <Card.Body>
            {users.filter(u => u.last_login).length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FiClock size={32} className="mb-2 opacity-25" />
                <p>No recent activity found</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {users.filter(u => u.last_login).sort((a, b) => new Date(b.last_login) - new Date(a.last_login)).slice(0, 20).map(u => (
                  <div key={u.id} className="list-group-item d-flex align-items-center justify-content-between py-3"
                    style={{ borderLeft: `3px solid ${roleColor(getRoleName(u))}` }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                        style={{ width: 40, height: 40, background: roleColor(getRoleName(u)), fontSize: '0.8rem' }}>
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div>
                        <div className="fw-semibold">{u.first_name} {u.last_name}</div>
                        <small className="text-muted">{u.email}</small>
                      </div>
                    </div>
                    <div className="text-end">
                      <Badge style={{ background: roleColor(getRoleName(u)), color: '#fff' }} className="me-2">{getRoleName(u)}</Badge>
                      <small className="text-muted d-block">
                        <FiClock size={12} className="me-1" />
                        Last login: {new Date(u.last_login).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Create/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton style={{ background: '#F3E8FF' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiUsers className="me-2" />{editing ? 'Edit User' : 'Add New User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">First Name *</Form.Label>
                  <Form.Control required value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Last Name *</Form.Label>
                  <Form.Control required value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Email *</Form.Label>
              <Form.Control type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={!!editing} style={{ border: '1px solid #DDD6FE' }} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Phone</Form.Label>
                  <Form.Control value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Role *</Form.Label>
                  <Form.Select required value={form.role_id}
                    onChange={e => setForm({ ...form, role_id: e.target.value })}
                    style={{ border: '1px solid #DDD6FE' }}>
                    <option value="">Select role...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            {!editing && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Password *</Form.Label>
                <Form.Control type="password" required minLength={6} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters" style={{ border: '1px solid #DDD6FE' }} />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" style={{ background: '#7C3AED', border: 'none' }}>
              {editing ? 'Update' : 'Create'} User
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton style={{ background: '#F3E8FF' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiKey className="me-2" />Reset Password
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResetPassword}>
          <Modal.Body>
            <Form.Group>
              <Form.Label className="fw-semibold">New Password</Form.Label>
              <Form.Control type="password" required minLength={6} value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)" style={{ border: '1px solid #DDD6FE' }} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button type="submit" style={{ background: '#7C3AED', border: 'none' }}>Reset Password</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Activity Log Modal */}
      <Modal show={showActivityModal} onHide={() => setShowActivityModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ background: '#F3E8FF' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiActivity className="me-2" />Activity Log — {activityUser?.first_name} {activityUser?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {activityLoading ? (
            <div className="text-center py-4">Loading activity...</div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FiClock size={32} className="mb-2 opacity-25" />
              <p>No activity recorded for this user</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="list-group-item d-flex gap-3 py-3"
                  style={{ borderLeft: '3px solid #7C3AED' }}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, background: '#F3E8FF', flexShrink: 0 }}>
                    <FiActivity size={14} style={{ color: '#7C3AED' }} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{log.action || log.description || 'Activity'}</div>
                    <small className="text-muted">{log.details || log.metadata || ''}</small>
                  </div>
                  <small className="text-muted text-nowrap">
                    <FiClock size={12} className="me-1" />
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                  </small>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowActivityModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
