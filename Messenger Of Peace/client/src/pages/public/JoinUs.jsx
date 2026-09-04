import { useState, useMemo } from 'react'
import { Container, Row, Col, Form, Button, Alert, Collapse } from 'react-bootstrap'
import { toast } from 'react-toastify'
import { FiUser, FiMapPin, FiPhone, FiBook, FiBriefcase, FiHeart, FiCheck, FiUsers, FiShield } from 'react-icons/fi'
import api from '../../services/api'

const UNITS = [
  { id: 'abatoni', name: 'Abatoni', english: 'Cub Scouts', ageRange: '6–12 years', minAge: 6, maxAge: 12, color: '#6B21A8', bg: '#F3E8FF', icon: '🏕️' },
  { id: 'inkesha', name: 'Inkesha', english: 'Scouts', ageRange: '13–16 years', minAge: 13, maxAge: 16, color: '#1D4ED8', bg: '#DBEAFE', icon: '🧭' },
  { id: 'abahizi', name: 'Abahizi', english: 'Companions', ageRange: '17–20 years', minAge: 17, maxAge: 20, color: '#15803D', bg: '#DCFCE7', icon: '🤝' },
  { id: 'ingenzi', name: 'Ingenzi', english: 'Rovers', ageRange: '21–25 years', minAge: 21, maxAge: 25, color: '#6B21A8', bg: '#F3E8FF', icon: '🌟' },
]

function SectionHeader({ icon: Icon, title, step, color = '#6B21A8' }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-3 pb-2" style={{ borderBottom: `2px solid ${color}30` }}>
      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, background: color, color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>
        {step}
      </div>
      <Icon style={{ color }} />
      <h6 className="mb-0 fw-bold" style={{ color }}>{title}</h6>
    </div>
  )
}

function UnitInfo({ unit }) {
  if (!unit) return null
  return (
    <div className="mb-3 p-3 rounded-4" style={{ background: unit.bg, border: `2px solid ${unit.color}` }}>
      <div className="d-flex align-items-center gap-3">
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: unit.color, color: '#fff', fontSize: '1.3rem' }}>
          {unit.icon}
        </div>
        <div>
          <h6 className="mb-0 fw-bold" style={{ color: unit.color }}>{unit.name}</h6>
          <small style={{ color: unit.color }}>{unit.english} &middot; Ages {unit.ageRange}</small>
        </div>
      </div>
    </div>
  )
}

export default function JoinUs() {
  const [form, setForm] = useState({
    firstName: '', secondName: '', phone: '', location: '', district: '', sector: '', cell: '',
    unit: '',
    studying: '',
    schoolName: '', schoolLocation: '',
    hasJob: '',
    job: '', company: '', currentActivity: '',
    parentFirstName: '', parentSecondName: '', parentPhone: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [appCode, setAppCode] = useState('')
  const [validated, setValidated] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const selectedUnit = useMemo(() => UNITS.find(u => u.id === form.unit), [form.unit])
  const unitColor = selectedUnit?.color || '#6B21A8'

  const validatePhone = (value) => {
    const cleaned = value.replace(/[\s\-()]/g, '')
    const rwRegex = /^(\+2507\d{8}|07\d{8})$/
    if (!rwRegex.test(cleaned)) {
      setPhoneError('Please enter a valid Rwanda phone number (e.g. +250 7XX XXX XXX)')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const newForm = { ...form, [name]: value }

    if (name === 'unit') {
      newForm.studying = ''
      newForm.schoolName = ''
      newForm.schoolLocation = ''
      newForm.hasJob = ''
      newForm.job = ''
      newForm.company = ''
      newForm.currentActivity = ''
    }

    if (name === 'studying') {
      newForm.schoolName = ''
      newForm.schoolLocation = ''
      newForm.hasJob = ''
      newForm.job = ''
      newForm.company = ''
      newForm.currentActivity = ''
    }

    if (name === 'hasJob') {
      newForm.job = ''
      newForm.company = ''
      newForm.currentActivity = ''
    }

    if (name === 'phone' || name === 'parentPhone') {
      setPhoneError('')
    }

    setForm(newForm)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formEl = e.currentTarget
    if (formEl.checkValidity() === false) {
      e.stopPropagation()
      setValidated(true)
      return
    }

    if (!validatePhone(form.phone)) {
      e.stopPropagation()
      setValidated(true)
      return
    }
    if (form.parentPhone && !validatePhone(form.parentPhone)) {
      e.stopPropagation()
      setValidated(true)
      return
    }

    setLoading(true)
    try {
      const payload = {
        first_name: form.firstName,
        second_name: form.secondName,
        phone: form.phone,
        location: form.location,
        district: form.district,
        sector: form.sector,
        cell: form.cell,
        unit: form.unit,
        studying: form.studying === 'yes' ? 1 : 0,
        school_name: form.studying === 'yes' ? form.schoolName : null,
        school_location: form.studying === 'yes' ? form.schoolLocation : null,
        has_job: form.studying === 'no' ? (form.hasJob === 'yes' ? 1 : 0) : null,
        job: form.studying === 'no' && form.hasJob === 'yes' ? form.job : null,
        company: form.studying === 'no' && form.hasJob === 'yes' ? form.company : null,
        current_activity: form.studying === 'no' && form.hasJob === 'no' ? form.currentActivity : null,
        parent_first_name: form.parentFirstName,
        parent_second_name: form.parentSecondName,
        parent_phone: form.parentPhone,
      }
      const res = await api.post('/member-applications', payload)
      setAppCode(res.data.data?.application_code || '')
      setSubmitted(true)
      toast.success('Application submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg5.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg2.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg6.jpeg')" }}></div>
        </div>
        <div className="hero-particles"><span></span><span></span><span></span><span></span><span></span></div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Join Us</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Become part of Messengers of Peace and start your scouting journey
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5" style={{ background: '#f8f5ff' }}>
        <Container>
          <Row className="justify-content-center">
            <Col lg={8}>
              {submitted ? (
                <Alert variant="success" className="text-center p-5 rounded-4 border-0 shadow">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 72, height: 72, background: '#16a34a15' }}>
                    <FiCheck size={36} style={{ color: '#16a34a' }} />
                  </div>
                  <h3 className="mb-2">Application Submitted!</h3>
                  {appCode && <p className="mb-2"><strong>Reference:</strong> <code className="fs-5">{appCode}</code></p>}
                  <p className="mb-0">Your membership application has been submitted successfully. Our team will review your application and contact you.</p>
                </Alert>
              ) : (
                <div className="card shadow border-0 rounded-4 overflow-hidden">
                  <div className="py-4 px-4" style={{ background: 'linear-gradient(135deg, #3B0764, #6B21A8)' }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)' }}>
                        <FiShield size={24} className="text-white" />
                      </div>
                      <div>
                        <h4 className="mb-0 text-white fw-bold">Registration Form</h4>
                        <small className="text-white-50">Join Messengers of Peace Scout Group</small>
                      </div>
                    </div>
                  </div>

                  <div className="card-body p-4 p-md-5">
                    <Form noValidate validated={validated} onSubmit={handleSubmit}>

                      {/* SECTION 1: Personal Information */}
                      <SectionHeader icon={FiUser} title="Personal Information" step={1} color={unitColor} />
                      <Row className="g-3 mb-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">First Name *</Form.Label>
                            <Form.Control name="firstName" value={form.firstName} onChange={handleChange} required placeholder="Enter first name" />
                            <Form.Control.Feedback type="invalid">First name is required.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Second Name *</Form.Label>
                            <Form.Control name="secondName" value={form.secondName} onChange={handleChange} required placeholder="Enter second name" />
                            <Form.Control.Feedback type="invalid">Second name is required.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Phone Number *</Form.Label>
                            <Form.Control type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="+250 7XX XXX XXX" isInvalid={!!phoneError} />
                            <Form.Control.Feedback type="invalid">{phoneError || 'Phone number is required.'}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Location *</Form.Label>
                            <Form.Control name="location" value={form.location} onChange={handleChange} required placeholder="District, Sector" />
                            <Form.Control.Feedback type="invalid">Location is required.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Akarere / District *</Form.Label>
                            <Form.Control name="district" value={form.district} onChange={handleChange} required placeholder="District" />
                            <Form.Control.Feedback type="invalid">District is required.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Umurenge / Sector *</Form.Label>
                            <Form.Control name="sector" value={form.sector} onChange={handleChange} required placeholder="Sector" />
                            <Form.Control.Feedback type="invalid">Sector is required.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Akagali / Cell *</Form.Label>
                            <Form.Control name="cell" value={form.cell} onChange={handleChange} required placeholder="Cell" />
                            <Form.Control.Feedback type="invalid">Cell is required.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* SECTION 2: Scout Unit */}
                      <SectionHeader icon={FiUsers} title="Select Your Scout Unit" step={2} color={unitColor} />
                      <Row className="g-3 mb-4">
                        <Col md={12}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Scout Unit *</Form.Label>
                            <Form.Select name="unit" value={form.unit} onChange={handleChange} required>
                              <option value="">Select Unit</option>
                              {UNITS.map(u => (
                                <option key={u.id} value={u.id}>{u.name} — {u.english} — {u.ageRange}</option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">Please select a scout unit.</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Collapse in={!!form.unit}>
                            <div><UnitInfo unit={selectedUnit} /></div>
                          </Collapse>
                        </Col>
                      </Row>

                      {/* SECTION 3: Education */}
                      <Collapse in={!!form.unit}>
                        <div>
                          <SectionHeader icon={FiBook} title="Education" step={3} color={unitColor} />
                          <Row className="g-3 mb-4">
                            <Col md={12}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">Are you currently studying? *</Form.Label>
                                <div className="d-flex gap-4 mt-1">
                                  <Form.Check
                                    type="radio"
                                    id="studying-yes"
                                    name="studying"
                                    label="Yes"
                                    value="yes"
                                    checked={form.studying === 'yes'}
                                    onChange={handleChange}
                                    required
                                  />
                                  <Form.Check
                                    type="radio"
                                    id="studying-no"
                                    name="studying"
                                    label="No"
                                    value="no"
                                    checked={form.studying === 'no'}
                                    onChange={handleChange}
                                    required
                                  />
                                </div>
                              </Form.Group>
                            </Col>
                          </Row>

                          {/* If YES studying */}
                          <Collapse in={form.studying === 'yes'}>
                            <div>
                              <Row className="g-3 mb-4">
                                <Col md={6}>
                                  <Form.Group>
                                    <Form.Label className="fw-semibold">Where do you study? *</Form.Label>
                                    <Form.Control name="schoolName" value={form.schoolName} onChange={handleChange} required placeholder="School / Institution name" />
                                    <Form.Control.Feedback type="invalid">School name is required.</Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group>
                                    <Form.Label className="fw-semibold">Where is your school located? *</Form.Label>
                                    <Form.Control name="schoolLocation" value={form.schoolLocation} onChange={handleChange} required placeholder="District, Sector, Cell" />
                                    <Form.Control.Feedback type="invalid">School location is required.</Form.Control.Feedback>
                                  </Form.Group>
                                </Col>
                              </Row>
                            </div>
                          </Collapse>

                          {/* If NO studying → job question */}
                          <Collapse in={form.studying === 'no'}>
                            <div>
                              <Row className="g-3 mb-4">
                                <Col md={12}>
                                  <Form.Group>
                                    <Form.Label className="fw-semibold">Do you currently have a job? *</Form.Label>
                                    <div className="d-flex gap-4 mt-1">
                                      <Form.Check
                                        type="radio"
                                        id="job-yes"
                                        name="hasJob"
                                        label="Yes"
                                        value="yes"
                                        checked={form.hasJob === 'yes'}
                                        onChange={handleChange}
                                        required={form.studying === 'no'}
                                      />
                                      <Form.Check
                                        type="radio"
                                        id="job-no"
                                        name="hasJob"
                                        label="No"
                                        value="no"
                                        checked={form.hasJob === 'no'}
                                        onChange={handleChange}
                                        required={form.studying === 'no'}
                                      />
                                    </div>
                                  </Form.Group>
                                </Col>
                              </Row>

                              {/* Employment Information */}
                              <Collapse in={form.hasJob === 'yes'}>
                                <div>
                                  <Row className="g-3 mb-4">
                                    <Col md={6}>
                                      <Form.Group>
                                        <Form.Label className="fw-semibold">Job / Occupation *</Form.Label>
                                        <Form.Control name="job" value={form.job} onChange={handleChange} required placeholder="Enter the work or occupation you do" />
                                        <Form.Control.Feedback type="invalid">Job / occupation is required.</Form.Control.Feedback>
                                      </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                      <Form.Group>
                                        <Form.Label className="fw-semibold">Where do you work?</Form.Label>
                                        <Form.Control name="company" value={form.company} onChange={handleChange} placeholder="Company / Organization" />
                                      </Form.Group>
                                    </Col>
                                  </Row>
                                </div>
                              </Collapse>

                              {/* No job → current activity */}
                              <Collapse in={form.hasJob === 'no'}>
                                <div>
                                  <Row className="g-3 mb-4">
                                    <Col md={12}>
                                      <Form.Group>
                                        <Form.Label className="fw-semibold">Tell us what you are currently doing</Form.Label>
                                        <Form.Control as="textarea" rows={2} name="currentActivity" value={form.currentActivity} onChange={handleChange} placeholder="Example: Looking for a job, doing a personal project, volunteering, etc." />
                                      </Form.Group>
                                    </Col>
                                  </Row>
                                </div>
                              </Collapse>
                            </div>
                          </Collapse>
                        </div>
                      </Collapse>

                      {/* SECTION 4: Parent / Guardian */}
                      <Collapse in={!!form.unit}>
                        <div>
                          <SectionHeader icon={FiUser} title="Parent / Guardian Information" step={4} color={unitColor} />
                          <Row className="g-3 mb-4">
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">Parent First Name *</Form.Label>
                                <Form.Control name="parentFirstName" value={form.parentFirstName} onChange={handleChange} required placeholder="First name" />
                                <Form.Control.Feedback type="invalid">Required.</Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">Parent Second Name *</Form.Label>
                                <Form.Control name="parentSecondName" value={form.parentSecondName} onChange={handleChange} required placeholder="Second name" />
                                <Form.Control.Feedback type="invalid">Required.</Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="fw-semibold">Parent Phone *</Form.Label>
                                <Form.Control type="tel" name="parentPhone" value={form.parentPhone} onChange={handleChange} required placeholder="+250 7XX XXX XXX" />
                                <Form.Control.Feedback type="invalid">Required.</Form.Control.Feedback>
                              </Form.Group>
                            </Col>
                          </Row>
                        </div>
                      </Collapse>

                      {/* SUBMIT */}
                      <Collapse in={!!form.unit}>
                        <div>
                          <div className="d-grid mt-4">
                            <Button type="submit" size="lg" disabled={loading}
                              style={{ background: 'linear-gradient(135deg, #4b0082, #8a2be2, #9333ea)', border: 'none', padding: '14px', fontSize: '1.1rem', fontWeight: 600 }}>
                              {loading ? (
                                <span><span className="spinner-border spinner-border-sm me-2" />Submitting...</span>
                              ) : 'Submit Application'}
                            </Button>
                          </div>
                        </div>
                      </Collapse>

                    </Form>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  )
}
