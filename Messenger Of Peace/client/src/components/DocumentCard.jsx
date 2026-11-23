import { FiDownload, FiExternalLink, FiFileText, FiFile, FiMonitor, FiImage } from 'react-icons/fi'

// One downloadable document, shown the same way on the Library and Information pages.
// The tile shows the kind of file, so visitors know what they will get before downloading.
const TYPES = {
  pdf: { label: 'PDF', name: 'PDF document', color: '#DC2626', bg: '#FEF2F2', icon: <FiFileText /> },
  ppt: { label: 'PPT', name: 'PowerPoint', color: '#EA580C', bg: '#FFF7ED', icon: <FiMonitor /> },
  pptx: { label: 'PPTX', name: 'PowerPoint', color: '#EA580C', bg: '#FFF7ED', icon: <FiMonitor /> },
  doc: { label: 'DOC', name: 'Word document', color: '#2563EB', bg: '#EFF6FF', icon: <FiFileText /> },
  docx: { label: 'DOCX', name: 'Word document', color: '#2563EB', bg: '#EFF6FF', icon: <FiFileText /> },
  jpg: { label: 'JPG', name: 'Picture', color: '#16A34A', bg: '#F0FDF4', icon: <FiImage /> },
  jpeg: { label: 'JPG', name: 'Picture', color: '#16A34A', bg: '#F0FDF4', icon: <FiImage /> },
  png: { label: 'PNG', name: 'Picture', color: '#16A34A', bg: '#F0FDF4', icon: <FiImage /> },
}
const OTHER = { label: 'FILE', name: 'File', color: 'var(--mop-primary)', bg: 'var(--mop-light)', icon: <FiFile /> }

export const fileType = (path) => {
  const ext = String(path || '').split('?')[0].split('.').pop().toLowerCase()
  return TYPES[ext] || OTHER
}

// href: the file's web address, already encoded. Only PDFs can be read in the browser ("View").
export default function DocumentCard({ title, category, subtitle, description, href }) {
  const type = fileType(href)
  const hasFile = !!href && href !== '#'
  return (
    <article className="doc-card h-100">
      <div className="doc-card-top">
        <div className="doc-card-type" style={{ color: type.color, background: type.bg }} aria-hidden="true">
          <span className="doc-card-type-icon">{type.icon}</span>
          <span className="doc-card-type-label">{type.label}</span>
        </div>
        {category && <span className="doc-card-category">{category}</span>}
      </div>
      <h5 className="doc-card-title" title={title}>{title}</h5>
      {subtitle && <div className="doc-card-subtitle">{subtitle}</div>}
      {description && <p className="doc-card-desc">{description}</p>}
      <div className="doc-card-footer">
        <span className="doc-card-kind">{hasFile ? type.name : 'Not available yet'}</span>
        {hasFile && (
          <div className="d-flex gap-2">
            {type.label === 'PDF' && (
              <a className="btn btn-sm btn-outline-primary" href={href} target="_blank" rel="noopener noreferrer" title="Open in a new tab">
                <FiExternalLink className="me-1" />View
              </a>
            )}
            <a className="btn btn-sm btn-primary" href={href} download>
              <FiDownload className="me-1" />Download
            </a>
          </div>
        )}
      </div>
    </article>
  )
}
