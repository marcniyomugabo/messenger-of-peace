import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col, Tab, Tabs } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiHome, FiLayers } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function HomeContentManagement() {
  const [slides, setSlides] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('slides')

  const [showSlideModal, setShowSlideModal] = useState(false)
  const [editSlide, setEditSlide] = useState(null)
  const [slideForm, setSlideForm] = useState({
    title: '', subtitle: '', description: '', background_image: '',
    button_text: '', button_link: '', sort_order: 0, is_active: 1
  })

  const [showSectionModal, setShowSectionModal] = useState(false)
  const [editSection, setEditSection] = useState(null)
  const [sectionForm, setSectionForm] = useState({
    title: '', content: '', section_type: 'stats', image: '',
    sort_order: 0, is_active: 1
  })

  useEffect(() => { fetchSlides(); fetchSections() }, [])

  const fetchSlides = async () => {
    try {
      const res = await api.get('/homepage/slides/admin')
      const data = res.data.data || res.data || []
      setSlides(Array.isArray(data) ? data : [])
    } catch {
      setSlides([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSections = async () => {
    try {
      const res = await api.get('/homepage/sections/admin')
      const data = res.data.data || res.data || []
      setSections(Array.isArray(data) ? data : [])
    } catch {
      setSections([])
    }
  }

  const handleSlideChange = (e) => {
    const { name, value, type, checked } = e.target
    setSlideForm({ ...slideForm, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value })
  }

  const handleSectionChange = (e) => {
    const { name, value, type, checked } = e.target
    setSectionForm({ ...sectionForm, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value })
  }

  const handleSlideSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editSlide) {
        await api.put(`/homepage/slides/${editSlide.id}`, slideForm)
        toast.success('Slide updated')
      } else {
        await api.post('/homepage/slides', slideForm)
        toast.success('Slide created')
      }
      setShowSlideModal(false)
      resetSlideForm()
      fetchSlides()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleSectionSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editSection) {
        await api.put(`/homepage/sections/${editSection.id}`, sectionForm)
        toast.success('Section updated')
      } else {
        await api.post('/homepage/sections', sectionForm)
        toast.success('Section created')
      }
      setShowSectionModal(false)
      resetSectionForm()
      fetchSections()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleEditSlide = (slide) => {
    setEditSlide(slide)
    setSlideForm({
      title: slide.title || '', subtitle: slide.subtitle || '',
      description: slide.description || '', background_image: slide.background_image || '',
      button_text: slide.button_text || '', button_link: slide.button_link || '',
      sort_order: slide.sort_order || 0, is_active: slide.is_active !== undefined ? slide.is_active : 1
    })
    setShowSlideModal(true)
  }

  const handleEditSection = (section) => {
    setEditSection(section)
    setSectionForm({
      title: section.title || '', content: section.content || '',
      section_type: section.section_type || 'stats', image: section.image || '',
      sort_order: section.sort_order || 0, is_active: section.is_active !== undefined ? section.is_active : 1
    })
    setShowSectionModal(true)
  }

  const handleDeleteSlide = async (id) => {
    if (!window.confirm('Delete this slide?')) return
    try {
      await api.delete(`/homepage/slides/${id}`)
      toast.success('Slide deleted')
      fetchSlides()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Delete this section?')) return
    try {
      await api.delete(`/homepage/sections/${id}`)
      toast.success('Section deleted')
      fetchSections()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const toggleSlideActive = async (slide) => {
    try {
      await api.put(`/homepage/slides/${slide.id}`, { is_active: slide.is_active ? 0 : 1 })
      toast.success(`Slide ${slide.is_active ? 'deactivated' : 'activated'}`)
      fetchSlides()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const toggleSectionActive = async (section) => {
    try {
      await api.put(`/homepage/sections/${section.id}`, { is_active: section.is_active ? 0 : 1 })
      toast.success(`Section ${section.is_active ? 'deactivated' : 'activated'}`)
      fetchSections()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const resetSlideForm = () => {
    setEditSlide(null)
    setSlideForm({
      title: '', subtitle: '', description: '', background_image: '',
      button_text: '', button_link: '', sort_order: 0, is_active: 1
    })
  }

  const resetSectionForm = () => {
    setEditSection(null)
    setSectionForm({
      title: '', content: '', section_type: 'stats', image: '',
      sort_order: 0, is_active: 1
    })
  }

  const activeSlides = slides.filter(s => s.is_active).length
  const activeSections = sections.filter(s => s.is_active).length

  // The Home page shows one kind of section: the numbers block ("stats").
  const sectionTypeBadge = (type) => (type === 'stats'
    ? <Badge bg="success">Numbers</Badge>
    : <Badge bg="secondary" title="The Home page does not show this kind of section">{type || 'custom'}: not shown</Badge>)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiHome className="me-2" /> Home Content Management</h4>
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="slides" title="Hero Slides">
          <Row className="g-3 mb-4">
            <Col md={6}>
              <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
                <div className="kpi-value">{slides.length}</div>
                <div className="kpi-label">Total Slides</div>
              </div>
            </Col>
            <Col md={6}>
              <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}>
                <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{activeSlides}</div>
                <div className="kpi-label">Active Slides</div>
              </div>
            </Col>
          </Row>

          <div className="d-flex justify-content-end mb-3">
            <Button variant="primary" onClick={() => { resetSlideForm(); setShowSlideModal(true) }}>
              <FiPlus className="me-1" /> New Slide
            </Button>
          </div>

          <div className="mop-card">
            <div className="table-responsive">
              <Table className="mop-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Subtitle</th>
                    <th>Background</th>
                    <th>Order</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slides.map((s, idx) => (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-semibold">{s.title}</td>
                      <td>{s.subtitle || '-'}</td>
                      <td>
                        {s.background_image ? (
                          <img src={s.background_image} alt="" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : '-'}
                      </td>
                      <td>{s.sort_order || 0}</td>
                      <td>
                        <Badge bg={s.is_active ? 'success' : 'secondary'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button variant="outline-secondary" size="sm" onClick={() => handleEditSlide(s)} title="Edit"><FiEdit2 /></Button>
                          <Button variant={s.is_active ? 'outline-warning' : 'outline-success'} size="sm" onClick={() => toggleSlideActive(s)} title={s.is_active ? 'Deactivate' : 'Activate'}>
                            {s.is_active ? 'On' : 'Off'}
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteSlide(s.id)} title="Delete"><FiTrash2 /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {slides.length === 0 && (
                    <tr><td colSpan="7" className="text-center py-4 text-muted">
                      {loading ? 'Loading...' : 'No slides found'}
                    </td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>

          <Modal show={showSlideModal} onHide={() => setShowSlideModal(false)} centered size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{editSlide ? 'Edit Slide' : 'New Slide'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSlideSubmit}>
              <Modal.Body>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Title *</Form.Label>
                      <Form.Control name="title" value={slideForm.title} onChange={handleSlideChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subtitle</Form.Label>
                      <Form.Control name="subtitle" value={slideForm.subtitle} onChange={handleSlideChange} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control name="description" value={slideForm.description} onChange={handleSlideChange} />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Background Image URL</Form.Label>
                      <Form.Control name="background_image" value={slideForm.background_image} onChange={handleSlideChange} placeholder="/images/bg2.jpeg" />
                      <Form.Text className="text-muted">A picture of this website (for example /images/bg2.jpeg) or a full web address.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Button Text</Form.Label>
                      <Form.Control name="button_text" value={slideForm.button_text} onChange={handleSlideChange} placeholder="Learn More" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Button Link</Form.Label>
                      <Form.Control name="button_link" value={slideForm.button_link} onChange={handleSlideChange} placeholder="/about" />
                      <Form.Text className="text-muted">A page of this website starts with "/". Leave the text or link empty to show no button.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sort Order</Form.Label>
                      <Form.Control type="number" name="sort_order" value={slideForm.sort_order} onChange={handleSlideChange} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check type="switch" label="Active" name="is_active" checked={!!slideForm.is_active} onChange={handleSlideChange} />
                    </Form.Group>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowSlideModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{editSlide ? 'Update' : 'Create'}</Button>
              </Modal.Footer>
            </Form>
          </Modal>
        </Tab>

        <Tab eventKey="sections" title="Page Sections">
          <Row className="g-3 mb-4">
            <Col md={6}>
              <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
                <div className="kpi-value">{sections.length}</div>
                <div className="kpi-label">Total Sections</div>
              </div>
            </Col>
            <Col md={6}>
              <div className="kpi-card" style={{ borderLeftColor: 'var(--mop-success)' }}>
                <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{activeSections}</div>
                <div className="kpi-label">Active Sections</div>
              </div>
            </Col>
          </Row>

          <div className="d-flex justify-content-end mb-3">
            <Button variant="primary" onClick={() => { resetSectionForm(); setShowSectionModal(true) }}>
              <FiPlus className="me-1" /> New Section
            </Button>
          </div>

          <div className="mop-card">
            <div className="table-responsive">
              <Table className="mop-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Order</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s, idx) => (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-semibold">{s.title}</td>
                      <td>{sectionTypeBadge(s.section_type)}</td>
                      <td>{s.sort_order || 0}</td>
                      <td>
                        <Badge bg={s.is_active ? 'success' : 'secondary'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button variant="outline-secondary" size="sm" onClick={() => handleEditSection(s)} title="Edit"><FiEdit2 /></Button>
                          <Button variant={s.is_active ? 'outline-warning' : 'outline-success'} size="sm" onClick={() => toggleSectionActive(s)} title={s.is_active ? 'Deactivate' : 'Activate'}>
                            {s.is_active ? 'On' : 'Off'}
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteSection(s.id)} title="Delete"><FiTrash2 /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sections.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-4 text-muted">
                      {loading ? 'Loading...' : 'No sections found'}
                    </td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>

          <Modal show={showSectionModal} onHide={() => setShowSectionModal(false)} centered size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{editSection ? 'Edit Section' : 'New Section'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSectionSubmit}>
              <Modal.Body>
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Title *</Form.Label>
                      <Form.Control name="title" value={sectionForm.title} onChange={handleSectionChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Content</Form.Label>
                      <Form.Control as="textarea" rows={6} name="content" value={sectionForm.content} onChange={handleSectionChange} placeholder={'105 | Active Members'} />
                      <Form.Text className="text-muted">
                        One number per line, written as "value | label" (for example 50+ | Activities Per Year).
                        The "Scout Units" number is always the real number of units.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Section Type</Form.Label>
                      <Form.Select name="section_type" value={sectionForm.section_type} onChange={handleSectionChange}>
                        <option value="stats">Numbers (Home page)</option>
                        {sectionForm.section_type !== 'stats' && <option value={sectionForm.section_type}>{sectionForm.section_type} (not shown)</option>}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sort Order</Form.Label>
                      <Form.Control type="number" name="sort_order" value={sectionForm.sort_order} onChange={handleSectionChange} />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Check type="switch" label="Active" name="is_active" checked={!!sectionForm.is_active} onChange={handleSectionChange} />
                    </Form.Group>
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowSectionModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">{editSection ? 'Update' : 'Create'}</Button>
              </Modal.Footer>
            </Form>
          </Modal>
        </Tab>
      </Tabs>
    </div>
  )
}
