import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiNavigation, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

// The website's top menu (Navbar). Items are shown in order; the menu has no drop-downs.
const EMPTY = { label: '', url: '', sort_order: '', is_active: 1, opens_new_tab: 0 }

export default function NavigationManagement() {
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const res = await api.get('/navigation/admin')
      const data = res.data.data || []
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setItems([])
      toast.error(err.response?.data?.message || 'Could not load the menu')
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id)
  const activeItems = items.filter(i => i.is_active).length

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value })
  }

  const openNew = () => {
    setEditItem(null)
    const last = sorted.length ? sorted[sorted.length - 1].sort_order || 0 : 0
    setForm({ ...EMPTY, sort_order: String(last + 1) })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      label: item.label || '',
      url: item.url || '',
      sort_order: String(item.sort_order ?? ''),
      is_active: item.is_active ? 1 : 0,
      opens_new_tab: item.opens_new_tab ? 1 : 0,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      // parent_id: null makes an old sub-item a normal menu item again.
      const payload = { ...form, sort_order: Number(form.sort_order) || 0, parent_id: null }
      if (editItem) {
        await api.put(`/navigation/${editItem.id}`, payload)
        toast.success('Menu item updated')
      } else {
        await api.post('/navigation', payload)
        toast.success('Menu item added')
      }
      setShowModal(false)
      fetchItems()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.label}" from the menu? To hide it for a while instead, switch it off.`)) return
    try {
      await api.delete(`/navigation/${item.id}`)
      toast.success('Menu item removed')
      fetchItems()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove')
    }
  }

  const toggleActive = async (item) => {
    try {
      await api.put(`/navigation/${item.id}`, { is_active: item.is_active ? 0 : 1 })
      toast.success(item.is_active ? 'Hidden from the menu' : 'Shown in the menu')
      fetchItems()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  // Swap places with the item above or below.
  const moveItem = async (index, direction) => {
    const a = sorted[index]
    const b = sorted[index + direction]
    if (!a || !b) return
    setBusy(true)
    try {
      // Equal numbers (from older data) would not change the order, so use positions instead.
      const orderA = a.sort_order === b.sort_order ? index + 1 : a.sort_order
      const orderB = a.sort_order === b.sort_order ? index + 1 + direction : b.sort_order
      await api.put(`/navigation/${a.id}`, { sort_order: orderB })
      await api.put(`/navigation/${b.id}`, { sort_order: orderA })
      fetchItems()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reorder')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiNavigation className="me-2" /> Navigation Management</h4>
        <Button variant="primary" onClick={openNew}>
          <FiPlus className="me-1" /> Add Item
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{items.length}</div>
            <div className="kpi-label">Total Items</div>
          </div>
        </Col>
        <Col md={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{activeItems}</div>
            <div className="kpi-label">Shown in the menu</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>Position</th>
                <th>Label</th>
                <th>Link</th>
                <th>Shown</th>
                <th>New Tab</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr key={item.id} className={item.is_active ? '' : 'text-muted'}>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <span className="me-2">{idx + 1}</span>
                      <Button variant="outline-secondary" size="sm" title="Move up" disabled={busy || idx === 0} onClick={() => moveItem(idx, -1)}><FiArrowUp /></Button>
                      <Button variant="outline-secondary" size="sm" title="Move down" disabled={busy || idx === sorted.length - 1} onClick={() => moveItem(idx, 1)}><FiArrowDown /></Button>
                    </div>
                  </td>
                  <td className="fw-semibold">
                    {item.label}
                    {item.parent_id && <Badge bg="warning" text="dark" className="ms-2" title="Sub-items are not shown. Edit and save to make it a normal item.">Not shown: sub-item</Badge>}
                  </td>
                  <td><code>{item.url || '-'}</code></td>
                  <td>
                    <Form.Check type="switch" checked={!!item.is_active} onChange={() => toggleActive(item)} aria-label="Shown in the menu" />
                  </td>
                  <td>{item.opens_new_tab ? <Badge bg="info">Yes</Badge> : <Badge bg="light" text="muted">No</Badge>}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-secondary" size="sm" title="Edit" onClick={() => handleEdit(item)}><FiEdit2 /></Button>
                      <Button variant="outline-danger" size="sm" title="Remove" onClick={() => handleDelete(item)}><FiTrash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No menu items: the website shows its standard menu.'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Label *</Form.Label>
              <Form.Control name="label" value={form.label} onChange={handleChange} required placeholder="e.g. About Us" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Link *</Form.Label>
              <Form.Control name="url" value={form.url} onChange={handleChange} required placeholder="e.g. /about or https://example.com" />
              <Form.Text className="text-muted">A page of this website starts with "/" (for example /units). Another website starts with https://</Form.Text>
            </Form.Group>
            <Row className="g-3">
              <Col xs={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Position</Form.Label>
                  <Form.Control type="number" name="sort_order" value={form.sort_order} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col xs={4}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <Form.Check type="switch" label="Shown" name="is_active" checked={!!form.is_active} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col xs={4}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <Form.Check type="switch" label="New Tab" name="opens_new_tab" checked={!!form.opens_new_tab} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy}>{editItem ? 'Update' : 'Add'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
