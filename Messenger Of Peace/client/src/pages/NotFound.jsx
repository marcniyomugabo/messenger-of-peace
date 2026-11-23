import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { FiCompass, FiHome, FiGrid, FiMail } from 'react-icons/fi'

// Shown for an address that does not exist, on the website (inside its menu and footer)
// or in the dashboard (inside the dashboard).
export default function NotFound({ dashboard = false }) {
  const { pathname } = useLocation()
  useEffect(() => {
    const previous = document.title
    document.title = 'Page not found | Messengers of Peace'
    // Tell search engines not to keep this address.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    // Leaving the page: the next page gets its normal title back.
    return () => { meta.remove(); document.title = previous.startsWith('Page not found') ? 'Messengers of Peace Scout Group' : previous }
  }, [])

  return (
    <Container className={dashboard ? 'py-4' : 'py-5'}>
      <div className="text-center mx-auto py-5" style={{ maxWidth: 560 }}>
        <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
          style={{ width: 96, height: 96, background: 'var(--mop-light, #F3E8FF)', color: 'var(--mop-primary)' }}>
          <FiCompass size={44} />
        </div>
        <h1 className="h2 fw-bold mb-2">Page not found</h1>
        <p className="text-muted mb-1">We couldn't find <code className="text-break">{pathname}</code>.</p>
        <p className="text-muted mb-4">The link may be old or mistyped. Even good scouts take a wrong turn sometimes!</p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          {dashboard ? (
            <Link to="/dashboard" className="btn btn-primary"><FiGrid className="me-1" />Back to the dashboard</Link>
          ) : (
            <>
              <Link to="/" className="btn btn-primary"><FiHome className="me-1" />Home page</Link>
              <Link to="/contact" className="btn btn-outline-primary"><FiMail className="me-1" />Contact us</Link>
            </>
          )}
        </div>
      </div>
    </Container>
  )
}
