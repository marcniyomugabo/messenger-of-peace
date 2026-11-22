import { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { FiPhone, FiMessageCircle, FiMapPin, FiClock, FiMail, FiSend } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { useSiteSettings, whatsappLink, phoneLink } from '../../utils/siteSettings'

export default function Contact() {
  // Contacts and meeting details come from the dashboard (Settings).
  const site = useSiteSettings()
  const locationLines = site.meeting_location.split(',').map(p => p.trim()).filter(Boolean)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/contact-messages', form)
      toast.success('Message sent successfully! We will get back to you soon.')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg2.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg6.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Contact Us</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Get in touch with Messengers of Peace Scout Group
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          {/* Contact Cards */}
          <Row className="g-4 mb-5 animate-row">
            <Col md={4} className="animate-card">
              <a
                href={whatsappLink(site.whatsapp_contact)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none"
              >
                <div className="contact-card">
                  <FiMessageCircle className="contact-icon animate-float" />
                  <h5>WhatsApp</h5>
                  <p className="text-muted mb-1">{site.whatsapp_contact}</p>
                  <small className="text-primary">Click to chat</small>
                </div>
              </a>
            </Col>
            <Col md={4} className="animate-card">
              <div className="contact-card">
                <FiPhone className="contact-icon animate-float" />
                <h5>Phone</h5>
                <p className="text-muted mb-0"><a href={phoneLink(site.phone_contact)} className="text-muted text-decoration-none">{site.phone_contact}</a></p>
              </div>
            </Col>
            <Col md={4} className="animate-card">
              <div className="contact-card">
                <FiMail className="contact-icon animate-float" />
                <h5>Email</h5>
                <p className="text-muted mb-0"><a href={'mailto:' + site.email_contact} className="text-muted text-decoration-none">{site.email_contact}</a></p>
              </div>
            </Col>
          </Row>

          <Row className="g-4 mb-5 animate-row">
            <Col md={6} className="animate-card">
              <div className="contact-card">
                <FiMapPin className="contact-icon animate-float" />
                <h5>Location</h5>
                <p className="text-muted mb-0">
                  {locationLines.map((line, i) => <span key={i}>{line}<br /></span>)}
                  Rwanda
                </p>
              </div>
            </Col>
            <Col md={6} className="animate-card">
              <div className="contact-card">
                <FiClock className="contact-icon animate-float" />
                <h5>Meeting Time</h5>
                <p className="text-muted mb-0">
                  Every {site.meeting_day}<br />
                  {site.meeting_time}<br />
                  {locationLines[0]}
                </p>
              </div>
            </Col>
          </Row>

          {/* Contact Form */}
          <Row className="justify-content-center">
            <Col lg={8}>
              <div className="mop-card mop-card-static animate-form">
                <div className="card-header py-3">
                  <h5 className="mb-0 text-white d-flex align-items-center gap-2"><FiMail aria-hidden="true" />Send Us a Message</h5>
                </div>
                <div className="card-body p-4">
                  <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Your Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter your name"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Email Address *</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            placeholder="email@example.com"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Subject *</Form.Label>
                          <Form.Control
                            type="text"
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            required
                            placeholder="Message subject"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Message *</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={5}
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            required
                            placeholder="Write your message here..."
                          />
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <div className="d-grid">
                          <Button type="submit" variant="primary" size="lg" disabled={loading}>
                            <FiSend className="me-2" />
                            {loading ? 'Sending...' : 'Send Message'}
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </Form>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  )
}
