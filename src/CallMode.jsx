import { useState, useRef, useEffect } from 'react'

const LOGO_URL = 'https://www.schooldataleadership.org/media/reviews/photos/original/5c/b8/87/incidentiq-34-1573848994.png'

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim()
}

// Parse response into an array of speakable segments
function parseToSegments(rawText) {
  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0])
      if (j.ticket) {
        return [{ type: 'single', ttsText: `I've created a support ticket. ${j.summary}. Priority: ${j.priority}. ${j.recommendedAction}. Estimated resolution: ${j.estimatedResolution}.` }]
      }
      if (j.followUp) return [{ type: 'single', ttsText: j.question }]
    }
  } catch {}

  const clean = rawText
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim()

  const lines = clean.split('\n').filter(l => l.trim())
  const segments = []
  let introLines = []
  let inSteps = false
  let stepNum = 0

  for (const line of lines) {
    const m = line.match(/^\d+[.)]\s+(.+)/)
    if (m) {
      if (!inSteps && introLines.length > 0) {
        segments.push({ type: 'intro', ttsText: introLines.join(' ') })
        introLines = []
      }
      inSteps = true
      stepNum++
      segments.push({ type: 'step', stepNum, ttsText: m[1].trim() })
    } else if (!inSteps) {
      introLines.push(line.trim())
    }
  }

  if (introLines.length > 0 && !inSteps) {
    segments.push({ type: 'single', ttsText: introLines.join(' ') })
  }

  return segments.length > 0 ? segments : [{ type: 'single', ttsText: clean.slice(0, 500) }]
}

export default function CallMode({ onExit }) {
  const videoRef       = useRef(null)
  const streamRef      = useRef(null)
  const recognitionRef = useRef(null)
  const transcriptRef  = useRef('')
  const frameRef       = useRef(null)
  const pressingRef    = useRef(false)
  const audioElRef     = useRef(null)
  const pendingAudioUrl = useRef(null)
  const segmentsRef    = useRef([])
  const segIdxRef      = useRef(0)
  const messagesRef    = useRef([])

  const [phase, setPhase]         = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [ttsReady, setTtsReady]   = useState(false)
  // { idx, total, type, stepNum } — drives position indicator, no text shown
  const [segPos, setSegPos]       = useState(null)
  const [camError, setCamError]   = useState(null)

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

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() || []
    // Prefer British female, then other female, then any British, then any English
    // Explicitly avoid 'Daniel' (male) by not including it in the priority list
    return voices.find(v => /serena|martha/i.test(v.name))
      || voices.find(v => /samantha|moira|nicky|karen/i.test(v.name))
      || voices.find(v => v.lang === 'en-GB' && v.localService && !/daniel|oliver|arthur/i.test(v.name))
      || voices.find(v => v.lang.startsWith('en') && v.localService && v.name.toLowerCase().includes('fem'))
      || voices.find(v => v.lang === 'en-US' && v.localService)
      || null
  }

  function speakFallback(text, onEnd) {
    window.speechSynthesis?.cancel()
    if (!text) { onEnd?.(); return }
    const clean = stripMarkdown(text).replace(/\n+/g, ' ')
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 1.0
    const voice = pickVoice()
    if (voice) utter.voice = voice
    utter.onend = () => onEnd?.()
    utter.onerror = () => onEnd?.()
    window.speechSynthesis?.speak(utter)
  }

  async function prefetchTTS(text) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.warn('TTS error:', res.status, err.error)
        return
      }
      const blob = new Blob([await res.arrayBuffer()], { type: 'audio/mpeg' })
      if (pendingAudioUrl.current) URL.revokeObjectURL(pendingAudioUrl.current)
      pendingAudioUrl.current = URL.createObjectURL(blob)
    } catch (e) {
      clearTimeout(timeout)
      console.warn('prefetchTTS failed:', e.message)
      // pendingAudioUrl stays null — handlePlayStep falls back to browser TTS
    }
  }

  // Advance to segment at idx, or return to idle if past the end
  function advanceToSegment(idx) {
    const segs = segmentsRef.current
    if (idx >= segs.length) {
      segIdxRef.current = 0
      segmentsRef.current = []
      setSegPos(null)
      setPhase('idle')
      return
    }
    segIdxRef.current = idx
    const seg = segs[idx]
    const stepCount = segs.filter(s => s.type === 'step').length
    setSegPos({ idx, total: segs.length, type: seg.type, stepNum: seg.stepNum, stepCount })
    setTtsReady(true)  // always show Play immediately; audio may or may not be pre-loaded
    setPhase('ready')
  }

  // Called from Play button — direct user gesture, iOS allows audio.play() here
  function handlePlayStep() {
    const idx = segIdxRef.current
    const segs = segmentsRef.current
    const seg = segs[idx]
    if (!seg) return

    setPhase('speaking')

    // Best-effort pre-fetch of next segment while this one plays
    const nextIdx = idx + 1
    if (nextIdx < segs.length) {
      prefetchTTS(segs[nextIdx].ttsText)
    }

    const blobUrl = pendingAudioUrl.current
    pendingAudioUrl.current = null

    function onDone() { advanceToSegment(nextIdx) }

    const audioEl = audioElRef.current
    if (blobUrl && audioEl) {
      audioEl.onended = () => { URL.revokeObjectURL(blobUrl); onDone() }
      audioEl.onerror = () => { URL.revokeObjectURL(blobUrl); onDone() }
      audioEl.src = blobUrl
      audioEl.load()
      audioEl.play().catch(() => speakFallback(seg.ttsText, onDone))
    } else {
      speakFallback(seg.ttsText, onDone)
    }
  }

  async function sendToAgent(spokenText, frameBase64) {
    setPhase('processing')
    setTranscript('')
    setSegPos(null)
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

      const segs = parseToSegments(rawText)
      segmentsRef.current = segs
      segIdxRef.current = 0

      const seg = segs[0]
      const stepCount = segs.filter(s => s.type === 'step').length
      setSegPos({ idx: 0, total: segs.length, type: seg.type, stepNum: seg.stepNum, stepCount })
      setTtsReady(true)   // show Play immediately; ElevenLabs pre-fetch is best-effort
      setPhase('ready')

      // Best-effort TTS pre-fetch — if ready by tap time, great; otherwise browser TTS
      prefetchTTS(seg.ttsText)
    } catch (err) {
      clearTimeout(timeout)
      setPhase('idle')
      // Show brief error — reuse segPos display for one-off messages
      segmentsRef.current = [{ type: 'single', ttsText: err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Sorry, trouble connecting. Please try again.' }]
      segIdxRef.current = 0
      setSegPos({ idx: 0, total: 1, type: 'single' })
      setTtsReady(true)
      setPhase('ready')
    }
  }

  function handlePressStart(e) {
    e.preventDefault()
    if (pressingRef.current || phase === 'processing' || phase === 'speaking') return

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

  // Derive position label for display
  function getPositionLabel() {
    if (!segPos) return null
    const { type, stepNum, stepCount, total } = segPos
    if (total === 1) return null
    if (type === 'intro') return `Overview · ${stepCount} step${stepCount !== 1 ? 's' : ''} follow`
    if (type === 'step') return `Step ${stepNum} of ${stepCount}`
    return null
  }

  function getPlayLabel() {
    if (!ttsReady) return 'Loading…'
    if (!segPos) return '▶  Play'
    const { type, stepNum } = segPos
    if (type === 'intro') return '▶  Play overview'
    if (type === 'step') return `▶  Play step ${stepNum}`
    return '▶  Play answer'
  }

  const isReady = phase === 'ready'
  const pttDisabled = phase === 'processing' || phase === 'speaking'

  const phaseLabel = {
    idle:       'Hold to talk',
    listening:  'Listening…',
    processing: 'Thinking…',
    ready:      'Hold to ask a follow-up',
    speaking:   'Speaking…',
  }[phase] ?? 'Hold to talk'

  const pttColor = {
    idle:       '#0066CC',
    listening:  '#ef4444',
    processing: '#64748b',
    ready:      '#0066CC',
    speaking:   '#10b981',
  }[phase] ?? '#0066CC'

  const posLabel = getPositionLabel()

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

          {isReady && (
            <div className="step-play-area">
              {posLabel && <p className="step-position-label">{posLabel}</p>}
              <button
                className="play-answer-btn"
                onClick={handlePlayStep}
                disabled={!ttsReady}
              >
                {getPlayLabel()}
              </button>
            </div>
          )}

          {phase === 'speaking' && posLabel && (
            <p className="step-position-label">{posLabel}</p>
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
