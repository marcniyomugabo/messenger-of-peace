import { Link } from 'react-router-dom'
import { FiPhone, FiMapPin, FiClock, FiMessageCircle, FiMail } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="mop-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-2">
              <img src="/images/logo-transparent.png" alt="MOP Logo" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <h5 className="mb-0">Messengers of Peace Scout Group</h5>
            </div>
            <p className="small">
              Building tomorrow's leaders through scouting values, community service,
              and the spirit of peace. Part of the Rwanda Scout Association.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="#" className="fs-5"><i className="bi bi-facebook"></i></a>
              <a href="#" className="fs-5"><i className="bi bi-twitter"></i></a>
              <a href="#" className="fs-5"><i className="bi bi-instagram"></i></a>
            </div>
          </div>

          <div className="col-lg-2 col-md-6">
            <h5>Quick Links</h5>
            <ul className="list-unstyled">
              <li className="mb-2"><Link to="/about">About Us</Link></li>
              <li className="mb-2"><Link to="/information">Information</Link></li>
              <li className="mb-2"><Link to="/activities">Activities</Link></li>
              <li className="mb-2"><Link to="/portfolio">Library</Link></li>
              <li className="mb-2"><Link to="/members">Members</Link></li>
              <li className="mb-2"><Link to="/join-us">Join Us</Link></li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5>Contact Info</h5>
            <ul className="list-unstyled">
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiMessageCircle className="mt-1 text-info" />
                <div>
                  <small className="d-block text-white fw-bold">WhatsApp</small>
                  <small>+250 722 784 670</small>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiPhone className="mt-1 text-info" />
                <div>
                  <small className="d-block text-white fw-bold">Phone</small>
                  <small>+250 786 188 913</small>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiMail className="mt-1 text-info" />
                <div>
                  <small className="d-block text-white fw-bold">Email</small>
                  <small>info@mopscouts.rw</small>
                </div>
              </li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5>Meeting Info</h5>
            <ul className="list-unstyled">
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiMapPin className="mt-1 text-info" />
                <div>
                  <small className="d-block text-white fw-bold">Location</small>
                  <small>Camp Kigali, Nyarugenge District, Kigali</small>
                </div>
              </li>
              <li className="mb-3 d-flex align-items-start gap-2">
                <FiClock className="mt-1 text-info" />
                <div>
                  <small className="d-block text-white fw-bold">Meeting Time</small>
                  <small>Sunday: 13:30 - 16:30</small>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mop-footer-bottom text-center">
          <p className="small mb-0">
            &copy; {new Date().getFullYear()} Messengers of Peace Scout Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
