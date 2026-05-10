import { useState, useRef, useEffect } from 'react'

const LOGO_URL = 'https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png'

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim()
}

// Returns { display, spoken } — display is short and clean, spoken is for TTS
function parseAgentResponse(rawText) {
  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0])
      if (j.ticket) {
        return {
          display: `🎫 Ticket created · ${j.priority.toUpperCase()} priority\n${j.summary}`,
          spoken: rawText,
        }
      }
      if (j.followUp) {
        return { display: j.question, spoken: rawText }
      }
    }
  } catch {}

  // Plain text resolution — show intro sentence + step count
  const clean = stripMarkdown(rawText)
  const lines = clean.split('\n').filter(Boolean)
  const steps = lines.filter(l => /^\d+[\.)]\s/.test(l) || l.match(/^\d+\s/))
  const intro = lines.find(l => !/^\d+/.test(l.trim())) || ''
  const stepCount = steps.length

  const display = intro
    ? `${intro}${stepCount > 0 ? `\n\n${stepCount} steps — listen for instructions` : ''}`
    : clean.slice(0, 140)

  return { display, spoken: rawText }
}

// Play audio through an already-unlocked AudioContext so iOS doesn't block it
async function playViaAudioContext(arrayBuffer, audioCtx, sourceRef, onEnd) {
  await audioCtx.resume()
  const decoded = await audioCtx.decodeAudioData(arrayBuffer)
  const source = audioCtx.createBufferSource()
  source.buffer = decoded
  source.connect(audioCtx.destination)
  source.onended = () => onEnd?.()
  sourceRef.current = source
  source.start(0)
}

async function speakElevenLabs(text, audioCtxRef, sourceRef, onEnd) {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error('TTS error')
    const arrayBuffer = await res.arrayBuffer()
    await playViaAudioContext(arrayBuffer, audioCtxRef.current, sourceRef, onEnd)
  } catch {
    // Fallback to browser TTS
    const clean = stripMarkdown(text).replace(/\n+/g, ' ')
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 1.05
    const voices = window.speechSynthesis?.getVoices() || []
    const pick = voices.find(v => ['Samantha','Karen','Moira'].some(n => v.name.includes(n)))
      || voices.find(v => v.lang.startsWith('en') && v.localService)
    if (pick) utter.voice = pick
    utter.onend  = () => onEnd?.()
    utter.onerror = () => onEnd?.()
    window.speechSynthesis?.speak(utter)
  }
}

export default function CallMode({ onExit }) {
  const videoRef       = useRef(null)
  const streamRef      = useRef(null)
  const recognitionRef = useRef(null)
  const transcriptRef  = useRef('')
  const frameRef       = useRef(null)
  const pressingRef    = useRef(false)
  const audioCtxRef    = useRef(null)   // unlocked on first press
  const sourceRef      = useRef(null)   // current AudioBufferSourceNode
  const messagesRef    = useRef([])

  const [phase, setPhase]           = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [displayText, setDisplayText] = useState("Hold the button and tell me what's going on — I can see what your camera sees.")
  const [camError, setCamError]     = useState(null)
  const [hint, setHint]             = useState(null)

  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setCamError('Camera access denied. Please allow camera access and try again.')
      }
    }
    startCam()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      window.speechSynthesis?.cancel()
      sourceRef.current?.stop()
      audioCtxRef.current?.close()
      recognitionRef.current?.abort()
    }
  }, [])

  function captureFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  }

  async function sendToAgent(spokenText, frameBase64) {
    setPhase('processing')
    setTranscript('')
    setHint(null)

    const userContent = []
    if (frameBase64) userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 } })
    userContent.push({ type: 'text', text: spokenText })

    const newMessages = [...messagesRef.current, { role: 'user', content: userContent }]
    messagesRef.current = newMessages

    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      const rawText = data.text || ''
      messagesRef.current = [...newMessages, { role: 'assistant', content: rawText }]

      const { display, spoken } = parseAgentResponse(rawText)
      setDisplayText(display)
      setPhase('speaking')
      speakElevenLabs(spoken, audioCtxRef, sourceRef, () => setPhase('idle'))
    } catch (err) {
      setDisplayText('Sorry, I had trouble connecting. Please try again.')
      setPhase('idle')
    }
  }

  function handlePressStart(e) {
    e.preventDefault()
    if (pressingRef.current || phase === 'processing') return

    // Unlock / create AudioContext on the user gesture so iOS allows playback later
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    audioCtxRef.current.resume()

    // Stop any ongoing speech
    sourceRef.current?.stop()
    window.speechSynthesis?.cancel()

    pressingRef.current = true
    transcriptRef.current = ''
    frameRef.current = captureFrame()
    setTranscript('')
    setHint(null)
    setPhase('listening')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setHint('Voice unavailable — release to analyze the camera view.')
      return
    }

    try {
      const rec = new SR()
      recognitionRef.current = rec
      rec.continuous = false
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (e) => {
        const t = Array.from(e.results).map(r => r[0].transcript).join('')
        transcriptRef.current = t
        setTranscript(t)
      }
      rec.onerror = (e) => {
        if (e.error === 'not-allowed') setHint('Mic blocked — release to analyze camera view only.')
        else setHint('Voice unavailable — release to analyze camera view.')
      }
      rec.start()
    } catch {
      setHint('Voice unavailable — release to analyze camera view.')
    }
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
          {hint && <p className="call-hint">{hint}</p>}
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
