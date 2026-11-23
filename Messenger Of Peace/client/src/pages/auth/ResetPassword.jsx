import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Form, Button, Alert } from 'react-bootstrap'
import { FiLock, FiCheck } from 'react-icons/fi'
import api from '../../services/api'

// Step 2 of "forgot password": the emailed link opens this page with ?token=...
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('The new password must be at least 8 characters.')
    if (password !== confirm) return setError('The two passwords are not the same.')
    setSaving(true)
    try {
      const res = await api.post('/auth/reset-password', { token, password })
      setDone(res.data.message)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change the password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/images/logo-badge.png" alt="MOP Logo" className="auth-logo-img" />
          <h4 style={{ color: '#6B21A8' }}>Choose a new password</h4>
        </div>

        {!token ? (
          <Alert variant="danger" className="small">
            This page needs the link from the email. <Link to="/forgot-password">Ask for a new link</Link>.
          </Alert>
        ) : done ? (
          <>
            <Alert variant="success" className="small">{done}</Alert>
            <div className="d-grid"><Link to="/login" className="btn btn-primary btn-lg">Go to login</Link></div>
          </>
        ) : (
          <Form onSubmit={handleSubmit}>
            {error && (
              <Alert variant="danger" className="small">
                {error}
                {/expired|not valid/i.test(error) && <> <Link to="/forgot-password">Ask for a new link</Link>.</>}
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label><FiLock className="me-1" /> New password</Form.Label>
              <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" autoFocus autoComplete="new-password" />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label><FiLock className="me-1" /> Repeat the new password</Form.Label>
              <Form.Control type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
            </Form.Group>
            <div className="d-grid">
              <Button type="submit" variant="primary" size="lg" disabled={saving}>
                {saving
                  ? <span><span className="spinner-border spinner-border-sm me-2" role="status" />Saving...</span>
                  : <span><FiCheck className="me-2" /> Save new password</span>}
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
