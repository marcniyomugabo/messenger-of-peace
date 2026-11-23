import { useState, useEffect } from 'react'
import { Table, Badge, Button, Modal, Form, Row, Col, Alert } from 'react-bootstrap'
import { FiShield, FiAlertTriangle, FiEye } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

// Safeguarding reports from "Report a Concern". Only the super admin, chief and discipline officer
// can open this page; every report opened is recorded in the audit log.
const STATUSES = ['New', 'Being handled', 'Closed']
const STATUS_COLOR = { New: 'danger', 'Being handled': 'warning', Closed: 'secondary' }
const when = d => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-')

export default function ConcernsPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)
  const [status, setStatus] = useState('New')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/concerns')
      setList(res.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load reports')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const show = async (id) => {
    try {
      const res = await api.get(`/concerns/${id}`)
      setOpen(res.data.data)
      setStatus(res.data.data.status)
      setNotes(res.data.data.handler_notes || '')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open the report')
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/concerns/${open.id}`, { status, handler_notes: notes })
      toast.success('Saved')
      setOpen(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const waiting = list.filter(c => c.status === 'New').length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0"><FiShield className="me-2" /> Concerns (safeguarding)</h4>
        {waiting > 0 && <Badge bg="danger" className="fs-6">{waiting} new</Badge>}
      </div>
      <p className="text-muted small mb-4">
        Reports sent through "Report a Concern" on the website. Confidential: only the super admin, the chief and the
        discipline officer see this page. Each report you open is recorded in the audit log. Reports cannot be deleted.
      </p>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr><th>Reference</th><th>About</th><th>Received</th><th>Reporter</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id}>
                  <td className="fw-semibold">
                    {c.reference}
                    {c.child_in_danger ? <Badge bg="danger" className="ms-2"><FiAlertTriangle className="me-1" />Urgent</Badge> : null}
                  </td>
                  <td>{c.category}</td>
                  <td className="small">{when(c.created_at)}</td>
                  <td className="small">{c.is_anonymous ? 'Anonymous' : 'Named'}</td>
                  <td><Badge bg={STATUS_COLOR[c.status] || 'secondary'}>{c.status}</Badge></td>
                  <td><Button size="sm" variant="outline-primary" onClick={() => show(c.id)}><FiEye className="me-1" />Open</Button></td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">{loading ? 'Loading...' : 'No reports.'}</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={!!open} onHide={() => setOpen(null)} size="lg" centered>
        {open && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{open.reference} · {open.category}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {open.child_in_danger ? <Alert variant="danger" className="py-2"><FiAlertTriangle className="me-1" /> Marked urgent: a child may be in danger.</Alert> : null}
              <Row className="g-2 small mb-3">
                <Col sm={6}><strong>Received:</strong> {when(open.created_at)}</Col>
                <Col sm={6}><strong>When it happened:</strong> {open.happened_on || '-'}</Col>
                <Col sm={6}><strong>Where:</strong> {open.location || '-'}</Col>
                <Col sm={6}><strong>Reporter:</strong> {open.is_anonymous ? 'Anonymous' : [open.reporter_name, open.reporter_relation].filter(Boolean).join(', ') || '-'}</Col>
                {!open.is_anonymous && <Col sm={12}><strong>Contact:</strong> {open.reporter_contact || '-'}</Col>}
              </Row>
              <h6>What happened</h6>
              <div className="p-3 rounded mb-3" style={{ background: '#F9FAFB', whiteSpace: 'pre-wrap' }}>{open.description}</div>
              {open.people_involved && (
                <>
                  <h6>People involved</h6>
                  <div className="p-3 rounded mb-3" style={{ background: '#F9FAFB', whiteSpace: 'pre-wrap' }}>{open.people_involved}</div>
                </>
              )}
              <hr />
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </Form.Select>
                  {open.handled_by_email && <small className="text-muted d-block mt-1">Last updated by {open.handled_by_email}</small>}
                </Col>
                <Col md={8}>
                  <Form.Label>Private notes (what was done)</Form.Label>
                  <Form.Control as="textarea" rows={4} value={notes} onChange={e => setNotes(e.target.value)} maxLength={10000} />
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>
              <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  )
}
