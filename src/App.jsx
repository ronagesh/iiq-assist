import { useState, useRef, useEffect } from 'react'
import './App.css'

const LOGO_URL = 'https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png'

const PRIORITY_COLORS = {
  low:    { bg: '#dcfce7', text: '#166534', label: 'Low' },
  medium: { bg: '#fef9c3', text: '#854d0e', label: 'Medium' },
  high:   { bg: '#fed7aa', text: '#9a3412', label: 'High' },
  urgent: { bg: '#fee2e2', text: '#991b1b', label: 'Urgent' },
}

// ── Parse raw Claude text into a typed response object ──────────────────────
function parseResponse(text) {
  const ticketMatch = text.match(/\{[\s\S]*?"ticket"\s*:\s*true[\s\S]*?\}/)
  if (ticketMatch) {
    try {
      const parsed = JSON.parse(ticketMatch[0])
      if (parsed.ticket) return { type: 'ticket', ticket: parsed }
    } catch {}
  }
  const followMatch = text.match(/\{[\s\S]*?"followUp"\s*:\s*true[\s\S]*?\}/)
  if (followMatch) {
    try {
      const parsed = JSON.parse(followMatch[0])
      if (parsed.followUp && parsed.question) return { type: 'followUp', question: parsed.question }
    } catch {}
  }
  return { type: 'resolution', text }
}

// ── Sub-components ───────────────────────────────────────────────────────────
function AgentAvatar() {
  return (
    <div className="agent-avatar-sm">
      <img src={LOGO_URL} alt="iiQ" className="avatar-logo" />
    </div>
  )
}

function TicketCard({ ticket }) {
  const priority = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium
  const ticketNumber = useRef(`IQ-${Math.floor(10000 + Math.random() * 90000)}`).current
  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <div className="ticket-icon">🎫</div>
        <div>
          <div className="ticket-title">Support Ticket Created</div>
          <div className="ticket-number">{ticketNumber}</div>
        </div>
        <span className="priority-badge" style={{ backgroundColor: priority.bg, color: priority.text }}>
          {priority.label}
        </span>
      </div>
      <div className="ticket-body">
        <TicketRow label="Issue"  value={ticket.summary} />
        <TicketRow label="Device" value={ticket.deviceType} />
        <TicketRow label="Action" value={ticket.recommendedAction} />
        <TicketRow label="ETA"    value={ticket.estimatedResolution} />
      </div>
      <div className="ticket-footer">Your IT team has been notified and will respond shortly.</div>
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
    const m = line.match(/^(\d+)[.)]\s+(.+)/)
    if (m) { inSteps = true; steps.push(m[2]) }
    else if (!inSteps) intro.push(line)
  }
  return (
    <div className="response-text">
      {intro.length > 0 && <p className="response-intro">{intro.join(' ')}</p>}
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
      {steps.length === 0 && intro.length === 0 && <p>{text}</p>}
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

// ── Thread message renderers ─────────────────────────────────────────────────
function UserMessage({ item }) {
  return (
    <div className="message-user">
      <div className="bubble-user">
        {item.imagePreview && <ImageThumb src={item.imagePreview} />}
        <p>{item.text}</p>
      </div>
    </div>
  )
}

function AssistantMessage({ item }) {
  return (
    <div className="message-agent">
      <AgentAvatar />
      <div className={`bubble-agent${item.type === 'ticket' ? ' ticket-bubble' : ''}`}>
        {item.type === 'resolution' && <StepList text={item.text} />}
        {item.type === 'followUp'   && <p className="followup-question">{item.question}</p>}
        {item.type === 'ticket'     && (
          <>
            <p className="ticket-intro">This issue needs hands-on attention, so I've created a support ticket for you.</p>
            <TicketCard ticket={item.ticket} />
          </>
        )}
      </div>
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="message-agent">
      <AgentAvatar />
      <div className="bubble-agent loading-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Initial form
  const [issue, setIssue]           = useState('')
  const [imageData, setImageData]   = useState(null)
  const [imageMime, setImageMime]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Conversation
  const [thread, setThread]           = useState([])   // display items
  const [apiMessages, setApiMessages] = useState([])   // full history sent to API
  const [phase, setPhase]             = useState('input') // 'input' | 'chat' | 'done'
  const [followUpInput, setFollowUpInput] = useState('')

  // Status
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fileInputRef  = useRef(null)
  const bottomRef     = useRef(null)
  const followUpRef   = useRef(null)

  // Scroll to bottom whenever thread grows or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, loading])

  // Focus the reply input whenever the assistant responds
  useEffect(() => {
    if (isChat && !loading) followUpRef.current?.focus()
  }, [thread, loading])

  // ── API call ───────────────────────────────────────────────────────────────
  async function callAPI(messages) {
    const res = await fetch('/api/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Server error ${res.status}`)
    }
    const data = await res.json()
    return data.text || ''
  }

  function applyResponse(rawText, prevMessages) {
    const parsed = parseResponse(rawText)
    const updatedMessages = [...prevMessages, { role: 'assistant', content: rawText }]
    setApiMessages(updatedMessages)
    setThread(prev => [...prev, { role: 'assistant', ...parsed }])
    if (parsed.type !== 'followUp') setPhase('done')
  }

  // ── Initial submit ─────────────────────────────────────────────────────────
  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target.result
      setImageData(result.split(',')[1])
      setImageMime(file.type || 'image/jpeg')
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageData(null); setImageMime(null); setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleInitialSubmit(e) {
    e.preventDefault()
    if (!issue.trim() || loading) return

    const userContent = []
    if (imageData) userContent.push({ type: 'image', source: { type: 'base64', media_type: imageMime, data: imageData } })
    userContent.push({ type: 'text', text: issue })

    const newMessages = [{ role: 'user', content: userContent }]

    setThread([{ role: 'user', text: issue, imagePreview }])
    setPhase('chat')
    setLoading(true)
    setError(null)

    try {
      const rawText = await callAPI(newMessages)
      applyResponse(rawText, newMessages)
    } catch (err) {
      setError(err.message)
      setPhase('input')
    } finally {
      setLoading(false)
    }
  }

  // ── Follow-up submit ───────────────────────────────────────────────────────
  async function handleFollowUpSubmit(e) {
    e.preventDefault()
    const text = followUpInput.trim()
    if (!text || loading) return

    setFollowUpInput('')
    const newMessages = [...apiMessages, { role: 'user', content: text }]
    setThread(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    setError(null)

    try {
      const rawText = await callAPI(newMessages)
      applyResponse(rawText, newMessages)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Follow-up send on Enter (no shift) ─────────────────────────────────────
  function handleFollowUpKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleFollowUpSubmit(e)
    }
  }

  function reset() {
    setIssue(''); setImageData(null); setImageMime(null); setImagePreview(null)
    setThread([]); setApiMessages([]); setPhase('input')
    setFollowUpInput(''); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isChat = phase === 'chat' || phase === 'done'
  const showReplyBar = isChat && !loading
  const lastAssistant = [...thread].reverse().find(m => m.role === 'assistant')
  const replyPlaceholder = lastAssistant?.type === 'followUp' ? 'Type your reply…' : 'Ask a follow-up…'

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={LOGO_URL} alt="Incident IQ" className="header-logo" />
        <span className="header-divider" />
        <span className="logo-text">iiQ Assist</span>
      </header>

      <main className={`app-main${isChat ? ' app-main--chat' : ''}`}>

        {/* ── Landing hero + initial form ── */}
        {phase === 'input' && (
          <>
            <div className="hero-section">
              <div className="hero-avatar">
                <img src={LOGO_URL} alt="Incident IQ" className="hero-logo" />
              </div>
              <h1 className="hero-title">Hi, I'm your AI IT support agent.</h1>
              <p className="hero-subtitle">What's the issue today?</p>
            </div>

            <form className="input-form" onSubmit={handleInitialSubmit}>
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
                  <input id="photo-input" ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden-file" />
                  <button type="submit" className="submit-btn" disabled={!issue.trim() || loading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            {error && <div className="error-banner standalone-error">{error}</div>}
          </>
        )}

        {/* ── Conversation thread ── */}
        {isChat && (
          <div className="thread">
            {thread.map((item, i) =>
              item.role === 'user'
                ? <UserMessage key={i} item={item} />
                : <AssistantMessage key={i} item={item} />
            )}
            {loading && <LoadingBubble />}
            {error && <div className="error-banner">{error}</div>}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* ── Sticky reply bar ── */}
      {showReplyBar && (
        <div className="followup-bar">
          <form className="followup-form" onSubmit={handleFollowUpSubmit}>
            <input
              ref={followUpRef}
              className="followup-input"
              placeholder={replyPlaceholder}
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={handleFollowUpKeyDown}
              autoComplete="off"
            />
            <button type="submit" className="submit-btn" disabled={!followUpInput.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
              </svg>
            </button>
          </form>
          <button className="start-over-btn" onClick={reset}>Start over</button>
        </div>
      )}
    </div>
  )
}
