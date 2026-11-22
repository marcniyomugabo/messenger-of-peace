import { useState } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'
import { toast } from 'react-toastify'
import api from '../services/api'

const empty = { current_password: '', new_password: '', confirm: '' }

// Lets any logged-in user change their own password (current + new + confirm).
export default function ChangePasswordModal({ show, onHide }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const close = () => { setForm(empty); onHide() }
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      toast.error('The new passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { current_password: form.current_password, new_password: form.new_password })
      toast.success('Password changed')
      close()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change the password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={close} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Change password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Current password</Form.Label>
            <Form.Control type="password" name="current_password" required autoComplete="current-password"
              value={form.current_password} onChange={handleChange} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>New password</Form.Label>
            <Form.Control type="password" name="new_password" required minLength={8} autoComplete="new-password"
              placeholder="Minimum 8 characters" value={form.new_password} onChange={handleChange} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Confirm new password</Form.Label>
            <Form.Control type="password" name="confirm" required minLength={8} autoComplete="new-password"
              value={form.confirm} onChange={handleChange} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Change password'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
