import { rateColor, markStyle } from '../../utils/attendance'

// Rate as a short coloured bar with the percentage ("–" when there is nothing to count yet).
export function RateBar({ rate, width = 80 }) {
  const color = rateColor(rate)
  return (
    <div className="d-flex align-items-center gap-2" title={rate == null ? 'No registers to count yet' : `${rate}% attended`}>
      <div className="att-rate-track" style={{ width }}>
        <div className="att-rate-fill" style={{ width: `${rate || 0}%`, background: color }} />
      </div>
      <span className="fw-semibold small" style={{ color, minWidth: 36 }}>{rate == null ? '–' : `${rate}%`}</span>
    </div>
  )
}

// A mark as a small coloured pill (Present, Late, Absent, Excused, or "Not marked").
export function MarkPill({ status }) {
  const s = markStyle(status)
  if (!s) return <span className="att-pill" style={{ color: '#6B7280', background: '#F3F4F6' }}>Not marked</span>
  return <span className="att-pill" style={{ color: s.color, background: s.bg }}>{status}</span>
}

// The P / L / A / E buttons for one member.
export function MarkButtons({ value, onChange, disabled, name }) {
  return (
    <div className="att-marks" role="radiogroup" aria-label={`Attendance for ${name}`}>
      {['Present', 'Late', 'Absent', 'Excused'].map(v => {
        const s = markStyle(v)
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            className={`att-mark ${on ? 'on' : ''}`}
            style={on ? { background: s.color, borderColor: s.color, color: '#fff' } : { color: s.color, borderColor: '#E5E7EB' }}
            onClick={() => onChange(v)}
            title={v}
          >
            <span className="d-none d-md-inline">{v}</span>
            <span className="d-md-none">{s.short}</span>
          </button>
        )
      })}
    </div>
  )
}
