import { useState, useRef } from 'react'
import './App.css'

const SYSTEM_PROMPT = `You are iiQ Assist, an AI IT support agent for K-12 schools. When given a description and photo of a problem, diagnose it confidently and either: (1) provide clear step-by-step resolution instructions in plain language a non-technical teacher can follow, or (2) if the issue requires physical intervention, say you're creating a ticket and return a structured ticket with: issue summary, device type, priority (low/medium/high/urgent), recommended action, estimated resolution time. Be warm, fast, and confident. Common issues and resolutions: Chromebook won't turn on — hard reset hold power 10 seconds, check charger; Google login error — device not authorized, needs IT admin; WiFi not connecting — forget and rejoin network; Smartboard no signal — check HDMI cable, cycle Source button; Projector not displaying — check HDMI, press Source, restart; iPad not on network — check MDM profile.

IMPORTANT: When you create a ticket, respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"ticket": true, "summary": "...", "deviceType": "...", "priority": "low|medium|high|urgent", "recommendedAction": "...", "estimatedResolution": "..."}

When you resolve with steps, respond with plain text starting with a warm greeting, then numbered steps.`

const PRIORITY_COLORS = {
  low: { bg: '#dcfce7', text: '#166534', label: 'Low' },
  medium: { bg: '#fef9c3', text: '#854d0e', label: 'Medium' },
  high: { bg: '#fed7aa', text: '#9a3412', label: 'High' },
  urgent: { bg: '#fee2e2', text: '#991b1b', label: 'Urgent' },
}

function TicketCard({ ticket }) {
  const priority = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium
  const ticketNumber = `IQ-${Math.floor(10000 + Math.random() * 90000)}`

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <div className="ticket-icon">🎫</div>
        <div>
          <div className="ticket-title">Support Ticket Created</div>
          <div className="ticket-number">{ticketNumber}</div>
        </div>
        <span
          className="priority-badge"
          style={{ backgroundColor: priority.bg, color: priority.text }}
        >
          {priority.label}
        </span>
      </div>

      <div className="ticket-body">
        <TicketRow label="Issue" value={ticket.summary} />
        <TicketRow label="Device" value={ticket.deviceType} />
        <TicketRow label="Action" value={ticket.recommendedAction} />
        <TicketRow label="ETA" value={ticket.estimatedResolution} />
      </div>

      <div className="ticket-footer">
        Your IT team has been notified and will respond shortly.
      </div>
    </div>
  )
}

function TicketRow({ label, value }) {
  return (
    <div className="ticket-row">
      <span className="ticket-label">{label}</span>
      <span className="ticket-value">{value}</span>
    </div>
  )
}

function StepList({ text }) {
  const lines = text.split('\n').filter(Boolean)
  const steps = []
  const intro = []
  let inSteps = false

  for (const line of lines) {
    const stepMatch = line.match(/^(\d+)[.)]\s+(.+)/)
    if (stepMatch) {
      inSteps = true
      steps.push(stepMatch[2])
    } else if (!inSteps) {
      intro.push(line)
    }
  }

  return (
    <div className="response-text">
      {intro.length > 0 && (
        <p className="response-intro">{intro.join(' ')}</p>
      )}
      {steps.length > 0 && (
        <ol className="step-list">
          {steps.map((step, i) => (
            <li key={i} className="step-item">
              <span className="step-number">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
      {steps.length === 0 && intro.length === 0 && (
        <p>{text}</p>
      )}
    </div>
  )
}

function ImageThumb({ src }) {
  return (
    <div className="image-thumb-wrap">
      <img src={src} alt="Attached" className="image-thumb" />
    </div>
  )
}

export default function App() {
  const [issue, setIssue] = useState('')
  const [imageData, setImageData] = useState(null)
  const [imageMime, setImageMime] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const responseRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target.result
      const mime = file.type || 'image/jpeg'
      const base64 = result.split(',')[1]
      setImageData(base64)
      setImageMime(mime)
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageData(null)
    setImageMime(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function reset() {
    setIssue('')
    setImageData(null)
    setImageMime(null)
    setImagePreview(null)
    setResponse(null)
    setTicket(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!issue.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setTicket(null)

    const content = []

    if (imageData) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: imageMime, data: imageData },
      })
    }

    content.push({ type: 'text', text: issue })

    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const data = await res.json()
      const text = data.text || ''

      // Try to parse as ticket JSON
      const jsonMatch = text.match(/\{[\s\S]*"ticket"\s*:\s*true[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.ticket) {
            setTicket(parsed)
            setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            return
          }
        } catch {}
      }

      setResponse(text)
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasResponse = response !== null || ticket !== null

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <img
          src="https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png"
          alt="Incident IQ"
          className="header-logo"
        />
        <span className="header-divider" />
        <span className="logo-text">iiQ Assist</span>
      </header>

      <main className="app-main">
        {/* Hero */}
        {!hasResponse && !loading && (
          <div className="hero-section">
            <div className="hero-avatar">
              <img
                src="https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png"
                alt="Incident IQ"
                className="hero-logo"
              />
            </div>
            <h1 className="hero-title">Hi, I'm your AI IT support agent.</h1>
            <p className="hero-subtitle">What's the issue today?</p>
          </div>
        )}

        {/* Response area */}
        {(hasResponse || loading) && (
          <div ref={responseRef} className="response-section">
            {/* User message recap */}
            <div className="message-user">
              <div className="bubble-user">
                {imagePreview && <ImageThumb src={imagePreview} />}
                <p>{issue}</p>
              </div>
            </div>

            {loading && (
              <div className="message-agent">
                <div className="agent-avatar-sm">
                  <img
                    src="https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png"
                    alt="iiQ"
                    className="avatar-logo"
                  />
                </div>
                <div className="bubble-agent loading-bubble">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              </div>
            )}

            {response && (
              <div className="message-agent">
                <div className="agent-avatar-sm">
                  <img
                    src="https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png"
                    alt="iiQ"
                    className="avatar-logo"
                  />
                </div>
                <div className="bubble-agent">
                  <StepList text={response} />
                </div>
              </div>
            )}

            {ticket && (
              <div className="message-agent">
                <div className="agent-avatar-sm">
                  <img
                    src="https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png"
                    alt="iiQ"
                    className="avatar-logo"
                  />
                </div>
                <div className="bubble-agent ticket-bubble">
                  <p className="ticket-intro">
                    This issue needs hands-on attention, so I've created a support ticket for you.
                  </p>
                  <TicketCard ticket={ticket} />
                </div>
              </div>
            )}

            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}

            {hasResponse && (
              <button className="new-issue-btn" onClick={reset}>
                Report another issue
              </button>
            )}
          </div>
        )}

        {/* Input form — shown when no response yet */}
        {!hasResponse && (
          <form className="input-form" onSubmit={handleSubmit}>
            <div className="input-card">
              {imagePreview && (
                <div className="preview-wrap">
                  <img src={imagePreview} alt="Preview" className="preview-img" />
                  <button type="button" className="remove-img" onClick={removeImage} aria-label="Remove photo">✕</button>
                </div>
              )}

              <textarea
                className="issue-textarea"
                placeholder="Describe the issue…"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                rows={3}
                autoFocus
              />

              <div className="input-actions">
                <label className="photo-btn" htmlFor="photo-input">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="15" rx="2"/>
                    <circle cx="12" cy="12.5" r="3.5"/>
                    <path d="M8 5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1"/>
                  </svg>
                  {imageData ? 'Change photo' : 'Take or upload a photo'}
                </label>
                <input
                  id="photo-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden-file"
                />

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={!issue.trim() || loading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          </form>
        )}

        {error && !hasResponse && (
          <div className="error-banner standalone-error">{error}</div>
        )}
      </main>
    </div>
  )
}
