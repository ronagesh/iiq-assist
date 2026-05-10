import { useState, useRef, useEffect } from 'react'

const LOGO_URL = 'https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png'

function speak(text, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()

  // Strip JSON artifacts and clean up for speech
  let clean = text
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0])
      if (j.ticket) clean = `I've created a support ticket for you. ${j.summary} The priority is ${j.priority}. ${j.recommendedAction} Estimated resolution time: ${j.estimatedResolution}.`
      else if (j.followUp) clean = j.question
    }
  } catch {}

  clean = clean.replace(/^\d+\.\s/gm, '').replace(/\n+/g, ' ').trim()

  const utter = new SpeechSynthesisUtterance(clean)
  utter.rate = 1.05
  utter.pitch = 1.0

  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices()
    const pick = voices.find(v =>
      ['Samantha', 'Karen', 'Moira', 'Serena'].some(n => v.name.includes(n))
    ) || voices.find(v => v.lang.startsWith('en') && v.localService)
    if (pick) utter.voice = pick
  }

  // Voices may not be loaded yet
  if (window.speechSynthesis.getVoices().length) setVoice()
  else window.speechSynthesis.onvoiceschanged = setVoice

  utter.onend = () => onEnd?.()
  utter.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utter)
}

export default function CallMode({ onExit }) {
  const videoRef      = useRef(null)
  const streamRef     = useRef(null)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const messagesRef   = useRef([])

  const [phase, setPhase]         = useState('idle')   // idle | listening | processing | speaking
  const [transcript, setTranscript] = useState('')
  const [agentText, setAgentText] = useState("Hold the button and tell me what's going on — I can see what your camera sees.")
  const [camError, setCamError]   = useState(null)

  // Start camera on mount
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
      recognitionRef.current?.abort()
    }
  }, [])

  function captureFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  }

  async function sendToAgent(spokenText, frameBase64) {
    setPhase('processing')
    setTranscript('')

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
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const rawText = data.text || ''
      messagesRef.current = [...newMessages, { role: 'assistant', content: rawText }]

      // Extract display text
      let displayText = rawText
      try {
        const m = rawText.match(/\{[\s\S]*\}/)
        if (m) {
          const j = JSON.parse(m[0])
          if (j.ticket) displayText = `I'm creating a ticket for you. ${j.summary} Priority: ${j.priority}. ${j.recommendedAction}`
          else if (j.followUp) displayText = j.question
        }
      } catch {}

      setAgentText(displayText)
      setPhase('speaking')
      speak(rawText, () => setPhase('idle'))
    } catch {
      setAgentText("Sorry, I had trouble connecting. Please try again.")
      setPhase('idle')
    }
  }

  function startListening() {
    if (phase !== 'idle') return
    window.speechSynthesis?.cancel()
    transcriptRef.current = ''
    setTranscript('')
    setPhase('listening')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      // No speech API — just capture frame with a default prompt
      const frame = captureFrame()
      sendToAgent('Please analyze what you see and diagnose the issue.', frame)
      return
    }

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
    rec.onerror = () => setPhase('idle')
    rec.start()
  }

  function stopListening() {
    if (phase !== 'listening') return
    recognitionRef.current?.stop()
    setTimeout(() => {
      const spoken = transcriptRef.current || 'Please analyze what you see and diagnose the issue.'
      const frame = captureFrame()
      sendToAgent(spoken, frame)
    }, 250)
  }

  function handlePressStart(e) { e.preventDefault(); startListening() }
  function handlePressEnd(e)   { e.preventDefault(); stopListening() }

  const phaseConfig = {
    idle:       { label: 'Hold to talk',  color: '#0066CC' },
    listening:  { label: 'Listening…',    color: '#ef4444' },
    processing: { label: 'Thinking…',     color: '#64748b' },
    speaking:   { label: 'Speaking…',     color: '#10b981' },
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
        {/* Top bar */}
        <div className="call-top">
          <button className="call-exit-pill" onClick={onExit}>✕ Exit</button>
          <div className="call-agent-pill">
            <img src={LOGO_URL} alt="iiQ" className="call-agent-logo" />
            <span>iiQ Assist</span>
          </div>
        </div>

        {/* Response area */}
        <div className="call-body">
          {transcript && (
            <p className="call-transcript">"{transcript}"</p>
          )}
          <p className={`call-agent-text${phase === 'speaking' ? ' call-agent-text--speaking' : ''}`}>
            {agentText}
          </p>
        </div>

        {/* Push-to-talk */}
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
