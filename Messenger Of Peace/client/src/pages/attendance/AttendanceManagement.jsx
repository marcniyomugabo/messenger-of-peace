import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Button, Form, Row, Col, Nav, Spinner, Badge, InputGroup } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { FiPlus, FiDownload, FiTrash2, FiAlertTriangle, FiSearch, FiInfo } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { PEOPLE } from '../../config/roles'
import { today } from '../../utils/date'
import { SESSION_TYPES, formatDate, startOfYear, RATE_HELP, downloadAttendanceCsv, downloadCsv } from '../../utils/attendance'
import { RateBar } from '../../components/attendance/AttendanceBits'
import RegisterEditor from './RegisterEditor'

const PAGE = 25

export default function AttendanceManagement() {
  const { hasRole } = useAuth()
  const isManager = hasRole(...PEOPLE) // super_admin, chief, secretary: every unit, may delete
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'members' ? 'members' : 'registers'
  const open = params.get('register') // 'new' or a register id

  const [allUnits, setAllUnits] = useState([])
  const [scope, setScope] = useState(null) // null = every unit
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ from: '', to: '', unit_id: '', type: '' })

  const [summary, setSummary] = useState([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryNote, setSummaryNote] = useState('')
  const [range, setRange] = useState({ from: startOfYear(), to: today(), unit_id: '' })
  const [onlyAttention, setOnlyAttention] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/units').then(res => setAllUnits((res.data.data || []).map(u => ({ id: u.id, name: u.name })))).catch(() => setAllUnits([]))
  }, [])

  const units = useMemo(() => (scope === null ? allUnits : allUnits.filter(u => scope.includes(u.id))), [allUnits, scope])

  const loadSessions = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/attendance/sessions', { params: { ...filters, page: p, limit: PAGE } })
      const d = res.data.data
      setSessions(prev => (p === 1 ? d.sessions : [...prev, ...d.sessions]))
      setTotal(d.total)
      setPage(p)
      setScope(d.unit_scope)
    } catch {
      toast.error('Could not load the registers')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await api.get('/attendance/summary', { params: range })
      setSummary(res.data.data.members || [])
      setSummaryNote(res.data.data.message || '')
    } catch {
      toast.error('Could not load member attendance')
    } finally {
      setSummaryLoading(false)
    }
  }, [range])

  // Always loaded (also when a register is opened directly): it tells which units this person may use.
  useEffect(() => { loadSessions(1) }, [loadSessions, open])
  useEffect(() => { loadSummary() }, [loadSummary])

  const go = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  const removeSession = async (s) => {
    if (!window.confirm(`Delete the register of ${formatDate(s.session_date)} (${s.unit_name || 'Whole group'})?\n\nAll ${s.total} marks on it are removed. This cannot be undone.`)) return
    try {
      await api.delete(`/attendance/sessions/${s.id}`)
      toast.success('Register deleted')
      loadSessions(1)
      loadSummary()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete')
    }
  }

  const exportRegisters = () => downloadAttendanceCsv({ ...filters }).catch(() => toast.error('Could not export'))

  // ---- Register screen ----
  if (open) {
    return (
      <RegisterEditor
        key={open}
        sessionId={open === 'new' ? null : Number(open)}
        units={units}
        wholeGroup={isManager}
        canDelete={isManager}
        onClose={() => { go({ register: null }); loadSummary() }}
        onOpen={(id) => go({ register: String(id) })}
      />
    )
  }

  const attention = summary.filter(m => m.needs_attention)
  const last = sessions[0]
  const shownMembers = summary
    .filter(m => !onlyAttention || m.needs_attention)
    .filter(m => !search.trim() || `${m.member_name} ${m.member_code || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (b.needs_attention - a.needs_attention) || a.member_name.localeCompare(b.member_name))

  const exportMembers = () => downloadCsv(
    `member-attendance-${range.from || 'all'}-to-${range.to || today()}.csv`,
    ['Member code', 'Member', 'Unit', 'Present', 'Late', 'Absent', 'Excused', 'Rate %', 'Missed in a row', 'Last attended'],
    shownMembers.map(m => [m.member_code, m.member_name, m.unit_name, m.present, m.late, m.absent, m.excused, m.rate ?? '', m.missed_in_a_row, m.last_attended || ''])
  )

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 className="mb-0">Attendance</h4>
        <Button variant="primary" onClick={() => go({ register: 'new' })} disabled={!isManager && units.length === 0 && scope !== null}>
          <FiPlus className="me-1" /> Take a register
        </Button>
      </div>

      {scope !== null && scope.length === 0 && (
        <div className="alert alert-warning small">
          Your account is not linked to a unit yet, so you can only view whole-group registers. Ask an administrator to set your unit
          (on your member record or a leadership position).
        </div>
      )}

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-primary)' }}>
            <div className="kpi-value">{last ? `${last.rate ?? '–'}${last.rate != null ? '%' : ''}` : '–'}</div>
            <div className="kpi-label">Last register{last ? ` (${formatDate(last.session_date)})` : ''}</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{total}</div>
            <div className="kpi-label">Registers{filters.from || filters.to || filters.unit_id || filters.type ? ' (filtered)' : ''}</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}>
            {(() => {
              const rated = summary.filter(m => m.rate != null)
              const avg = rated.length ? Math.round(rated.reduce((s, m) => s + m.rate, 0) / rated.length) : null
              return <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{avg == null ? '–' : `${avg}%`}</div>
            })()}
            <div className="kpi-label" title={RATE_HELP}>Average member rate ({range.from === startOfYear() && range.to === today() ? 'this year' : 'chosen dates'})</div>
          </div>
        </Col>
        <Col md={3} sm={6}>
          <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-danger)', cursor: 'pointer' }}
            onClick={() => { go({ tab: 'members' }); setOnlyAttention(true) }} title="Show them">
            <div className="kpi-value" style={{ color: 'var(--mop-danger)' }}>{attention.length}</div>
            <div className="kpi-label">Missed 3+ in a row</div>
          </div>
        </Col>
      </Row>

      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={(k) => go({ tab: k === 'members' ? 'members' : null })}>
        <Nav.Item><Nav.Link eventKey="registers">Registers</Nav.Link></Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="members">
            Member attendance {attention.length > 0 && <Badge bg="danger" pill className="ms-1">{attention.length}</Badge>}
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === 'registers' ? (
        <>
          <div className="mop-card mop-card-static p-3 mb-3">
            <Row className="g-2 align-items-end">
              <Col md={2} sm={6}>
                <Form.Label className="small fw-semibold">From</Form.Label>
                <Form.Control size="sm" type="date" value={filters.from} max={today()} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
              </Col>
              <Col md={2} sm={6}>
                <Form.Label className="small fw-semibold">To</Form.Label>
                <Form.Control size="sm" type="date" value={filters.to} max={today()} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              </Col>
              <Col md={3} sm={6}>
                <Form.Label className="small fw-semibold">For</Form.Label>
                <Form.Select size="sm" value={filters.unit_id} onChange={e => setFilters(f => ({ ...f, unit_id: e.target.value }))}>
                  <option value="">All registers</option>
                  <option value="group">Whole group</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={3} sm={6}>
                <Form.Label className="small fw-semibold">Type</Form.Label>
                <Form.Select size="sm" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                  <option value="">All types</option>
                  {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
                </Form.Select>
              </Col>
              <Col md={2} className="d-flex gap-2">
                <Button size="sm" variant="outline-primary" className="flex-grow-1" onClick={exportRegisters} title="Every mark on the registers shown, as a spreadsheet">
                  <FiDownload className="me-1" />Export
                </Button>
              </Col>
            </Row>
          </div>

          <div className="mop-card mop-card-static">
            <div className="table-responsive">
              <Table className="mop-table mb-0 align-middle att-sessions">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Register</th>
                    <th>For</th>
                    <th className="text-center">Present</th>
                    <th className="text-center">Late</th>
                    <th className="text-center">Absent</th>
                    <th className="text-center">Excused</th>
                    <th title={RATE_HELP}>Rate <FiInfo size={12} /></th>
                    <th>Taken by</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} role="button" onClick={() => go({ register: String(s.id) })}>
                      <td className="text-nowrap fw-semibold">{formatDate(s.session_date)}</td>
                      <td>
                        <div>{s.title || s.session_type}</div>
                        <div className="text-muted small">{s.title ? s.session_type : ''}{s.event_title ? `${s.title ? ' · ' : ''}${s.event_title}` : ''}</div>
                      </td>
                      <td>{s.unit_name || <span className="text-muted">Whole group</span>}</td>
                      <td className="text-center" style={{ color: 'var(--mop-success)' }}>{s.present}</td>
                      <td className="text-center" style={{ color: '#B45309' }}>{s.late}</td>
                      <td className="text-center" style={{ color: 'var(--mop-danger)' }}>{s.absent}</td>
                      <td className="text-center" style={{ color: '#2563EB' }}>{s.excused}</td>
                      <td><RateBar rate={s.rate} width={60} /></td>
                      <td className="small text-muted">{s.recorded_by_name || '–'}</td>
                      <td className="text-end text-nowrap" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="link" className="p-1" title="Export this register"
                          onClick={() => downloadAttendanceCsv({ session_id: s.id }).catch(() => toast.error('Could not export'))}>
                          <FiDownload />
                        </Button>
                        {isManager && (
                          <Button size="sm" variant="link" className="p-1 text-danger" title="Delete this register" onClick={() => removeSession(s)}>
                            <FiTrash2 />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && sessions.length === 0 && (
                    <tr><td colSpan="10" className="text-center py-5 text-muted">
                      No registers yet{filters.from || filters.to || filters.unit_id || filters.type ? ' for these filters' : ''}. Use <strong>Take a register</strong> at your next meeting.
                    </td></tr>
                  )}
                </tbody>
              </Table>
            </div>
            {loading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
            {!loading && sessions.length < total && (
              <div className="text-center py-3 border-top">
                <Button size="sm" variant="outline-primary" onClick={() => loadSessions(page + 1)}>Show more ({total - sessions.length} older)</Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mop-card mop-card-static p-3 mb-3">
            <Row className="g-2 align-items-end">
              <Col md={2} sm={6}>
                <Form.Label className="small fw-semibold">From</Form.Label>
                <Form.Control size="sm" type="date" value={range.from} max={today()} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
              </Col>
              <Col md={2} sm={6}>
                <Form.Label className="small fw-semibold">To</Form.Label>
                <Form.Control size="sm" type="date" value={range.to} max={today()} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
              </Col>
              <Col md={3} sm={6}>
                <Form.Label className="small fw-semibold">Unit</Form.Label>
                <Form.Select size="sm" value={range.unit_id} onChange={e => setRange(r => ({ ...r, unit_id: e.target.value }))}>
                  <option value="">All units</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={3} sm={6}>
                <InputGroup size="sm">
                  <InputGroup.Text><FiSearch /></InputGroup.Text>
                  <Form.Control placeholder="Find a member" value={search} onChange={e => setSearch(e.target.value)} />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Button size="sm" variant="outline-primary" className="w-100" onClick={exportMembers}><FiDownload className="me-1" />Export</Button>
              </Col>
            </Row>
            <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
              <Form.Check type="switch" id="only-attention" className="small" checked={onlyAttention} onChange={e => setOnlyAttention(e.target.checked)}
                label={<span><FiAlertTriangle className="text-danger me-1" />Only members who missed 3 or more in a row</span>} />
              <span className="small text-muted ms-md-auto">{RATE_HELP}</span>
            </div>
          </div>

          {summaryNote && <div className="alert alert-warning small">{summaryNote}</div>}

          <div className="mop-card mop-card-static">
            <div className="table-responsive">
              <Table className="mop-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Unit</th>
                    <th className="text-center">Present</th>
                    <th className="text-center">Late</th>
                    <th className="text-center">Absent</th>
                    <th className="text-center">Excused</th>
                    <th>Rate</th>
                    <th className="text-center" title="Registers missed in a row, counting back from the latest">In a row</th>
                    <th>Last attended</th>
                  </tr>
                </thead>
                <tbody>
                  {shownMembers.map(m => (
                    <tr key={m.member_id} className={m.needs_attention ? 'att-attention' : ''}>
                      <td className="fw-semibold">
                        {isManager ? <Link to={`/dashboard/members/${m.member_id}`}>{m.member_name}</Link> : m.member_name}
                        {m.member_code && <div className="small text-muted fw-normal">{m.member_code}</div>}
                      </td>
                      <td>{m.unit_name || <span className="text-muted">No unit</span>}</td>
                      <td className="text-center">{m.present}</td>
                      <td className="text-center">{m.late}</td>
                      <td className="text-center">{m.absent}</td>
                      <td className="text-center">{m.excused}</td>
                      <td><RateBar rate={m.rate} width={60} /></td>
                      <td className="text-center">
                        {m.missed_in_a_row > 0
                          ? <Badge bg={m.needs_attention ? 'danger' : 'light'} text={m.needs_attention ? undefined : 'dark'}>{m.missed_in_a_row}</Badge>
                          : <span className="text-muted">0</span>}
                      </td>
                      <td className="small">{m.last_attended ? formatDate(m.last_attended) : <span className="text-muted">Never</span>}</td>
                    </tr>
                  ))}
                  {!summaryLoading && shownMembers.length === 0 && (
                    <tr><td colSpan="9" className="text-center py-5 text-muted">
                      {onlyAttention ? 'Nobody has missed 3 registers in a row. 🎉' : 'No members to show.'}
                    </td></tr>
                  )}
                </tbody>
              </Table>
            </div>
            {summaryLoading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
          </div>
        </>
      )}
    </div>
  )
}
