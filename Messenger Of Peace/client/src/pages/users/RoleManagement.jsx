import { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Badge, Row, Col, InputGroup } from 'react-bootstrap'
import { FiShield, FiPlus, FiEdit3, FiTrash2, FiSearch, FiCheckCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

// Built-in roles are checked by name in the code, so the server refuses to rename or delete them.
const BUILT_IN_ROLES = ['super_admin', 'chief', 'deputy_chief', 'secretary', 'treasurer',
  'discipline_officer', 'unit_leader', 'media', 'member', 'applicant']

const PERMISSION_MODULES = [
  'members', 'leadership', 'units', 'attendance', 'contributions',
  'finance', 'events', 'portfolio', 'gallery', 'announcements',
  'reports', 'settings', 'users'
]

const MODULE_LABELS = {
  members: 'Members', leadership: 'Leadership', units: 'Units',
  attendance: 'Attendance', contributions: 'Contributions', finance: 'Finance',
  events: 'Events', portfolio: 'Portfolio', gallery: 'Gallery',
  announcements: 'Announcements', reports: 'Reports', settings: 'Settings', users: 'Users'
}

const ACTION_LABELS = {
  create: 'Create', read: 'View', update: 'Edit', delete: 'Delete',
  export: 'Export', import: 'Import', approve: 'Approve', manage: 'Manage'
}

function formatPermLabel(permKey) {
  const parts = permKey.split('.')
  if (parts.length === 2) {
    const mod = MODULE_LABELS[parts[0]] || parts[0]
    const act = ACTION_LABELS[parts[1]] || parts[1].charAt(0).toUpperCase() + parts[1].slice(1)
    return `${act} ${mod}`
  }
  return permKey.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export default function RoleManagement() {
  const [roles, setRoles] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [deletingRole, setDeletingRole] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [selectedPerms, setSelectedPerms] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchRoles(); fetchAllPermissions() }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const res = await api.get('/roles')
      setRoles(res.data.data || [])
    } catch {
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPermissions = async () => {
    try {
      const res = await api.get('/roles/permissions/all')
      // The server groups permissions by module ({ finance: [...], ... }); the page works
      // with one list, and uses the permission name (e.g. 'finance.create') as its key.
      const data = res.data.data || {}
      const list = Array.isArray(data) ? data : Object.values(data).flat()
      setAllPermissions(list.map(p => ({ ...p, key: p.key || p.name })))
    } catch {}
  }

  const openCreate = () => {
    setEditingRole(null)
    setForm({ name: '', description: '' })
    setSelectedPerms({})
    setShowModal(true)
  }

  const openEdit = async (role) => {
    try {
      const res = await api.get(`/roles/${role.id}`)
      const data = res.data.data || role
      setEditingRole(data)
      setForm({ name: data.name, description: data.description || '' })
      const permMap = {}
      // The role's permissions come as full objects; tick their ids.
      ;(data.permission_ids || (data.permissions || []).map(p => p.id)).forEach(id => { permMap[id] = true })
      setSelectedPerms(permMap)
      setShowModal(true)
    } catch {
      toast.error('Failed to load role details')
    }
  }

  const togglePerm = (permId) => {
    setSelectedPerms(prev => ({ ...prev, [permId]: !prev[permId] }))
  }

  const toggleModule = (module) => {
    const modulePerms = allPermissions.filter(p => p.key?.startsWith(module + '.'))
    const allChecked = modulePerms.every(p => selectedPerms[p.id])
    const updated = { ...selectedPerms }
    modulePerms.forEach(p => { updated[p.id] = !allChecked })
    setSelectedPerms(updated)
  }

  const toggleAllPerms = () => {
    const allChecked = allPermissions.every(p => selectedPerms[p.id])
    if (allChecked) {
      setSelectedPerms({})
    } else {
      const updated = {}
      allPermissions.forEach(p => { updated[p.id] = true })
      setSelectedPerms(updated)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Role name is required')
    const permission_ids = Object.keys(selectedPerms).filter(id => selectedPerms[id])
    if (permission_ids.length === 0) return toast.error('Select at least one permission')
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), permission_ids: permission_ids.map(Number) }
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, payload)
        toast.success('Role updated successfully')
      } else {
        await api.post('/roles', payload)
        toast.success('Role created successfully')
      }
      setShowModal(false)
      fetchRoles()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingRole) return
    try {
      await api.delete(`/roles/${deletingRole.id}`)
      toast.success('Role deleted successfully')
      setShowDeleteModal(false)
      setDeletingRole(null)
      fetchRoles()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete role')
    }
  }

  const filtered = roles.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))

  const roleColor = (name) => {
    const n = name?.toLowerCase() || ''
    if (n.includes('super_admin') || n.includes('super')) return '#3B0764'
    if (n.includes('admin')) return '#581C87'
    if (n.includes('chief')) return '#6B21A8'
    if (n.includes('secretary')) return '#7C3AED'
    if (n.includes('treasurer')) return '#9333EA'
    if (n.includes('leader')) return '#A855F7'
    if (n.includes('media')) return '#8B5CF6'
    if (n.includes('member')) return '#C084FC'
    return '#6B7280'
  }

  const groupedPerms = {}
  PERMISSION_MODULES.forEach(mod => {
    groupedPerms[mod] = allPermissions.filter(p => p.key?.startsWith(mod + '.'))
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold"><FiShield className="me-2" style={{ color: '#7C3AED' }} />Role Management</h4>
          <small className="text-muted">Create and manage roles with permission-based access control</small>
        </div>
        <Button style={{ background: '#7C3AED', border: 'none' }} onClick={openCreate}>
          <FiPlus className="me-1" />Create Role
        </Button>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text style={{ background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
              <FiSearch style={{ color: '#7C3AED' }} />
            </InputGroup.Text>
            <Form.Control placeholder="Search roles..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ border: '1px solid #DDD6FE' }} />
          </InputGroup>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FiShield size={48} className="mb-3 opacity-25" />
              <p>No roles found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#F3E8FF' }}>
                  <tr>
                    <th className="ps-3" style={{ color: '#581C87' }}>Role Name</th>
                    <th style={{ color: '#581C87' }}>Description</th>
                    <th style={{ color: '#581C87' }}>Permissions</th>
                    <th style={{ color: '#581C87' }}>Users</th>
                    <th className="text-end pe-3" style={{ color: '#581C87' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(role => (
                    <tr key={role.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 36, height: 36, background: roleColor(role.name), fontSize: '0.75rem' }}>
                            <FiShield size={14} />
                          </div>
                          <div className="fw-semibold" style={{ color: '#3B0764' }}>{role.name}</div>
                        </div>
                      </td>
                      <td><small className="text-muted">{role.description || 'No description'}</small></td>
                      <td>
                        <Badge style={{ background: '#7C3AED', color: '#fff' }}>
                          {role.permission_count ?? role.permissions?.length ?? 0} permissions
                        </Badge>
                      </td>
                      <td><small className="text-muted">{role.user_count ?? 0} users</small></td>
                      <td className="text-end pe-3">
                        <Button variant="link" size="sm" onClick={() => openEdit(role)} title="Edit Role">
                          <FiEdit3 style={{ color: '#7C3AED' }} />
                        </Button>
                        <Button variant="link" size="sm" onClick={() => {
                          if (BUILT_IN_ROLES.includes(role.name)) return toast.warning('Built-in roles cannot be deleted')
                          setDeletingRole(role)
                          setShowDeleteModal(true)
                        }} title="Delete Role">
                          <FiTrash2 style={{ color: BUILT_IN_ROLES.includes(role.name) ? '#D1D5DB' : '#581C87' }} />
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

      {/* Create / Edit Role Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ background: '#F3E8FF' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiShield className="me-2" />{editingRole ? 'Edit Role' : 'Create New Role'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <Row className="g-3 mb-4">
              <Col md={5}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Role Name *</Form.Label>
                  <Form.Control required value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. content_manager" disabled={BUILT_IN_ROLES.includes(editingRole?.name)}
                    style={{ border: '1px solid #DDD6FE' }} />
                  {BUILT_IN_ROLES.includes(editingRole?.name) && (
                    <Form.Text muted>Built-in role: the name is used by the system and can't be changed.</Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={7}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Description</Form.Label>
                  <Form.Control value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of this role"
                    style={{ border: '1px solid #DDD6FE' }} />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0" style={{ color: '#581C87' }}>Permissions</h6>
              <Form.Check type="checkbox" label="Select All" checked={allPermissions.length > 0 && allPermissions.every(p => selectedPerms[p.id])}
                onChange={toggleAllPerms}
                className="fw-semibold" style={{ color: '#7C3AED' }} />
            </div>

            {PERMISSION_MODULES.map(mod => {
              const perms = groupedPerms[mod]
              if (!perms || perms.length === 0) return null
              const allChecked = perms.every(p => selectedPerms[p.id])
              return (
                <div key={mod} className="mb-3 p-3 rounded" style={{ background: '#FAFAFA', border: '1px solid #F3E8FF' }}>
                  <div className="d-flex align-items-center gap-2 mb-2 pb-2" style={{ borderBottom: '1px solid #EDE9FE' }}>
                    <Form.Check type="checkbox" checked={allChecked}
                      onChange={() => toggleModule(mod)}
                      style={{ accentColor: '#7C3AED' }} />
                    <span className="fw-bold" style={{ color: '#6B21A8', textTransform: 'capitalize' }}>
                      {MODULE_LABELS[mod] || mod}
                    </span>
                    <Badge style={{ background: '#EDE9FE', color: '#6B21A8', fontSize: '0.7rem' }}>
                      {perms.filter(p => selectedPerms[p.id]).length}/{perms.length}
                    </Badge>
                  </div>
                  <Row className="g-1">
                    {perms.map(perm => (
                      <Col md={6} key={perm.id}>
                        <Form.Check type="checkbox" label={perm.label || formatPermLabel(perm.key)}
                          checked={!!selectedPerms[perm.id]}
                          onChange={() => togglePerm(perm.id)}
                          className="mb-1" style={{ fontSize: '0.85rem' }} />
                      </Col>
                    ))}
                  </Row>
                </div>
              )
            })}

            {allPermissions.length === 0 && (
              <div className="text-center py-4 text-muted">
                <FiCheckCircle size={32} className="mb-2 opacity-25" />
                <p>Permission modules will appear here once loaded from the server.</p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" style={{ background: '#7C3AED', border: 'none' }} disabled={saving}>
              {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton style={{ background: 'var(--mop-danger-bg)' }}>
          <Modal.Title style={{ color: '#581C87' }}>
            <FiTrash2 className="me-2" />Delete Role
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the role <strong>{deletingRole?.name}</strong>?</p>
          <p className="text-muted mb-0"><small>This action cannot be undone. Users with this role will need to be reassigned.</small></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button style={{ background: '#581C87', border: 'none' }} onClick={confirmDelete}>
            <FiTrash2 className="me-1" />Delete Role
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
