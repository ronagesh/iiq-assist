import { useState, useRef, useEffect } from 'react'

const LOGO_URL = 'https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png'

function makeSilentWavBlob() {
  const sr = 8000, n = 800   // 100ms @ 8 kHz
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (s, o) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w('RIFF', 0); v.setUint32(4, 36 + n * 2, true)
  w('WAVE', 8); w('fmt ', 12); v.setUint32(16, 16, true)
  v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w('data', 36); v.setUint32(40, n * 2, true)
  return new Blob([buf], { type: 'audio/wav' })
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim()
}

function parseAgentResponse(rawText) {
  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0])
      if (j.ticket) {
        return {
          display: `Ticket created · ${j.priority.toUpperCase()} priority\n${j.summary}`,
          spoken: rawText,
        }
      }
      if (j.followUp) return { display: j.question, spoken: rawText }
    }
  } catch {}

  const clean = stripMarkdown(rawText)
  const lines = clean.split('\n').filter(Boolean)
  const steps = lines.filter(l => /^\d+[\.)]\s/.test(l))
  const intro = lines.find(l => !/^\d+/.test(l.trim())) || ''

  const display = intro
    ? `${intro}${steps.length > 0 ? `\n\n${steps.length} steps — listen for instructions` : ''}`
    : clean.slice(0, 140)

  return { display, spoken: rawText }
}

export default function CallMode({ onExit }) {
  const videoRef       = useRef(null)
  const streamRef      = useRef(null)
  const recognitionRef = useRef(null)
  const transcriptRef  = useRef('')
  const frameRef       = useRef(null)
  const pressingRef    = useRef(false)
  const audioCtxRef    = useRef(null)   // created lazily in gesture
  const ctxSourceRef   = useRef(null)
  const audioElRef     = useRef(null)   // <audio> in JSX
  const silentUrlRef   = useRef(null)
  const messagesRef    = useRef([])

  const [phase, setPhase]             = useState('idle')
  const [transcript, setTranscript]   = useState('')
  const [displayText, setDisplayText] = useState("Hold the button and tell me what's going on — I can see what your camera sees.")
  const [camError, setCamError]       = useState(null)

  useEffect(() => {
    silentUrlRef.current = URL.createObjectURL(makeSilentWavBlob())

    async function init() {
      // Request camera + mic together so the permission dialog fires here,
      // not during the first PTT press. Mic permission also covers SR.
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: true,
        })
        // We only needed the permission; stop the audio track immediately
        s.getAudioTracks().forEach(t => t.stop())
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      } catch {
        // Mic denied — fall back to video-only (SR will prompt separately, but camera works)
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
            audio: false,
          })
          streamRef.current = s
          if (videoRef.current) videoRef.current.srcObject = s
        } catch {
          setCamError('Camera access denied. Please allow camera access and try again.')
        }
      }
    }
    init()

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      window.speechSynthesis?.cancel()
      ctxSourceRef.current?.stop()
      audioCtxRef.current?.close()
      if (silentUrlRef.current) URL.revokeObjectURL(silentUrlRef.current)
      recognitionRef.current?.abort()
    }
  }, [])

  function captureFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const maxW = 640
    const scale = Math.min(1, maxW / video.videoWidth)
    const w = Math.round(video.videoWidth * scale)
    const h = Math.round(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    try { return canvas.toDataURL('image/jpeg', 0.8).split(',')[1] } catch { return null }
  }

  async function speakText(text, onEnd) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS request failed')
      const arrayBuffer = await res.arrayBuffer()

      // Try AudioContext first (best quality, handles MP3 natively)
      const ctx = audioCtxRef.current
      if (ctx) {
        await ctx.resume()
        if (ctx.state === 'running') {
          const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
          const source = ctx.createBufferSource()
          source.buffer = decoded
          source.connect(ctx.destination)
          source.onended = onEnd
          ctxSourceRef.current = source
          source.start(0)
          return
        }
      }

      // AudioContext suspended/unavailable — try HTML5 audio element
      const audioEl = audioElRef.current
      if (audioEl) {
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        audioEl.onended = () => { URL.revokeObjectURL(url); onEnd?.() }
        audioEl.onerror = () => { URL.revokeObjectURL(url); onEnd?.() }
        audioEl.src = url
        audioEl.load()
        await audioEl.play()
        return
      }

      throw new Error('no audio path')
    } catch {
      // Final fallback: browser speech synthesis
      window.speechSynthesis?.cancel()
      const clean = stripMarkdown(text).replace(/\n+/g, ' ')
      const utter = new SpeechSynthesisUtterance(clean)
      utter.rate = 1.0
      const voices = window.speechSynthesis?.getVoices() || []
      const pick = voices.find(v => /serena|daniel|martha/i.test(v.name))
        || voices.find(v => /samantha|karen|moira|nicky/i.test(v.name))
        || voices.find(v => v.lang.startsWith('en') && v.localService)
      if (pick) utter.voice = pick
      utter.onend = () => onEnd?.()
      utter.onerror = () => onEnd?.()
      window.speechSynthesis?.speak(utter)
    }
  }

  async function sendToAgent(spokenText, frameBase64) {
    setPhase('processing')
    setTranscript('')

    const userContent = []
    if (frameBase64) userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 } })
    userContent.push({ type: 'text', text: spokenText })

    const newMessages = [...messagesRef.current, { role: 'user', content: userContent }]
    messagesRef.current = newMessages

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      const rawText = data.text || ''
      messagesRef.current = [...newMessages, { role: 'assistant', content: rawText }]

      const { display, spoken } = parseAgentResponse(rawText)
      setDisplayText(display)
      setPhase('speaking')
      speakText(spoken, () => setPhase('idle'))
    } catch (err) {
      clearTimeout(timeout)
      setDisplayText(err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Sorry, I had trouble connecting. Please try again.')
      setPhase('idle')
    }
  }

  function handlePressStart(e) {
    e.preventDefault()
    if (pressingRef.current || phase === 'processing') return

    // Create AudioContext lazily inside the gesture — iOS requires this for the
    // context to start in 'running' state instead of 'suspended'.
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    ctx.resume().catch(() => {})
    // Play a 1-sample silent buffer — canonical iOS AudioContext unlock
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
    } catch {}

    // Also unlock the HTML5 audio element as a backup path
    const audioEl = audioElRef.current
    if (audioEl && silentUrlRef.current) {
      audioEl.src = silentUrlRef.current
      audioEl.load()
      audioEl.play().catch(() => {})
    }

    // Stop any ongoing playback
    ctxSourceRef.current?.stop()
    window.speechSynthesis?.cancel()

    pressingRef.current = true
    transcriptRef.current = ''
    frameRef.current = captureFrame()
    setTranscript('')
    setPhase('listening')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    try {
      const rec = new SR()
      recognitionRef.current = rec
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (ev) => {
        const t = Array.from(ev.results).map(r => r[0].transcript).join('')
        transcriptRef.current = t
        setTranscript(t)
      }
      rec.onerror = () => { /* silently fall back to camera-only */ }
      rec.start()
    } catch { /* silently ignore */ }
  }

  function handlePressEnd(e) {
    e.preventDefault()
    if (!pressingRef.current) return
    pressingRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setTimeout(() => {
      if (!pressingRef.current) {
        const spoken = transcriptRef.current || 'Please analyze what you see and diagnose the issue.'
        const frame  = frameRef.current || captureFrame()
        sendToAgent(spoken, frame)
      }
    }, 200)
  }

  const phaseConfig = {
    idle:       { label: 'Hold to talk', color: '#0066CC' },
    listening:  { label: 'Listening…',   color: '#ef4444' },
    processing: { label: 'Thinking…',    color: '#64748b' },
    speaking:   { label: 'Speaking…',    color: '#10b981' },
  }
  const { label, color } = phaseConfig[phase]

  return (
    <div className="call-container">
      {/* Rendered in DOM so iOS treats it as a first-class media element */}
      <audio ref={audioElRef} playsInline style={{ display: 'none' }} />

      {camError ? (
        <div className="call-cam-error">
          <p>{camError}</p>
          <button className="call-exit-btn-standalone" onClick={onExit}>Go back</button>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="call-video" />
      )}

      <div className="call-overlay">
        <div className="call-top">
          <button className="call-exit-pill" onClick={onExit}>✕ Exit</button>
          <div className="call-agent-pill">
            <img src={LOGO_URL} alt="iiQ" className="call-agent-logo" />
            <span>iiQ Assist</span>
          </div>
        </div>

        <div className="call-body">
          {transcript && <p className="call-transcript">"{transcript}"</p>}
          <p className={`call-agent-text${phase === 'speaking' ? ' call-agent-text--speaking' : ''}`}>
            {displayText}
          </p>
        </div>

        <div className="call-controls">
          <p className="call-phase-label">{label}</p>
          <button
            className="ptt-btn"
            style={{ '--ptt-color': color }}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            disabled={phase === 'processing'}
          >
            {phase === 'processing' ? (
              <span className="ptt-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </span>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V22H8v2h8v-2h-3v-1.06A9 9 0 0 0 21 12v-2h-2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
