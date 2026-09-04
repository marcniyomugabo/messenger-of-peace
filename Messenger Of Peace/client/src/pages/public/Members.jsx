import { useState, useEffect } from 'react'
import { Container, Row, Col, Form, Spinner, Alert } from 'react-bootstrap'
import { FiUsers } from 'react-icons/fi'
import api from '../../services/api'

export default function Members() {
  const [members, setMembers] = useState([])
  const [units, setUnits] = useState([])
  const [unitFilter, setUnitFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, unitsRes] = await Promise.all([
          api.get('/members').catch(() => null),
          api.get('/units').catch(() => null),
        ])
        const m = membersRes?.data?.data?.members || membersRes?.data?.members || []
        const u = unitsRes?.data?.data || unitsRes?.data || []
        setMembers(m)
        setUnits(Array.isArray(u) ? u : [])
      } catch {
        setError('Unable to load members at this time.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = members.filter(m => {
    if (unitFilter && String(m.unit_id) !== String(unitFilter) && m.unit_name !== unitFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!((m.first_name || '') + ' ' + (m.last_name || '')).toLowerCase().includes(s)) return false
    }
    return true
  })

  const initials = (m) =>
    ((m.first_name || '')[0] || '') + ((m.last_name || '')[0] || '')

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg6.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
              <FiUsers className="me-2" /> Our Members
            </h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              The young peace messengers making a difference in our community
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          <Row className="g-3 mb-4">
            <Col md={5}>
              <Form.Control
                placeholder="Search member name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
                <option value="">All Units</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : error ? (
            <Alert variant="warning" className="text-center">{error}</Alert>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted py-5">No published members found.</p>
          ) : (
            <Row className="g-4">
              {filtered.map(member => (
                <Col lg={3} md={4} sm={6} key={member.id}>
                  <div className="leader-card h-100 text-center">
                    <div className="leader-avatar" style={{ background: 'var(--mop-primary)' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.6rem' }}>
                        {initials(member)}
                      </span>
                    </div>
                    <h5 className="mb-0" style={{ color: 'var(--mop-primary)' }}>
                      {member.first_name} {member.last_name}
                    </h5>
                    {member.unit_name && (
                      <span className="badge badge-mop my-2">{member.unit_name}</span>
                    )}
                    {member.leadership_position && (
                      <p className="small text-muted mb-0">{member.leadership_position}</p>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    </div>
  )
}
