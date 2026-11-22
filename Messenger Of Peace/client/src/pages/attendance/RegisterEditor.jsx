import { useState, useEffect, useMemo, useRef } from 'react'
import { Row, Col, Form, Button, Spinner, Alert, InputGroup } from 'react-bootstrap'
import { FiArrowLeft, FiCheck, FiSearch, FiTrash2, FiDownload, FiCheckCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { today } from '../../utils/date'
import { SESSION_TYPES, formatDate, rateOf, RATE_HELP, downloadAttendanceCsv } from '../../utils/attendance'
import { MarkButtons, RateBar } from '../../components/attendance/AttendanceBits'

const NEEDS_REASON = ['Late', 'Excused', 'Absent']

// Take a new register (sessionId = null) or open an existing one.
// units: [{ id, name }] the person may choose from; wholeGroup: may take whole-group registers.
export default function RegisterEditor({ sessionId, units, wholeGroup, canDelete, onClose, onOpen }) {
  const isNew = !sessionId
  const [details, setDetails] = useState({
    session_date: today(),
    session_type: 'Weekly meeting',
    unit_id: wholeGroup ? 'group' : (units[0]?.id ? String(units[0].id) : ''),
    event_id: '',
    title: '',
    notes: '',
  })
  const [roster, setRoster] = useState([])
  const [session, setSession] = useState(null)
  const [canEdit, setCanEdit] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyUnmarked, setOnlyUnmarked] = useState(false)
  const [events, setEvents] = useState([])
  const dirty = useRef(false)

  const unitParam = details.unit_id === 'group' || details.unit_id === '' ? null : Number(details.unit_id)

  // Events near the chosen date, to link the register to one (optional).
  useEffect(() => {
    api.get('/events').then(res => {
      const d = res.data.data
      setEvents(Array.isArray(d) ? d : (d?.events || []))
    }).catch(() => setEvents([]))
  }, [])

  // An existing register: load it once.
  useEffect(() => {
    if (isNew) return
    setLoading(true)
    api.get(`/attendance/sessions/${sessionId}`).then(res => {
      const { session: s, records, can_edit } = res.data.data
      setSession(s)
      setCanEdit(can_edit)
      setDetails({
        session_date: s.session_date, session_type: s.session_type,
        unit_id: s.unit_id == null ? 'group' : String(s.unit_id),
        event_id: s.event_id ? String(s.event_id) : '', title: s.title || '', notes: s.notes || '',
      })
      setRoster(records.map(r => ({
        member_id: r.member_id, name: `${r.first_name} ${r.last_name}`, code: r.member_code, unit_name: r.unit_name,
        status: r.status, reason: r.reason || '',
      })))
      setError('')
    }).catch(err => setError(err.response?.data?.message || 'Could not open this register.'))
      .finally(() => setLoading(false))
  }, [isNew, sessionId])

  // A new register: (re)load who must be marked when the date or unit changes, keeping marks already made.
  useEffect(() => {
    if (!isNew) return
    if (details.unit_id === '') { setLoading(false); setRoster([]); return }
    if (!details.session_date) return
    setLoading(true)
    api.get('/attendance/roster', { params: { date: details.session_date, unit_id: unitParam || undefined } })
      .then(res => {
        setRoster(prev => {
          const kept = new Map(prev.map(r => [r.member_id, r]))
          return res.data.data.members.map(m => ({
            member_id: m.id, name: `${m.first_name} ${m.last_name}`, code: m.member_code, unit_name: m.unit_name,
            status: kept.get(m.id)?.status || null, reason: kept.get(m.id)?.reason || '',
          }))
        })
        setError('')
      })
      .catch(err => { setRoster([]); setError(err.response?.data?.message || 'Could not load the members.') })
      .finally(() => setLoading(false))
  }, [isNew, details.session_date, details.unit_id])

  const setField = (field, value) => { dirty.current = true; setDetails(d => ({ ...d, [field]: value })) }
  const mark = (id, status) => {
    dirty.current = true
    setRoster(rs => rs.map(r => (r.member_id === id ? { ...r, status, reason: NEEDS_REASON.includes(status) ? r.reason : '' } : r)))
  }
  const setReason = (id, reason) => { dirty.current = true; setRoster(rs => rs.map(r => (r.member_id === id ? { ...r, reason } : r))) }
  const markRestPresent = () => { dirty.current = true; setRoster(rs => rs.map(r => (r.status ? r : { ...r, status: 'Present' }))) }
  const clearAll = () => { dirty.current = true; setRoster(rs => rs.map(r => ({ ...r, status: null, reason: '' }))) }

  const counts = useMemo(() => {
    const c = { Present: 0, Late: 0, Absent: 0, Excused: 0, unmarked: 0 }
    roster.forEach(r => { if (r.status) c[r.status]++; else c.unmarked++ })
    return c
  }, [roster])
  const rate = rateOf({ present: counts.Present, late: counts.Late, absent: counts.Absent })

  const shown = roster.filter(r =>
    (!onlyUnmarked || !r.status) &&
    (!search.trim() || `${r.name} ${r.code || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  )

  const nearbyEvents = useMemo(() => {
    const d = new Date(details.session_date)
    return events.filter(e => {
      const start = new Date(String(e.start_date).slice(0, 10))
      return Math.abs(start - d) <= 3 * 86400000
    })
  }, [events, details.session_date])

  const close = () => {
    if (dirty.current && canEdit && !window.confirm('Leave without saving? The marks you made will be lost.')) return
    onClose()
  }

  const save = async () => {
    if (counts.unmarked > 0) {
      toast.error(`${counts.unmarked} member(s) are not marked yet.`)
      setOnlyUnmarked(true)
      return
    }
    setSaving(true)
    const payload = {
      ...details,
      unit_id: unitParam,
      event_id: details.event_id || null,
      records: roster.map(r => ({ member_id: r.member_id, status: r.status, reason: NEEDS_REASON.includes(r.status) ? r.reason : '' })),
    }
    try {
      const res = isNew ? await api.post('/attendance/sessions', payload) : await api.put(`/attendance/sessions/${sessionId}`, payload)
      dirty.current = false
      toast.success(isNew ? 'Register saved' : 'Register updated')
      onClose(res.data.data?.id)
    } catch (err) {
      const existing = err.response?.status === 409 && err.response.data?.data?.session_id
      if (existing) {
        if (window.confirm(`${err.response.data.message}\n\nOpen the existing register now? (Your marks here will not be saved.)`)) {
          dirty.current = false
          onOpen(existing)
        }
      } else {
        toast.error(err.response?.data?.message || 'Could not save the register.')
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the register of ${formatDate(details.session_date)}?\n\nAll ${roster.length} marks on it are removed. This cannot be undone.`)) return
    try {
      await api.delete(`/attendance/sessions/${sessionId}`)
      dirty.current = false
      toast.success('Register deleted')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the register.')
    }
  }

  const unitLabel = details.unit_id === 'group' ? 'Whole group' : (units.find(u => String(u.id) === details.unit_id)?.name || session?.unit_name || '')

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Button variant="link" className="p-0 text-decoration-none" onClick={close}><FiArrowLeft className="me-1" />Registers</Button>
        </div>
        <div className="d-flex gap-2">
          {!isNew && (
            <Button variant="outline-secondary" size="sm" onClick={() => downloadAttendanceCsv({ session_id: sessionId }).catch(() => toast.error('Could not export'))}>
              <FiDownload className="me-1" />Export
            </Button>
          )}
          {!isNew && canDelete && (
            <Button variant="outline-danger" size="sm" onClick={remove}><FiTrash2 className="me-1" />Delete</Button>
          )}
        </div>
      </div>

      <h4 className="mb-1">{isNew ? 'Take a register' : `Register: ${formatDate(details.session_date)}`}</h4>
      <p className="text-muted small mb-4">
        {isNew ? 'Choose the date and unit, then mark every member. ' : (canEdit ? 'Change any mark and save. ' : 'You can view this register; only leaders of the whole group can change it. ')}
        {session?.recorded_by_name && <>Last saved by <strong>{session.recorded_by_name}</strong>.</>}
      </p>

      {/* Details */}
      <div className="mop-card mop-card-static p-3 p-md-4 mb-3">
        <Row className="g-3">
          <Col md={3} sm={6}>
            <Form.Label className="fw-semibold small">Date *</Form.Label>
            <Form.Control type="date" value={details.session_date} max={today()} disabled={!canEdit}
              onChange={e => setField('session_date', e.target.value)} />
          </Col>
          <Col md={3} sm={6}>
            <Form.Label className="fw-semibold small">Type *</Form.Label>
            <Form.Select value={details.session_type} disabled={!canEdit} onChange={e => setField('session_type', e.target.value)}>
              {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
            </Form.Select>
          </Col>
          <Col md={3} sm={6}>
            <Form.Label className="fw-semibold small">For *</Form.Label>
            {isNew ? (
              <Form.Select value={details.unit_id} onChange={e => setField('unit_id', e.target.value)}>
                {wholeGroup && <option value="group">Whole group</option>}
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                {!wholeGroup && units.length === 0 && <option value="">No unit linked to your account</option>}
              </Form.Select>
            ) : (
              <Form.Control value={unitLabel} disabled title="The unit of a register cannot be changed" />
            )}
          </Col>
          <Col md={3} sm={6}>
            <Form.Label className="fw-semibold small">Event</Form.Label>
            <Form.Select value={details.event_id} disabled={!canEdit} onChange={e => setField('event_id', e.target.value)}>
              <option value="">{nearbyEvents.length ? 'Not linked to an event' : 'No events near this date'}</option>
              {nearbyEvents.map(e => <option key={e.id} value={e.id}>{e.title} ({String(e.start_date).slice(0, 10)})</option>)}
              {details.event_id && !nearbyEvents.some(e => String(e.id) === details.event_id) && (
                <option value={details.event_id}>{session?.event_title || 'Linked event'}</option>
              )}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label className="fw-semibold small">Title</Form.Label>
            <Form.Control value={details.title} maxLength={150} disabled={!canEdit} placeholder="e.g. Knots and first aid"
              onChange={e => setField('title', e.target.value)} />
          </Col>
          <Col md={6}>
            <Form.Label className="fw-semibold small">Notes</Form.Label>
            <Form.Control value={details.notes} maxLength={2000} disabled={!canEdit} placeholder="Anything worth remembering about this meeting"
              onChange={e => setField('notes', e.target.value)} />
          </Col>
        </Row>
      </div>

      {error && <Alert variant="warning">{error}</Alert>}

      {/* Counters and tools */}
      <div className="att-toolbar mop-card mop-card-static p-3 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <span className="att-count" style={{ color: 'var(--mop-success)' }}><strong>{counts.Present}</strong> present</span>
          <span className="att-count" style={{ color: '#B45309' }}><strong>{counts.Late}</strong> late</span>
          <span className="att-count" style={{ color: 'var(--mop-danger)' }}><strong>{counts.Absent}</strong> absent</span>
          <span className="att-count" style={{ color: '#2563EB' }}><strong>{counts.Excused}</strong> excused</span>
          <span className={`att-count ${counts.unmarked ? 'fw-bold' : 'text-muted'}`}><strong>{counts.unmarked}</strong> not marked</span>
          <span className="ms-md-auto" title={RATE_HELP}><RateBar rate={rate} /></span>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <InputGroup size="sm" style={{ maxWidth: 260 }}>
            <InputGroup.Text><FiSearch /></InputGroup.Text>
            <Form.Control placeholder="Find a member" value={search} onChange={e => setSearch(e.target.value)} />
          </InputGroup>
          <Form.Check type="switch" id="only-unmarked" label="Only not marked" checked={onlyUnmarked} onChange={e => setOnlyUnmarked(e.target.checked)} className="small" />
          {canEdit && (
            <div className="ms-md-auto d-flex gap-2">
              <Button size="sm" variant="outline-success" onClick={markRestPresent} disabled={!counts.unmarked}>
                <FiCheckCircle className="me-1" />Mark the rest present
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={clearAll} disabled={counts.unmarked === roster.length}>Clear</Button>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="mop-card mop-card-static mb-3">
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" size="sm" className="me-2" />Loading members…</div>
        ) : roster.length === 0 ? (
          <div className="text-center text-muted py-5">No active members are expected on this register.</div>
        ) : shown.length === 0 ? (
          <div className="text-center text-muted py-4">{onlyUnmarked ? 'Everyone is marked.' : 'No member matches your search.'}</div>
        ) : shown.map(r => (
          <div key={r.member_id} className={`att-row ${r.status ? '' : 'unmarked'}`}>
            <div className="att-member">
              <div className="fw-semibold">{r.name}</div>
              <div className="text-muted small">{[r.code, details.unit_id === 'group' ? r.unit_name : null].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="att-controls">
              <MarkButtons value={r.status} onChange={v => mark(r.member_id, v)} disabled={!canEdit} name={r.name} />
              {NEEDS_REASON.includes(r.status) && (
                <Form.Control size="sm" className="att-reason" value={r.reason} maxLength={500} disabled={!canEdit}
                  placeholder={r.status === 'Late' ? 'Why late? (optional)' : r.status === 'Excused' ? 'Reason given (optional)' : 'Reason, if known (optional)'}
                  onChange={e => setReason(r.member_id, e.target.value)} />
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="att-savebar">
          <span className="small text-muted">
            {counts.unmarked ? `${counts.unmarked} member(s) still to mark` : `All ${roster.length} members marked`}
          </span>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving || roster.length === 0 || details.unit_id === ''}>
              {saving ? <Spinner animation="border" size="sm" className="me-1" /> : <FiCheck className="me-1" />}
              {isNew ? 'Save register' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
