import { useState, useEffect, useCallback } from 'react'
import { Table, Badge, Row, Col, Form, Button, InputGroup } from 'react-bootstrap'
import { FiSearch, FiActivity, FiClock, FiUsers, FiGrid, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const ACTION_COLORS = {
  create: 'success',
  update: 'primary',
  delete: 'danger',
  login: 'purple',
  approve: 'teal',
}

const ACTION_VARIANTS = {
  create: 'success',
  update: 'primary',
  delete: 'danger',
  login: 'purple',
  approve: 'teal',
}

const PAGE_SIZE = 50

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const [kpi, setKpi] = useState({ total_actions: 0, today_actions: 0, active_users: 0, modules_affected: 0 })

  const [filterUser, setFilterUser] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [expandedRow, setExpandedRow] = useState(null)

  const [users, setUsers] = useState([])
  const [modules, setModules] = useState([])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterUser) params.append('user_id', filterUser)
      if (filterAction) params.append('action', filterAction)
      if (filterModule) params.append('module', filterModule)
      if (filterDateFrom) params.append('date_from', filterDateFrom)
      if (filterDateTo) params.append('date_to', filterDateTo)
      params.append('limit', PAGE_SIZE)
      params.append('offset', page * PAGE_SIZE)

      const res = await api.get(`/audit-logs?${params.toString()}`)
      const data = res.data.data || res.data
      setLogs(data.records || data.logs || [])
      setTotal(data.total || 0)

      if (data.kpi) setKpi(data.kpi)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filterUser, filterModule, filterAction, filterDateFrom, filterDateTo, page])

  const fetchMeta = useCallback(async () => {
    try {
      const res = await api.get('/audit-logs?limit=1&offset=0')
      const data = res.data.data || res.data
      if (data.users) setUsers(data.users)
      if (data.modules) setModules(data.modules)
      if (data.kpi) setKpi(data.kpi)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { fetchMeta() }, [fetchMeta])

  const timeAgo = (dateStr) => {
    if (!dateStr) return '-'
    const now = new Date()
    const then = new Date(dateStr)
    const seconds = Math.floor((now - then) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const renderDetail = (log) => {
    const oldVal = log.old_value || log.old_values
    const newVal = log.new_value || log.new_values
    if (!oldVal && !newVal) return <span className="text-muted">No additional details</span>

    return (
      <Row className="g-3">
        {oldVal && (
          <Col md={6}>
            <div className="p-3 rounded" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <h6 className="text-danger mb-2 small fw-bold">Previous Value</h6>
              <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{typeof oldVal === 'string' ? oldVal : JSON.stringify(oldVal, null, 2)}</pre>
            </div>
          </Col>
        )}
        {newVal && (
          <Col md={6}>
            <div className="p-3 rounded" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <h6 className="text-success mb-2 small fw-bold">New Value</h6>
              <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{typeof newVal === 'string' ? newVal : JSON.stringify(newVal, null, 2)}</pre>
            </div>
          </Col>
        )}
      </Row>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiActivity className="me-2" /> Audit Logs</h4>
        <small className="text-muted">{total} total records</small>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{kpi.total_actions || 0}</div>
            <div className="kpi-label">Total Actions</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value" style={{ color: '#6B21A8' }}>{kpi.today_actions || 0}</div>
            <div className="kpi-label">Today's Actions</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#059669' }}>
            <div className="kpi-value" style={{ color: '#059669' }}>{kpi.active_users || 0}</div>
            <div className="kpi-label">Active Users</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="kpi-card" style={{ borderLeftColor: '#9333EA' }}>
            <div className="kpi-value" style={{ color: '#9333EA' }}>{kpi.modules_affected || 0}</div>
            <div className="kpi-label">Modules Affected</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card p-3 mb-4">
        <Row className="g-3 align-items-end">
          <Col md={2}>
            <Form.Label className="small fw-semibold">User</Form.Label>
            <Form.Select size="sm" value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(0) }}>
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label className="small fw-semibold">Module</Form.Label>
            <Form.Select size="sm" value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(0) }}>
              <option value="">All Modules</option>
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label className="small fw-semibold">Action</Form.Label>
            <Form.Select size="sm" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0) }}>
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="approve">Approve</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label className="small fw-semibold">Date From</Form.Label>
            <Form.Control type="date" size="sm" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0) }} />
          </Col>
          <Col md={2}>
            <Form.Label className="small fw-semibold">Date To</Form.Label>
            <Form.Control type="date" size="sm" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(0) }} />
          </Col>
          <Col md={2}>
            <Button variant="outline-secondary" size="sm" onClick={() => {
              setFilterUser(''); setFilterModule(''); setFilterAction('')
              setFilterDateFrom(''); setFilterDateTo(''); setPage(0)
            }}>
              Clear Filters
            </Button>
          </Col>
        </Row>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Record ID</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      {expandedRow === log.id ? <FiChevronUp /> : <FiChevronDown />}
                    </td>
                    <td>
                      <div className="small">{formatTimestamp(log.created_at || log.timestamp)}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{timeAgo(log.created_at || log.timestamp)}</div>
                    </td>
                    <td className="fw-semibold">{log.user_name || log.user_email || log.user_id || '-'}</td>
                    <td>
                      <Badge bg={ACTION_VARIANTS[log.action?.toLowerCase()] || 'secondary'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td>{log.module || '-'}</td>
                    <td className="text-muted small">{log.record_id || '-'}</td>
                    <td className="text-muted small" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details || log.description || '-'}
                    </td>
                    <td className="text-muted small">{log.ip_address || log.ip || '-'}</td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan="8" className="p-3" style={{ background: '#F9FAFB' }}>
                        {renderDetail(log)}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="8" className="text-center py-4 text-muted">No audit logs found</td></tr>
              )}
            </tbody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center p-3 border-top">
            <small className="text-muted">
              Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </small>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="d-flex align-items-center small fw-semibold">
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="outline-primary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
