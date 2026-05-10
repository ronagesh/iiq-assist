import { useState, useRef, useEffect } from 'react'

const LOGO_URL = 'https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png'

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
  const audioElRef     = useRef(null)
  const pendingAudioUrl = useRef(null)   // pre-fetched blob URL, ready to play on tap
  const pendingSpoken   = useRef(null)   // text for fallback TTS
  const messagesRef    = useRef([])

  const [phase, setPhase]             = useState('idle')
  const [transcript, setTranscript]   = useState('')
  const [displayText, setDisplayText] = useState("Hold the button and tell me what's going on — I can see what your camera sees.")
  const [ttsReady, setTtsReady]       = useState(false)
  const [camError, setCamError]       = useState(null)

  useEffect(() => {
    async function init() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: true,
        })
        s.getAudioTracks().forEach(t => t.stop())
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      } catch {
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
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.src = '' }
      if (pendingAudioUrl.current) URL.revokeObjectURL(pendingAudioUrl.current)
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

  // Pre-fetch TTS in the background so audio is ready when user taps Play
  async function prefetchTTS(text) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = new Blob([await res.arrayBuffer()], { type: 'audio/mpeg' })
      if (pendingAudioUrl.current) URL.revokeObjectURL(pendingAudioUrl.current)
      pendingAudioUrl.current = URL.createObjectURL(blob)
      setTtsReady(true)
    } catch {
      // TTS unavailable — Play button will fall back to browser speech synthesis
      setTtsReady(true)
    }
  }

  // Called directly from a button tap (user gesture) — iOS allows play() here
  function handlePlayAnswer() {
    const audioEl = audioElRef.current
    setPhase('speaking')

    if (pendingAudioUrl.current && audioEl) {
      // Audio was pre-loaded — play it synchronously in this gesture, no async needed
      audioEl.onended = () => { setPhase('idle') }
      audioEl.onerror = () => { setPhase('idle') }
      audioEl.src = pendingAudioUrl.current
      audioEl.load()
      audioEl.play().catch(() => {
        // Device blocked audio — fall back to browser TTS
        speakFallback(pendingSpoken.current, () => setPhase('idle'))
      })
      pendingAudioUrl.current = null
      setTtsReady(false)
    } else {
      // Pre-fetch didn't finish — use browser TTS (audio is unlocked by this gesture)
      speakFallback(pendingSpoken.current, () => setPhase('idle'))
    }
  }

  function speakFallback(text, onEnd) {
    window.speechSynthesis?.cancel()
    if (!text) { onEnd?.(); return }
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

  async function sendToAgent(spokenText, frameBase64) {
    setPhase('processing')
    setTranscript('')
    setTtsReady(false)
    if (pendingAudioUrl.current) { URL.revokeObjectURL(pendingAudioUrl.current); pendingAudioUrl.current = null }

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
      pendingSpoken.current = spoken
      setPhase('answered')

      // Pre-fetch TTS audio in background — will be ready by the time user taps Play
      prefetchTTS(spoken)
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
    if (pressingRef.current || phase === 'processing' || phase === 'speaking') return

    // Cancel any ongoing audio
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.src = '' }
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
      rec.onerror = () => {}
      rec.start()
    } catch {}
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

  const isAnswered = phase === 'answered'
  const pttDisabled = phase === 'processing' || phase === 'speaking'

  const phaseLabel = {
    idle:       'Hold to talk',
    listening:  'Listening…',
    processing: 'Thinking…',
    answered:   'Hold to reply',
    speaking:   'Speaking…',
  }[phase]

  const pttColor = {
    idle:       '#0066CC',
    listening:  '#ef4444',
    processing: '#64748b',
    answered:   '#0066CC',
    speaking:   '#10b981',
  }[phase]

  return (
    <div className="call-container">
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
          {isAnswered && (
            <button
              className="play-answer-btn"
              onClick={handlePlayAnswer}
              disabled={!ttsReady}
            >
              {ttsReady ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Play answer
                </>
              ) : 'Loading audio…'}
            </button>
          )}
        </div>

        <div className="call-controls">
          <p className="call-phase-label">{phaseLabel}</p>
          <button
            className="ptt-btn"
            style={{ '--ptt-color': pttColor }}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            disabled={pttDisabled}
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
