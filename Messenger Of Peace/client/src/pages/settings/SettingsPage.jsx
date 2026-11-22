import { useState, useEffect } from 'react'
import { Row, Col, Card, Form, Button, Tab, Tabs, Spinner } from 'react-bootstrap'
import { FiSettings, FiInfo, FiPhone, FiUsers, FiHeart } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'
import { DEFAULT_SETTINGS } from '../../utils/siteSettings'

const SUPPORT_KEYS = ['support_text', 'support_momo_number', 'support_momo_name', 'support_bank_name', 'support_bank_account', 'support_bank_holder']

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [groupInfo, setGroupInfo] = useState({
    group_name: '', group_motto: '', group_location: '', group_description: '',
  })

  const [contactInfo, setContactInfo] = useState({
    whatsapp_contact: '', phone_contact: '', email_contact: '',
    meeting_day: '', meeting_time: '', meeting_location: '',
    facebook_url: '', twitter_url: '', instagram_url: '',
  })

  // Support MOP page details (public).
  const [support, setSupport] = useState(Object.fromEntries(SUPPORT_KEYS.map(k => [k, ''])))

  const [systemSettings, setSystemSettings] = useState({
    monthly_contribution: '', max_members_per_unit: '',
    registration_open: true, attendance_required: true, email_notifications: true,
  })

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings/all')
      const data = res.data.data || res.data.settings || []
      const settings = Array.isArray(data) ? data : []

      const settingsMap = {}
      settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value })

      setGroupInfo({
        group_name: settingsMap.group_name || 'Messengers of Peace Scout Group',
        group_motto: settingsMap.group_motto || 'Kirazira Bugufi - Be Prepared',
        group_location: settingsMap.group_location || settingsMap.meeting_location || 'Camp Kigali, Nyarugenge District, Kigali',
        group_description: settingsMap.group_description || DEFAULT_SETTINGS.group_description,
      })

      // These are shown on the website (Footer, Contact page, Home); empty ones fall back to the website's defaults.
      const site = key => settingsMap[key] ?? DEFAULT_SETTINGS[key]
      setContactInfo({
        whatsapp_contact: site('whatsapp_contact'),
        phone_contact: site('phone_contact'),
        email_contact: site('email_contact'),
        meeting_day: site('meeting_day'),
        meeting_time: site('meeting_time'),
        meeting_location: site('meeting_location'),
        facebook_url: site('facebook_url'),
        twitter_url: site('twitter_url'),
        instagram_url: site('instagram_url'),
      })
      setSupport(Object.fromEntries(SUPPORT_KEYS.map(k => [k, settingsMap[k] ?? ''])))

      setSystemSettings({
        monthly_contribution: settingsMap.monthly_contribution || '500',
        max_members_per_unit: settingsMap.max_members_per_unit || '80',
        registration_open: settingsMap.registration_open !== 'false',
        attendance_required: settingsMap.attendance_required !== 'false',
        email_notifications: settingsMap.email_notifications !== 'false',
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleGroupSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/settings', { settings: groupInfo })
      toast.success('Group information updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update group information')
    } finally {
      setSaving(false)
    }
  }

  const handleContactSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/settings', { settings: contactInfo })
      toast.success('Contact information updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update contact information')
    } finally {
      setSaving(false)
    }
  }

  const handleSupportSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/settings', { settings: support })
      toast.success('Support page updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update the Support page')
    } finally {
      setSaving(false)
    }
  }

  const handleSystemSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        settings: {
          monthly_contribution: systemSettings.monthly_contribution,
          max_members_per_unit: systemSettings.max_members_per_unit,
          registration_open: String(systemSettings.registration_open),
          attendance_required: String(systemSettings.attendance_required),
          email_notifications: String(systemSettings.email_notifications),
        }
      }
      await api.put('/settings', payload)
      await api.put('/contributions/settings', { monthly_amount: parseFloat(systemSettings.monthly_contribution) }).catch(() => {})
      toast.success('System settings updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update system settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-3 text-muted">Loading settings...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiSettings className="me-2" /> Settings</h4>
      </div>

      <Tabs defaultActiveKey="group" className="mb-4">
        <Tab eventKey="group" title={<span><FiInfo className="me-1" /> Group Information</span>}>
          <Card className="mop-card">
            <Card.Body className="p-4">
              <Form onSubmit={handleGroupSave}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Group Name</Form.Label>
                      <Form.Control
                        value={groupInfo.group_name}
                        onChange={(e) => setGroupInfo({ ...groupInfo, group_name: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Motto</Form.Label>
                      <Form.Control
                        value={groupInfo.group_motto}
                        onChange={(e) => setGroupInfo({ ...groupInfo, group_motto: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Location</Form.Label>
                      <Form.Control
                        value={groupInfo.group_location}
                        onChange={(e) => setGroupInfo({ ...groupInfo, group_location: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Group Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={groupInfo.group_description}
                        onChange={(e) => setGroupInfo({ ...groupInfo, group_description: e.target.value })}
                      />
                      <Form.Text className="text-muted">The group name and description are shown in the website footer.</Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Button type="submit" variant="primary" className="mt-3" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="contact" title={<span><FiPhone className="me-1" /> Contact Information</span>}>
          <Card className="mop-card">
            <Card.Body className="p-4">
              <Form onSubmit={handleContactSave}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>WhatsApp Number</Form.Label>
                      <Form.Control
                        value={contactInfo.whatsapp_contact}
                        onChange={(e) => setContactInfo({ ...contactInfo, whatsapp_contact: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        value={contactInfo.phone_contact}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone_contact: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={contactInfo.email_contact}
                        onChange={(e) => setContactInfo({ ...contactInfo, email_contact: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Meeting Day</Form.Label>
                      <Form.Control
                        value={contactInfo.meeting_day}
                        onChange={(e) => setContactInfo({ ...contactInfo, meeting_day: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Meeting Time</Form.Label>
                      <Form.Control
                        value={contactInfo.meeting_time}
                        onChange={(e) => setContactInfo({ ...contactInfo, meeting_time: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Meeting Place</Form.Label>
                      <Form.Control
                        value={contactInfo.meeting_location}
                        onChange={(e) => setContactInfo({ ...contactInfo, meeting_location: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <h6 className="mt-2 mb-0">Social media links</h6>
                    <small className="text-muted">Full web addresses. An icon appears in the website footer for each one filled in; leave empty to hide it.</small>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Facebook</Form.Label>
                      <Form.Control
                        type="url"
                        placeholder="https://facebook.com/..."
                        value={contactInfo.facebook_url}
                        onChange={(e) => setContactInfo({ ...contactInfo, facebook_url: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>X (Twitter)</Form.Label>
                      <Form.Control
                        type="url"
                        placeholder="https://x.com/..."
                        value={contactInfo.twitter_url}
                        onChange={(e) => setContactInfo({ ...contactInfo, twitter_url: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Instagram</Form.Label>
                      <Form.Control
                        type="url"
                        placeholder="https://instagram.com/..."
                        value={contactInfo.instagram_url}
                        onChange={(e) => setContactInfo({ ...contactInfo, instagram_url: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Text className="text-muted d-block mt-2">These details are shown on the website: footer, Contact page and Home page.</Form.Text>
                <Button type="submit" variant="primary" className="mt-3" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="support" title={<span><FiHeart className="me-1" /> Support Page</span>}>
          <Card className="mop-card">
            <Card.Body className="p-4">
              <p className="text-muted small">
                Shown on the website's <a href="/support" target="_blank" rel="noopener noreferrer">Support MOP</a> page.
                A way of giving whose details are empty is not shown.
              </p>
              <Form onSubmit={handleSupportSave}>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Why support us (text)</Form.Label>
                      <Form.Control as="textarea" rows={4} value={support.support_text}
                        onChange={(e) => setSupport({ ...support, support_text: e.target.value })}
                        placeholder="Empty = a standard text about what support pays for" />
                      <Form.Text className="text-muted">Leave an empty line between paragraphs.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Mobile Money number</Form.Label>
                      <Form.Control value={support.support_momo_number} onChange={(e) => setSupport({ ...support, support_momo_number: e.target.value })} placeholder="e.g. 078 000 0000" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Mobile Money name</Form.Label>
                      <Form.Control value={support.support_momo_name} onChange={(e) => setSupport({ ...support, support_momo_name: e.target.value })} placeholder="Name shown when sending" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Bank</Form.Label>
                      <Form.Control value={support.support_bank_name} onChange={(e) => setSupport({ ...support, support_bank_name: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Account number</Form.Label>
                      <Form.Control value={support.support_bank_account} onChange={(e) => setSupport({ ...support, support_bank_account: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Account name</Form.Label>
                      <Form.Control value={support.support_bank_holder} onChange={(e) => setSupport({ ...support, support_bank_holder: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Text className="text-muted d-block mt-2">Only put the group's official account here: everything on this page is public.</Form.Text>
                <Button type="submit" variant="primary" className="mt-3" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="system" title={<span><FiUsers className="me-1" /> System Settings</span>}>
          <Card className="mop-card">
            <Card.Body className="p-4">
              <Form onSubmit={handleSystemSave}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Check
                        type="switch"
                        label="Open Registration"
                        checked={systemSettings.registration_open}
                        onChange={(e) => setSystemSettings({ ...systemSettings, registration_open: e.target.checked })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Check
                        type="switch"
                        label="Absence alerts"
                        checked={systemSettings.attendance_required}
                        onChange={(e) => setSystemSettings({ ...systemSettings, attendance_required: e.target.checked })}
                      />
                      <Form.Text className="text-muted">
                        When a member misses 3 registers in a row, their unit leader (or the chief and super
                        admin, if the unit has no leader account) gets a notification.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Monthly Contribution (RWF)</Form.Label>
                      <Form.Control
                        type="number"
                        value={systemSettings.monthly_contribution}
                        onChange={(e) => setSystemSettings({ ...systemSettings, monthly_contribution: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Max Members Per Unit</Form.Label>
                      <Form.Control
                        type="number"
                        value={systemSettings.max_members_per_unit}
                        onChange={(e) => setSystemSettings({ ...systemSettings, max_members_per_unit: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Check
                        type="switch"
                        label="Email Notifications"
                        checked={systemSettings.email_notifications}
                        onChange={(e) => setSystemSettings({ ...systemSettings, email_notifications: e.target.checked })}
                      />
                      <Form.Text className="text-muted">
                        Emails applicants when their application is approved (with their login) or rejected.
                        Concern alerts to the safeguarding leaders are always emailed.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Button type="submit" variant="primary" className="mt-3" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  )
}
