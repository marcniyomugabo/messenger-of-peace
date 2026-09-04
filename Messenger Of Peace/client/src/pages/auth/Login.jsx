import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Button } from 'react-bootstrap'
import { useAuth } from '../../context/AuthContext'
import { FiLogIn, FiMail, FiLock } from 'react-icons/fi'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await login(email, password)
    if (success) navigate('/dashboard')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/images/logo-transparent.png" alt="MOP Logo" className="auth-logo-img" />
          <h4 style={{ color: '#6B21A8' }}>Messengers of Peace</h4>
          <p className="text-muted small">Scout Group Dashboard</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              <FiMail className="me-1" /> Email Address
            </Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>
              <FiLock className="me-1" /> Password
            </Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </Form.Group>

          <div className="d-grid">
            <Button type="submit" variant="primary" size="lg" disabled={loading}>
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Signing in...
                </span>
              ) : (
                <span><FiLogIn className="me-2" /> Sign In</span>
              )}
            </Button>
          </div>
        </Form>

        <div className="text-center mt-4">
          <a href="/" className="text-muted small">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
