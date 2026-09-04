import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiNavigation, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function NavigationManagement() {
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    label: '', url: '', parent_id: '', sort_order: 0, is_active: 1, opens_new_tab: 0, icon: ''
  })

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const res = await api.get('/navigation/admin')
      const data = res.data.data || res.data || []
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        parent_id: form.parent_id || null
      }
      if (editItem) {
        await api.put(`/navigation/${editItem.id}`, payload)
        toast.success('Navigation item updated')
      } else {
        await api.post('/navigation', payload)
        toast.success('Navigation item created')
      }
      setShowModal(false)
      resetForm()
      fetchItems()
    } catch {
      toast.error('Operation failed')
    }
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({
      label: item.label || '',
      url: item.url || '',
      parent_id: item.parent_id || '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== undefined ? item.is_active : 1,
      opens_new_tab: item.opens_new_tab || 0,
      icon: item.icon || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this navigation item?')) return
    try {
      await api.delete(`/navigation/${id}`)
      toast.success('Deleted')
      fetchItems()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const toggleActive = async (item) => {
    try {
      await api.put(`/navigation/${item.id}`, { ...item, is_active: item.is_active ? 0 : 1 })
      toast.success('Status updated')
      fetchItems()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const moveItem = async (item, direction) => {
    try {
      await api.put(`/navigation/${item.id}`, { ...item, sort_order: (item.sort_order || 0) + direction })
      toast.success('Order updated')
      fetchItems()
    } catch {
      toast.error('Failed to reorder')
    }
  }

  const resetForm = () => {
    setEditItem(null)
    setForm({ label: '', url: '', parent_id: '', sort_order: 0, is_active: 1, opens_new_tab: 0, icon: '' })
  }

  const buildTree = (list, parentId = null) => {
    return list
      .filter(item => (item.parent_id || null) === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }

  const flattenTree = (list, parentId = null, level = 0) => {
    const children = buildTree(list, parentId)
    let result = []
    for (const child of children) {
      result.push({ ...child, _level: level })
      result = result.concat(flattenTree(list, child.id, level + 1))
    }
    return result
  }

  const topLevelItems = items.filter(i => !i.parent_id || i.parent_id === null || i.parent_id === '')
  const totalItems = items.length
  const activeItems = items.filter(i => i.is_active === 1 || i.is_active === true).length
  const sortedItems = flattenTree(items)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiNavigation className="me-2" /> Navigation Management</h4>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true) }}>
          <FiPlus className="me-1" /> Add Item
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{totalItems}</div>
            <div className="kpi-label">Total Items</div>
          </div>
        </Col>
        <Col md={6}>
          <div className="kpi-card" style={{ borderLeftColor: '#7C3AED' }}>
            <div className="kpi-value" style={{ color: '#7C3AED' }}>{activeItems}</div>
            <div className="kpi-label">Active Items</div>
          </div>
        </Col>
      </Row>

      <div className="mop-card">
        <div className="table-responsive">
          <Table className="mop-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Label</th>
                <th>URL</th>
                <th>Parent</th>
                <th>Order</th>
                <th>Active</th>
                <th>New Tab</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, idx) => {
                const parent = items.find(p => p.id === item.parent_id)
                return (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td className="fw-semibold">
                      <span style={{ paddingLeft: (item._level || 0) * 24 }}>
                        {item._level > 0 && <span className="text-muted me-1">&#8627;</span>}
                        {item.label}
                      </span>
                    </td>
                    <td><code>{item.url || '-'}</code></td>
                    <td>{parent ? <Badge bg="secondary">{parent.label}</Badge> : <Badge bg="light" text="dark">Top Level</Badge>}</td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <span className="me-2">{item.sort_order || 0}</span>
                        <Button variant="outline-secondary" size="sm" onClick={() => moveItem(item, -1)}><FiArrowUp /></Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => moveItem(item, 1)}><FiArrowDown /></Button>
                      </div>
                    </td>
                    <td>
                      <Form.Check
                        type="switch"
                        checked={item.is_active === 1 || item.is_active === true}
                        onChange={() => toggleActive(item)}
                      />
                    </td>
                    <td>
                      {item.opens_new_tab ? <Badge bg="info">Yes</Badge> : <Badge bg="light" text="muted">No</Badge>}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(item)}><FiEdit2 /></Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}><FiTrash2 /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr><td colSpan="8" className="text-center py-4 text-muted">
                  {loading ? 'Loading...' : 'No navigation items'}
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? 'Edit Navigation Item' : 'Add Navigation Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Label *</Form.Label>
              <Form.Control name="label" value={form.label} onChange={handleChange} required placeholder="e.g. Home, About Us" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>URL *</Form.Label>
              <Form.Control name="url" value={form.url} onChange={handleChange} required placeholder="e.g. /about, https://example.com" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Parent (for nesting)</Form.Label>
              <Form.Select name="parent_id" value={form.parent_id} onChange={handleChange}>
                <option value="">None (Top Level)</option>
                {items
                  .filter(i => !editItem || i.id !== editItem.id)
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map(i => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))
                }
              </Form.Select>
              <small className="text-muted">Leave empty for top-level items. Select a parent to create a dropdown/nested item.</small>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Icon (class name)</Form.Label>
              <Form.Control name="icon" value={form.icon} onChange={handleChange} placeholder="e.g. fi-home, fi-star" />
            </Form.Group>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Sort Order</Form.Label>
                  <Form.Control type="number" name="sort_order" value={form.sort_order} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <Form.Check type="switch" label="Active" name="is_active" checked={!!form.is_active} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <Form.Check type="switch" label="New Tab" name="opens_new_tab" checked={!!form.opens_new_tab} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editItem ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
