import { useState, useEffect } from 'react'
import { Container, Table, Button, Form, Row, Col, Badge, Modal } from 'react-bootstrap'
import { FiPlus, FiCheck, FiX } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function AttendanceManagement() {
  const [records, setRecords] = useState([])
  const [members, setMembers] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState([])

  useEffect(() => {
    fetchRecords()
  }, [selectedDate])

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchRecords = async () => {
    try {
      const res = await api.get(`/attendance?date_from=${selectedDate}&date_to=${selectedDate}`)
      setRecords(res.data.data || [])
    } catch {
      setRecords([])
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await api.get('/members')
      setMembers(res.data.data?.members || [])
    } catch {
      setMembers([])
    }
  }

  const toggleMember = (memberId) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.member_id === memberId)
      if (exists) return prev.filter(m => m.member_id !== memberId)
      return [...prev, { member_id: memberId, status: 'Present' }]
    })
  }

  const updateMemberStatus = (memberId, status) => {
    setSelectedMembers(prev =>
      prev.map(m => m.member_id === memberId ? { ...m, status } : m)
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedMembers.length === 0) {
      toast.warning('Please select at least one member')
      return
    }
    try {
      await api.post('/attendance', {
        meeting_date: selectedDate,
        records: selectedMembers,
      })
      toast.success('Attendance recorded')
      setShowModal(false)
      setSelectedMembers([])
      fetchRecords()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record attendance')
    }
  }

  const statusBadge = (status) => {
    const map = { Present: 'success', Absent: 'danger', Late: 'warning', Excused: 'info' }
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>
  }

  const presentCount = records.filter(r => r.status === 'Present').length
  const absentCount = records.filter(r => r.status === 'Absent').length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Attendance Management</h4>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <FiPlus className="me-1" /> Record Attendance
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{records.length}</div>
            <div className="kpi-label">Total Records</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{presentCount}</div>
            <div className="kpi-label">Present</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#581C87' }}>
            <div className="kpi-value" style={{ color: '#581C87' }}>{absentCount}</div>
            <div className="kpi-label">Absent</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card mb-4">
        <div className="card-body">
          <Row className="align-items-center g-3">
            <Col md={3}>
              <Form.Label className="fw-bold">Select Date</Form.Label>
              <Form.Control
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </Col>
          </Row>
        </div>
      </div>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, idx) => (
                <tr key={rec.id}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{rec.member_name}</td>
                  <td><Badge bg="primary">{rec.unit_name || '-'}</Badge></td>
                  <td>{statusBadge(rec.status)}</td>
                  <td>{rec.event_title || '-'}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4 text-muted">No attendance records for this date</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Record Attendance - {selectedDate}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <p className="text-muted small mb-3">Select members and set their attendance status:</p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {members.map(m => {
                const selected = selectedMembers.find(s => s.member_id === m.id)
                return (
                  <div key={m.id} className="d-flex align-items-center gap-3 p-2 border-bottom">
                    <Form.Check
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleMember(m.id)}
                    />
                    <div className="flex-grow-1">
                      <span className="fw-semibold">{m.first_name} {m.last_name}</span>
                      <small className="text-muted ms-2">({m.unit_name || 'No unit'})</small>
                    </div>
                    {selected && (
                      <Form.Select
                        size="sm"
                        style={{ width: 130 }}
                        value={selected.status}
                        onChange={(e) => updateMemberStatus(m.id, e.target.value)}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                        <option value="Excused">Excused</option>
                      </Form.Select>
                    )}
                  </div>
                )
              })}
              {members.length === 0 && (
                <p className="text-center text-muted py-3">No members found</p>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-muted small mt-2">{selectedMembers.length} member(s) selected</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedMembers([]) }}>Cancel</Button>
            <Button type="submit" variant="primary">Save Attendance</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
