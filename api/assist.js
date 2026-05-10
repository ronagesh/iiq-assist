const SYSTEM_PROMPT = `You are iiQ Assist, an AI IT support agent for K-12 schools. When given a description and photo of a problem, diagnose it confidently and either: (1) provide clear step-by-step resolution instructions in plain language a non-technical teacher can follow, or (2) if the issue requires physical intervention, say you're creating a ticket and return a structured ticket with: issue summary, device type, priority (low/medium/high/urgent), recommended action, estimated resolution time. Be warm, fast, and confident. Common issues and resolutions: Chromebook won't turn on — hard reset hold power 10 seconds, check charger; Google login error — device not authorized, needs IT admin; WiFi not connecting — forget and rejoin network; Smartboard no signal — check HDMI cable, cycle Source button; Projector not displaying — check HDMI, press Source, restart; iPad not on network — check MDM profile.

IMPORTANT: When you create a ticket, respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"ticket": true, "summary": "...", "deviceType": "...", "priority": "low|medium|high|urgent", "recommendedAction": "...", "estimatedResolution": "..."}

When you resolve with steps, respond with plain text starting with a warm greeting, then numbered steps.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { content } = req.body
  if (!content || !Array.isArray(content)) {
    return res.status(400).json({ error: 'Missing content' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: err.error?.message || `Anthropic API error ${response.status}`,
      })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
