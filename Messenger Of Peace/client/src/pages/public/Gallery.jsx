import { useState, useEffect } from 'react'
import { Container, Row, Col, Badge, Modal } from 'react-bootstrap'
import { FiImage, FiVideo, FiX, FiPlay } from 'react-icons/fi'
import api from '../../services/api'

export default function Gallery() {
  const [filter, setFilter] = useState('All')
  const [showVideo, setShowVideo] = useState(false)
  const [currentVideo, setCurrentVideo] = useState('')
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  const fallbackPhotos = [
    { src: '/images/gallery/photo1.jpeg', title: 'Scout Gathering', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo2.jpeg', title: 'Community Activity', date: '2026', category: 'Community Service' },
    { src: '/images/gallery/photo3.jpeg', title: 'Outdoor Training', date: '2026', category: 'Training' },
    { src: '/images/gallery/photo4.jpeg', title: 'Team Building', date: '2026', category: 'Training' },
    { src: '/images/gallery/photo5.jpeg', title: 'Scout Camp', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo6.jpeg', title: 'Group Photo', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo7.JPEG', title: 'Scout Activity', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo8.jpeg', title: 'Community Service', date: '2026', category: 'Community Service' },
    { src: '/images/gallery/photo9.jpeg', title: 'Board Members Meeting', date: '2026', category: 'Board Members' },
    { src: '/images/gallery/photo10.jpeg', title: 'Camp Fire Night', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo11.jpeg', title: 'Scout Patrol', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo12.jpeg', title: 'Environmental Work', date: '2026', category: 'Community Service' },
    { src: '/images/gallery/photo13.JPEG', title: 'Ceremony Day', date: '2026', category: 'Ceremony' },
    { src: '/images/gallery/photo14.JPEG', title: 'Scout Parade', date: '2026', category: 'Ceremony' },
    { src: '/images/gallery/photo15.JPEG', title: 'Award Ceremony', date: '2026', category: 'Ceremony' },
    { src: '/images/gallery/photo16.jpeg', title: 'Nature Walk', date: '2026', category: 'Training' },
    { src: '/images/gallery/photo17.jpeg', title: 'Tree Planting', date: '2026', category: 'Environment' },
    { src: '/images/gallery/photo18.jpeg', title: 'First Aid Training', date: '2026', category: 'Training' },
    { src: '/images/gallery/photo19.jpeg', title: 'Camp Kigali Activity', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo20.jpeg', title: 'Scout Games', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo21.jpeg', title: 'Group Challenge', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo22.jpeg', title: 'Community Outreach', date: '2026', category: 'Community Service' },
    { src: '/images/gallery/photo23.jpeg', title: 'Scout Meeting', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo24.jpeg', title: 'Team Photo', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo25.jpeg', title: 'Camping Trip', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo26.jpeg', title: 'Scout Activity Day', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo27.jpeg', title: 'Patrol Challenge', date: '2026', category: 'Competition' },
    { src: '/images/gallery/photo28.jpeg', title: 'Scout Competition', date: '2026', category: 'Competition' },
    { src: '/images/gallery/photo29.jpeg', title: 'Annual Camp', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo30.jpeg', title: 'Scout Gathering', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo31.jpeg', title: 'Clean Up Day', date: '2026', category: 'Community Service' },
    { src: '/images/gallery/photo32.jpeg', title: 'Scout Training', date: '2026', category: 'Training' },
    { src: '/images/gallery/photo33.jpeg', title: 'Group Activity', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo34.jpeg', title: 'Scout Leaders', date: '2026', category: 'Board Members' },
    { src: '/images/gallery/photo35.jpeg', title: 'Camp Activity', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo36.jpeg', title: 'Scout March', date: '2026', category: 'Ceremony' },
    { src: '/images/gallery/photo37.jpeg', title: 'Peace Day', date: '2026', category: 'Ceremony' },
    { src: '/images/gallery/photo38.jpeg', title: 'Scout Workshop', date: '2026', category: 'Training' },
    { src: '/images/gallery/photo39.jpeg', title: 'Team Building Day', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo40.PNG', title: 'Group Portrait', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo41.PNG', title: 'Scout Badge', date: '2026', category: 'Ceremony' },
    { src: '/images/gallery/photo42.PNG', title: 'Camp Photo', date: '2026', category: 'Camping' },
    { src: '/images/gallery/photo43.PNG', title: 'Activity Day', date: '2026', category: 'Activities' },
    { src: '/images/gallery/photo44.PNG', title: 'Scout Moment', date: '2026', category: 'Events' },
    { src: '/images/gallery/photo45.PNG', title: 'Group Memory', date: '2026', category: 'Events' },
  ]

  const fallbackVideos = [
    { src: '/videos/video1.mp4', title: 'Scouts Stand Together', date: '2026', category: 'Remembrance' },
    { src: '/videos/video2.mp4', title: 'Rwandan Scout Identity', date: '2026', category: 'Culture' },
    { src: '/videos/video3.mp4', title: 'Why Join Scout Movement', date: '2026', category: 'Recruitment' },
    { src: '/videos/video4.mp4', title: 'Rwanda Iwacu Dance', date: '2026', category: 'Culture' },
    { src: '/videos/video5.mp4', title: 'Traditional Dance', date: '2026', category: 'Culture' },
    { src: '/videos/video6.mp4', title: 'Umuco Wacu Heritage', date: '2026', category: 'Culture' },
    { src: '/videos/video7.mp4', title: 'Scout Invitation', date: '2026', category: 'Recruitment' },
    { src: '/videos/video8.mp4', title: 'Scout Welcome Message', date: '2026', category: 'Recruitment' },
  ]

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const [imagesRes, galleryRes] = await Promise.allSettled([
          api.get('/gallery/images/public'),
          api.get('/gallery'),
        ])

        // Both endpoints answer { success, data: [...] }
        const listFrom = res => (res.status === 'fulfilled' && Array.isArray(res.value.data?.data) ? res.value.data.data : [])
        const apiPhotos = listFrom(imagesRes)
        const apiAlbums = listFrom(galleryRes)

        const normalizedApiPhotos = apiPhotos.filter(img => img.image_url).map(img => ({
          src: img.image_url,
          title: img.title || img.album_title || 'Untitled',
          date: img.created_at?.slice(0, 4) || '2026',
          category: img.album_title || 'Uncategorized',
        }))

        const mergedPhotos = [...normalizedApiPhotos, ...fallbackPhotos.filter(
          fp => !normalizedApiPhotos.some(ap => ap.src === fp.src)
        )]

        const normalizedApiVideos = []
        if (Array.isArray(apiAlbums)) {
          apiAlbums.forEach(album => {
            if (album.videos && Array.isArray(album.videos)) {
              album.videos.forEach(v => {
                normalizedApiVideos.push({
                  src: v.url || v.src || v.videoUrl,
                  title: v.title || v.name || album.title || 'Untitled Video',
                  date: v.date || album.date || v.createdAt?.slice(0, 4) || '2026',
                  category: v.category || album.title || 'Uncategorized',
                })
              })
            }
          })
        }

        const mergedVideos = [...normalizedApiVideos, ...fallbackVideos.filter(
          fv => !normalizedApiVideos.some(av => av.src === fv.src)
        )]

        setPhotos(mergedPhotos.length > 0 ? mergedPhotos : fallbackPhotos)
        setVideos(mergedVideos.length > 0 ? mergedVideos : fallbackVideos)
        setAlbums(apiAlbums)
      } catch {
        setPhotos(fallbackPhotos)
        setVideos(fallbackVideos)
      } finally {
        setLoading(false)
      }
    }

    fetchGallery()
  }, [])

  const categories = ['All', 'Photos', 'Videos']

  const allMedia = [
    ...photos.map(p => ({ ...p, type: 'photo' })),
    ...videos.map(v => ({ ...v, type: 'video' })),
  ]

  const filtered = filter === 'All' ? allMedia : allMedia.filter(m =>
    filter === 'Photos' ? m.type === 'photo' : m.type === 'video'
  )

  const openVideo = (src) => {
    setCurrentVideo(src)
    setShowVideo(true)
  }

  if (loading) {
    return (
      <div>
        <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
          <div className="hero-slideshow">
            <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg4.jpeg')" }}></div>
            <div className="hero-slide" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
            <div className="hero-slide" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
          </div>
          <div className="hero-particles">
            <span></span><span></span><span></span>
            <span></span><span></span>
          </div>
          <Container>
            <div className="position-relative" style={{ zIndex: 2 }}>
              <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Gallery</h1>
              <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
                Moments captured from our activities, events, and scouting adventures
              </p>
            </div>
          </Container>
        </section>
        <section className="py-5">
          <Container>
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading gallery...</p>
            </div>
          </Container>
        </section>
      </div>
    )
  }

  return (
    <div>
      <section className="mop-hero text-center" style={{ padding: '4rem 0' }}>
        <div className="hero-slideshow">
          <div className="hero-slide active" style={{ backgroundImage: "url('/images/bg4.jpeg')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg1.PNG')" }}></div>
          <div className="hero-slide" style={{ backgroundImage: "url('/images/bg3.jpeg')" }}></div>
        </div>
        <div className="hero-particles">
          <span></span><span></span><span></span>
          <span></span><span></span>
        </div>
        <Container>
          <div className="position-relative" style={{ zIndex: 2 }}>
            <h1 className="mb-3 page-hero-title" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>Gallery</h1>
            <p className="lead mx-auto page-hero-subtitle" style={{ maxWidth: 600, color: '#fff', opacity: 1, textShadow: '0 1px 10px rgba(0,0,0,0.2)' }}>
              Moments captured from our activities, events, and scouting adventures
            </p>
          </div>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          <div className="d-flex flex-wrap gap-2 mb-4 justify-content-center animate-fade-up">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-center mb-4 animate-fade-up">
            <Badge bg="secondary" className="fs-6 px-3 py-2">
              {filter === 'All' ? `${allMedia.length} items` : filter === 'Photos' ? `${photos.length} photos` : `${videos.length} videos`}
            </Badge>
          </div>

          <Row className="g-4 animate-row">
            {filtered.map((item, idx) => (
              <Col lg={4} md={6} key={idx} className="animate-card">
                <div className="gallery-item" onClick={() => item.type === 'video' && openVideo(item.src)}>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      height: 250,
                      background: 'linear-gradient(135deg, #F3E8FF, #e9d5ff)',
                    }}
                  >
                    {item.type === 'photo' ? (
                      <img src={item.src} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="position-relative w-100 h-100">
                        <video
                          src={item.src}
                          muted
                          preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onMouseOver={(e) => e.target.play()}
                          onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                        />
                        <div className="position-absolute top-50 start-50 translate-middle">
                          <div className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{ width: 60, height: 60, background: 'rgba(107,33,168,0.85)', cursor: 'pointer' }}>
                            <FiPlay size={24} color="#fff" style={{ marginLeft: 3 }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="gallery-overlay p-3">
                    <h6 className="mb-1">{item.title}</h6>
                    <small>{item.date} &middot; {item.category}</small>
                    {item.type === 'video' && (
                      <div className="mt-1"><Badge bg="danger" className="small"><FiVideo className="me-1" />Video</Badge></div>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {filtered.length === 0 && (
            <div className="text-center py-5 text-muted">
              <p className="lead animate-text-reveal">No media items found.</p>
            </div>
          )}
        </Container>
      </section>

      <Modal show={showVideo} onHide={() => setShowVideo(false)} size="lg" centered>
        <Modal.Header className="border-0 pb-0">
          <button type="button" className="btn-close" onClick={() => setShowVideo(false)}></button>
        </Modal.Header>
        <Modal.Body className="p-0">
          <video
            src={currentVideo}
            controls
            autoPlay
            style={{ width: '100%', borderRadius: '0 0 12px 12px' }}
          />
        </Modal.Body>
      </Modal>
    </div>
  )
}
