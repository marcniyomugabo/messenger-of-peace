import { Link } from 'react-router-dom'
import { FiPhone, FiMapPin, FiClock, FiMessageCircle, FiMail, FiFacebook, FiTwitter, FiInstagram } from 'react-icons/fi'
import { useSiteSettings, whatsappLink, phoneLink, isWebLink } from '../utils/siteSettings'

export default function Footer() {
  // Group details, contacts, meeting info and social links come from the dashboard (Settings).
  const site = useSiteSettings()
  const socials = [
    { url: site.facebook_url, icon: <FiFacebook />, label: 'Facebook' },
    { url: site.twitter_url, icon: <FiTwitter />, label: 'X (Twitter)' },
    { url: site.instagram_url, icon: <FiInstagram />, label: 'Instagram' },
  ].filter(s => isWebLink(s.url))

  return (
    <footer className="mop-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-3 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-2">
              <img src="/images/logo-badge.png" alt="MOP Logo" className="mop-footer-logo" />
              <h5 className="mb-0">{site.group_name}</h5>
            </div>
            <p className="small">{site.group_description}</p>
            {socials.length > 0 && (
              <div className="d-flex gap-3 mt-3">
                {socials.map(s => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="fs-5" aria-label={s.label} title={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links in two short columns, so the footer stays compact. */}
          <div className="col-lg-3 col-md-6">
            <h5>Quick Links</h5>
            <div className="row g-0">
              <ul className="list-unstyled col-5 mb-0 pe-2">
                <li className="mb-2"><Link to="/about">About Us</Link></li>
                <li className="mb-2"><Link to="/news">News</Link></li>
                <li className="mb-2"><Link to="/events">Events</Link></li>
                <li className="mb-2"><Link to="/units">Our Units</Link></li>
                <li className="mb-2"><Link to="/activities">Activities</Link></li>
                <li className="mb-2"><Link to="/portfolio">Library</Link></li>
              </ul>
              <ul className="list-unstyled col-7 mb-0 text-nowrap">
                <li className="mb-2"><Link to="/information">Information</Link></li>
                <li className="mb-2"><Link to="/members">Members</Link></li>
                <li className="mb-2"><Link to="/join-us">Join Us</Link></li>
                <li className="mb-2"><Link to="/support">Support MOP</Link></li>
                <li className="mb-2"><Link to="/report-concern" className="fw-semibold">Report a Concern</Link></li>
              </ul>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5>Contact Info</h5>
            <ul className="list-unstyled">
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiMessageCircle className="mt-1 mop-footer-icon" />
                <div>
                  <small className="d-block text-white fw-bold">WhatsApp</small>
                  <small><a href={whatsappLink(site.whatsapp_contact)} target="_blank" rel="noopener noreferrer">{site.whatsapp_contact}</a></small>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiPhone className="mt-1 mop-footer-icon" />
                <div>
                  <small className="d-block text-white fw-bold">Phone</small>
                  <small><a href={phoneLink(site.phone_contact)}>{site.phone_contact}</a></small>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiMail className="mt-1 mop-footer-icon" />
                <div>
                  <small className="d-block text-white fw-bold">Email</small>
                  <small><a href={'mailto:' + site.email_contact}>{site.email_contact}</a></small>
                </div>
              </li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5>Meeting Info</h5>
            <ul className="list-unstyled">
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiMapPin className="mt-1 mop-footer-icon" />
                <div>
                  <small className="d-block text-white fw-bold">Location</small>
                  <small>{site.meeting_location}</small>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiClock className="mt-1 mop-footer-icon" />
                <div>
                  <small className="d-block text-white fw-bold">Meeting Time</small>
                  <small>{site.meeting_day}: {site.meeting_time}</small>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mop-footer-bottom text-center">
          <p className="small mb-0">
            &copy; {new Date().getFullYear()} {site.group_name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
