import { useState } from 'react'
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap'
import { FiShield, FiAlertTriangle, FiCheckCircle, FiLock } from 'react-icons/fi'
import api from '../../services/api'

// Public safeguarding form. Reports go only to the people who handle safeguarding.
const CATEGORIES = ['Child safety', 'Abuse', 'Harassment', 'Bullying', 'Fraud or theft', 'Misconduct', 'Safety risk', 'Other']
const EMPTY = {
  category: '', description: '', happened_on: '', location: '', people_involved: '', child_in_danger: false,
  anonymous: true, reporter_name: '', reporter_contact: '', reporter_relation: '',
}

export default function ReportConcern() {
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')

  const set = (name, value) => setForm(f => ({ ...f, [name]: value }))
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    set(name, type === 'checkbox' ? checked : value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const res = await api.post('/concerns', form)
      setReference(res.data.data.reference)
      setForm(EMPTY)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.response?.data?.message || 'The report could not be sent. Please try again or call a group leader.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '3.5rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg4.jpeg')" }}></div>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Report a Concern</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 640, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Every young person has the right to be safe. Tell us about anything that worries you.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8}>
              <Alert variant="danger" className="d-flex gap-2 align-items-start">
                <FiAlertTriangle className="flex-shrink-0 mt-1" />
                <div>
                  <strong>Is someone in danger right now?</strong> Call the police on <a href="tel:112" className="alert-link">112</a> first,
                  then tell a group leader. This form is read during the day, not instantly.
                </div>
              </Alert>

              {reference && (
                <Alert variant="success" className="d-flex gap-2 align-items-start">
                  <FiCheckCircle className="flex-shrink-0 mt-1" />
                  <div>
                    <strong>Thank you. Your report has been received.</strong> Only the people responsible for safeguarding can read it.
                    Your reference is <strong>{reference}</strong>: keep it if you want to talk about this report later.
                  </div>
                </Alert>
              )}

              <div className="mop-card p-4">
                <p className="text-muted small d-flex gap-2 align-items-start">
                  <FiLock className="flex-shrink-0 mt-1" />
                  <span>
                    Reports are confidential: only the group chief and the discipline officer can read them. You can stay anonymous.
                    You can report child-protection concerns, abuse, harassment, bullying, fraud, misconduct or anything unsafe.
                  </span>
                </p>

                {error && <Alert variant="danger" className="small">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">What is the concern about? *</Form.Label>
                    <Form.Select name="category" value={form.category} onChange={handleChange} required>
                      <option value="">Choose one</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">What happened? *</Form.Label>
                    <Form.Control as="textarea" rows={6} name="description" value={form.description} onChange={handleChange}
                      required minLength={20} maxLength={5000} placeholder="Describe what happened, in your own words." />
                  </Form.Group>

                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>When did it happen?</Form.Label>
                        <Form.Control name="happened_on" value={form.happened_on} onChange={handleChange} maxLength={100} placeholder="e.g. last Sunday, 10 November" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Where?</Form.Label>
                        <Form.Control name="location" value={form.location} onChange={handleChange} maxLength={255} placeholder="e.g. at the meeting, at camp, online" />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Who was involved? (if you know)</Form.Label>
                    <Form.Control as="textarea" rows={2} name="people_involved" value={form.people_involved} onChange={handleChange} maxLength={2000} />
                  </Form.Group>

                  <Form.Check className="mb-4" type="checkbox" id="child_in_danger" name="child_in_danger"
                    checked={form.child_in_danger} onChange={handleChange}
                    label="A child may be in danger now (the report is marked urgent)" />

                  <div className="p-3 rounded mb-4" style={{ background: 'var(--mop-light)' }}>
                    <Form.Check type="switch" id="anonymous" name="anonymous" checked={form.anonymous} onChange={handleChange}
                      label={<span className="fw-semibold"><FiShield className="me-1" /> Stay anonymous</span>} />
                    {!form.anonymous && (
                      <Row className="g-3 mt-1">
                        <Col md={4}>
                          <Form.Label className="small">Your name</Form.Label>
                          <Form.Control name="reporter_name" value={form.reporter_name} onChange={handleChange} maxLength={150} />
                        </Col>
                        <Col md={4}>
                          <Form.Label className="small">Phone or email</Form.Label>
                          <Form.Control name="reporter_contact" value={form.reporter_contact} onChange={handleChange} maxLength={150} />
                        </Col>
                        <Col md={4}>
                          <Form.Label className="small">You are</Form.Label>
                          <Form.Select name="reporter_relation" value={form.reporter_relation} onChange={handleChange}>
                            <option value="">Choose</option>
                            <option>A scout</option>
                            <option>A parent or guardian</option>
                            <option>A leader</option>
                            <option>Someone else</option>
                          </Form.Select>
                        </Col>
                        <Col xs={12}><small className="text-muted">Giving a contact lets us ask you questions or tell you what was done.</small></Col>
                      </Row>
                    )}
                  </div>

                  <div className="d-grid">
                    <Button type="submit" variant="primary" size="lg" disabled={sending}>
                      {sending ? 'Sending...' : 'Send the report'}
                    </Button>
                  </div>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  )
}
