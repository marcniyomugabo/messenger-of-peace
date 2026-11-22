import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Form, Button, Alert } from 'react-bootstrap'
import { FiMail, FiSend } from 'react-icons/fi'
import api from '../../services/api'

// Step 1 of "forgot password": ask for the login email; the server emails a one-time link.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setDone(res.data.message)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the request. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/images/logo-badge.png" alt="MOP Logo" className="auth-logo-img" />
          <h4 style={{ color: '#6B21A8' }}>Forgot your password?</h4>
          <p className="text-muted small">Enter the email you use to log in. We will send you a link to choose a new password.</p>
        </div>

        {done ? (
          <Alert variant="success" className="small">{done}</Alert>
        ) : (
          <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger" className="small">{error}</Alert>}
            <Form.Group className="mb-4">
              <Form.Label><FiMail className="me-1" /> Email Address</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter your email" autoFocus />
            </Form.Group>
            <div className="d-grid">
              <Button type="submit" variant="primary" size="lg" disabled={sending}>
                {sending
                  ? <span><span className="spinner-border spinner-border-sm me-2" role="status" />Sending...</span>
                  : <span><FiSend className="me-2" /> Send reset link</span>}
              </Button>
            </div>
          </Form>
        )}

        <div className="text-center mt-4">
          <Link to="/login" className="text-muted small">Back to login</Link>
        </div>
      </div>
    </div>
  )
}
