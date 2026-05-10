const VOICE_ID = 'XB0fDUnXU5powFXDhCwa' // Charlotte — British, warm

function cleanForSpeech(text) {
  let clean = text

  // Parse JSON responses into natural sentences
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0])
      if (j.ticket) {
        clean = `I've created a support ticket for you. ${j.summary} The priority is ${j.priority}. ${j.recommendedAction} Estimated resolution time: ${j.estimatedResolution}.`
      } else if (j.followUp) {
        clean = j.question
      }
    }
  } catch {}

  return clean
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.*?)\*/g, '$1')        // *italic*
    .replace(/`(.*?)`/g, '$1')          // `code`
    .replace(/^\d+\.\s/gm, '')          // numbered list markers
    .replace(/\n+/g, ' ')
    .trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'Missing text' })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' })

  const spokenText = cleanForSpeech(text)

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: spokenText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.35, similarity_boost: 0.9, style: 0.25, use_speaker_boost: true },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({ error: err.detail?.message || 'ElevenLabs error' })
    }

    const audio = await response.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(audio))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
