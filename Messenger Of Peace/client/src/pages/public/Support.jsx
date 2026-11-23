import { Link } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'
import { FiHeart, FiSmartphone, FiCreditCard, FiUsers, FiPackage, FiMessageCircle } from 'react-icons/fi'
import { useSiteSettings, whatsappLink } from '../../utils/siteSettings'

// "Support MOP": how to give to the group. The details come from the dashboard (Settings > Support);
// a way of giving whose details are empty is not shown.
const DEFAULT_TEXT = 'Messengers of Peace is run by volunteers. Your support helps us buy uniforms and scarves, '
  + 'organise camps and trainings, and help members who cannot pay their contribution. Every gift, big or small, makes a difference.'

export default function Support() {
  const site = useSiteSettings()
  const hasMomo = !!site.support_momo_number
  const hasBank = !!site.support_bank_account
  const paragraphs = (site.support_text || DEFAULT_TEXT).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

  const Card = ({ icon, title, children }) => (
    <Col md={6} lg={4}>
      <div className="p-4 rounded-4 bg-white shadow-sm h-100">
        <div className="mb-3 rounded-circle d-inline-flex align-items-center justify-content-center"
          style={{ width: 52, height: 52, background: 'var(--mop-light)', color: 'var(--mop-primary)' }}>{icon}</div>
        <h5>{title}</h5>
        <div className="text-muted small">{children}</div>
      </div>
    </Col>
  )

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '3.5rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/community.JPEG')" }}></div>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Support Messengers of Peace</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 620, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Help young people grow as leaders, serve their community and build peace.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5" style={{ background: 'var(--mop-bg)' }}>
        <Container>
          <Row className="justify-content-center mb-5">
            <Col lg={8} className="text-center">
              <FiHeart size={32} style={{ color: 'var(--mop-primary)' }} className="mb-3" />
              {paragraphs.map((p, i) => <p key={i} className="lead" style={{ whiteSpace: 'pre-line' }}>{p}</p>)}
            </Col>
          </Row>

          <Row className="g-4 justify-content-center">
            {hasMomo && (
              <Card icon={<FiSmartphone size={24} />} title="Mobile Money">
                <p className="mb-1">Send to:</p>
                <p className="fs-5 fw-bold text-dark mb-1">{site.support_momo_number}</p>
                {site.support_momo_name && <p className="mb-0">Name: <strong>{site.support_momo_name}</strong></p>}
              </Card>
            )}
            {hasBank && (
              <Card icon={<FiCreditCard size={24} />} title="Bank transfer">
                {site.support_bank_name && <p className="mb-1">Bank: <strong>{site.support_bank_name}</strong></p>}
                <p className="mb-1">Account: <strong className="text-dark">{site.support_bank_account}</strong></p>
                {site.support_bank_holder && <p className="mb-0">Name: <strong>{site.support_bank_holder}</strong></p>}
              </Card>
            )}
            <Card icon={<FiUsers size={24} />} title="Sponsor a scout">
              <p className="mb-0">Pay the monthly contribution, uniform or camp of a young person who cannot afford it. Contact us and we will tell you how.</p>
            </Card>
            <Card icon={<FiPackage size={24} />} title="Give equipment or skills">
              <p className="mb-0">Tents, first-aid kits, books, or your time as a trainer are all welcome.</p>
            </Card>
          </Row>

          <div className="text-center mt-5">
            {!hasMomo && !hasBank && <p className="text-muted">To give money, please contact us and we will share the group's payment details.</p>}
            <p className="mb-3">Please tell us about your gift so we can thank you and give you a receipt.</p>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <a className="btn btn-primary" href={whatsappLink(site.whatsapp_contact)} target="_blank" rel="noopener noreferrer"><FiMessageCircle className="me-1" /> WhatsApp us</a>
              <Link to="/contact" className="btn btn-outline-primary">Contact us</Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}
