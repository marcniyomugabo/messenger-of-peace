import { useState, useEffect, useRef } from 'react'
import { Table, Button, Modal, Form, Badge, Row, Col, Tab, Tabs } from 'react-bootstrap'
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiCamera, FiUpload, FiX } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function GalleryManagement() {
  const [albums, setAlbums] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('albums')
  const [showAlbumModal, setShowAlbumModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [editAlbum, setEditAlbum] = useState(null)
  const [albumForm, setAlbumForm] = useState({ title: '', description: '', cover_image: '', status: 'published' })
  const [imageForm, setImageForm] = useState({ title: '', caption: '', album_id: '', image_url: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedAlbumForImages, setSelectedAlbumForImages] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchAlbums(); fetchAllImages() }, [])

  const fetchAlbums = async () => {
    try {
      const res = await api.get('/gallery/admin')
      const data = res.data.data || res.data || []
      setAlbums(Array.isArray(data) ? data : [])
    } catch {
      setAlbums([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAllImages = async () => {
    try {
      const res = await api.get('/gallery/images')
      const data = res.data.data || res.data || []
      setImages(Array.isArray(data) ? data : [])
    } catch {
      setImages([])
    }
  }

  const fetchImagesForAlbum = async (albumId) => {
    try {
      const res = await api.get(`/gallery/images?album_id=${albumId}`)
      const data = res.data.data || res.data || []
      setImages(Array.isArray(data) ? data : [])
    } catch {
      setImages([])
    }
  }

  const handleAlbumChange = (e) => {
    const { name, value } = e.target
    setAlbumForm({ ...albumForm, [name]: value })
  }

  const handleImageChange = (e) => {
    const { name, value } = e.target
    setImageForm({ ...imageForm, [name]: value })
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageForm({ ...imageForm, image_url: '' })
  }

  const removeSelectedFile = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAlbumSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editAlbum) {
        await api.put(`/gallery/${editAlbum.id}`, albumForm)
        toast.success('Album updated')
      } else {
        await api.post('/gallery', albumForm)
        toast.success('Album created')
      }
      setShowAlbumModal(false)
      resetAlbumForm()
      fetchAlbums()
    } catch {
      toast.error('Operation failed')
    }
  }

  const handleImageSubmit = async (e) => {
    e.preventDefault()
    if (!imageForm.album_id) { toast.error('Please select an album'); return }
    if (!imageFile && !imageForm.image_url) { toast.error('Please upload a file or enter an image URL'); return }

    setUploading(true)
    try {
      let mediaId = imageForm.media_id || null

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const uploadData = uploadRes.data.data || uploadRes.data
        imageForm.image_url = uploadData.file_path
      }

      await api.post('/gallery/images', {
        album_id: imageForm.album_id,
        media_id: mediaId,
        title: imageForm.title || null,
        caption: imageForm.caption || null,
        image_url: imageForm.image_url || null,
      })
      toast.success('Image added')
      setShowImageModal(false)
      resetImageForm()
      fetchAllImages()
      if (selectedAlbumForImages) fetchImagesForAlbum(selectedAlbumForImages)
    } catch (err) {
      toast.error('Failed to add image')
    } finally {
      setUploading(false)
    }
  }

  const handleEditAlbum = (album) => {
    setEditAlbum(album)
    setAlbumForm({
      title: album.title || '', description: album.description || '',
      cover_image: album.cover_image || '', status: album.status || 'published'
    })
    setShowAlbumModal(true)
  }

  const handleDeleteAlbum = async (id) => {
    if (!window.confirm('Delete this album and all its images?')) return
    try {
      await api.delete(`/gallery/${id}`)
      toast.success('Album deleted')
      fetchAlbums()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Delete this image?')) return
    try {
      await api.delete(`/gallery/images/${id}`)
      toast.success('Image deleted')
      fetchAllImages()
      if (selectedAlbumForImages) fetchImagesForAlbum(selectedAlbumForImages)
    } catch {
      toast.error('Failed to delete')
    }
  }

  const resetAlbumForm = () => {
    setEditAlbum(null)
    setAlbumForm({ title: '', description: '', cover_image: '', status: 'published' })
  }

  const resetImageForm = () => {
    setImageForm({ title: '', caption: '', album_id: '', media_id: '', image_url: '' })
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const statusBadge = (status) => {
    const variants = { published: 'success', draft: 'warning', archived: 'secondary', Published: 'success', Draft: 'warning', Archived: 'secondary' }
    return <Badge bg={variants[status] || 'secondary'}>{status || 'published'}</Badge>
  }

  const publishedAlbums = albums.filter(a => a.status === 'published' || a.status === 'Published').length
  const totalImages = images.length

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><FiCamera className="me-2" /> Gallery Management</h4>
        <Button variant="primary" onClick={() => {
          resetAlbumForm()
          setShowAlbumModal(true)
        }}>
          <FiPlus className="me-1" /> New Album
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#6B21A8' }}>
            <div className="kpi-value">{albums.length}</div>
            <div className="kpi-label">Total Albums</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#16A34A' }}>
            <div className="kpi-value" style={{ color: '#16A34A' }}>{publishedAlbums}</div>
            <div className="kpi-label">Published Albums</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="kpi-card" style={{ borderLeftColor: '#3B82F6' }}>
            <div className="kpi-value" style={{ color: '#3B82F6' }}>{totalImages}</div>
            <div className="kpi-label">Total Images</div>
          </div>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="albums" title="Albums">
          <div className="mop-card">
            <div className="table-responsive">
              <Table className="mop-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Images</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {albums.map((album, idx) => (
                    <tr key={album.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-semibold">{album.title}</td>
                      <td>
                        <Badge bg="info">{album.image_count || album.images?.length || 0}</Badge>
                      </td>
                      <td>{statusBadge(album.status)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button variant="outline-info" size="sm" onClick={() => {
                            setSelectedAlbumForImages(album.id)
                            fetchImagesForAlbum(album.id)
                            setActiveTab('images')
                          }} title="View Images"><FiImage /></Button>
                          <Button variant="outline-secondary" size="sm" onClick={() => handleEditAlbum(album)} title="Edit"><FiEdit2 /></Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAlbum(album.id)} title="Delete"><FiTrash2 /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {albums.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-4 text-muted">
                      {loading ? 'Loading...' : 'No albums found'}
                    </td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </Tab>

        <Tab eventKey="images" title="Images">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex gap-2 align-items-center">
              <Form.Select style={{ width: 'auto' }} value={selectedAlbumForImages || ''} onChange={(e) => {
                const val = e.target.value
                setSelectedAlbumForImages(val || null)
                if (val) fetchImagesForAlbum(val)
                else fetchAllImages()
              }}>
                <option value="">All Albums</option>
                {albums.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </Form.Select>
            </div>
            <Button variant="primary" size="sm" onClick={() => { resetImageForm(); setShowImageModal(true) }}>
              <FiUpload className="me-1" /> Upload Image
            </Button>
          </div>
          <div className="mop-card">
            <div className="table-responsive">
              <Table className="mop-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Album</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {images.map((img, idx) => (
                    <tr key={img.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <img
                          src={img.image_url || img.file_path || img.url}
                          alt={img.title}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      </td>
                      <td className="fw-semibold">{img.title || img.caption || '-'}</td>
                      <td>{img.album_title || albums.find(a => a.id === img.album_id)?.title || '-'}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteImage(img.id)} title="Delete"><FiTrash2 /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {images.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-4 text-muted">No images found</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </Tab>
      </Tabs>

      <Modal show={showAlbumModal} onHide={() => setShowAlbumModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editAlbum ? 'Edit Album' : 'Create Album'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAlbumSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control name="title" value={albumForm.title} onChange={handleAlbumChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={albumForm.description} onChange={handleAlbumChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Cover Image URL</Form.Label>
              <Form.Control name="cover_image" value={albumForm.cover_image} onChange={handleAlbumChange} placeholder="https://..." />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" value={albumForm.status} onChange={handleAlbumChange}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAlbumModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editAlbum ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FiUpload className="me-2" />Upload Image</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleImageSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Album *</Form.Label>
              <Form.Select name="album_id" value={imageForm.album_id} onChange={handleImageChange} required>
                <option value="">Select album</option>
                {albums.filter(a => a.status === 'published' || a.status === 'Published' || a.status === 'draft' || a.status === 'Draft').map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Choose Image *</Form.Label>
              <div className="border rounded p-3 text-center" style={{ background: '#F9FAFB', borderStyle: imageFile ? 'solid' : 'dashed' }}>
                {imagePreview ? (
                  <div>
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 8 }} />
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={removeSelectedFile}>
                        <FiX className="me-1" />Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', padding: '20px 0' }}>
                    <FiUpload size={40} style={{ color: '#9CA3AF' }} />
                    <p className="mt-2 mb-1 fw-semibold" style={{ color: '#374151' }}>Click to select an image</p>
                    <small className="text-muted">JPG, PNG, GIF, WebP (max 5MB)</small>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>
            </Form.Group>

            {!imageFile && (
              <Form.Group className="mb-3">
                <Form.Label>Or enter Image URL</Form.Label>
                <Form.Control name="image_url" value={imageForm.image_url} onChange={handleImageChange} placeholder="https://example.com/image.jpg" />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control name="title" value={imageForm.title} onChange={handleImageChange} placeholder="Image title" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Caption</Form.Label>
              <Form.Control name="caption" value={imageForm.caption} onChange={handleImageChange} placeholder="Image caption" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowImageModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}
