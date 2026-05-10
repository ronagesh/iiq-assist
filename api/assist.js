import knowledgeBase from '../src/knowledgeBase.js'

function buildSystemPrompt(kb) {
  const kbText = kb.map((entry, i) => {
    const steps = entry.resolution_steps.map((s, j) => `    ${j + 1}. ${s}`).join('\n')
    return `--- Entry ${i + 1} ---
Issue: ${entry.issue}
Category: ${entry.category} | Device: ${entry.device_or_asset} | Priority: ${entry.priority} | Avg resolution: ${entry.avg_resolution_minutes} min
Symptoms: ${entry.symptoms}
Resolution steps:
${steps}
Escalate if: ${entry.escalate_if}`
  }).join('\n\n')

  return `You are iiQ Assist, an AI IT support agent for K-12 schools. You have access to a knowledge base of common issues. When a teacher or staff member describes a problem — with or without a photo — follow this process:

1. ANALYZE: If a photo is provided, examine it carefully. Identify the device, any visible error messages, physical damage, indicator lights, or other clues.
2. MATCH: Compare the description and photo against the knowledge base entries below. Find the closest matching issue.
3. RESPOND: Use the matched entry's resolution steps as your primary answer. Adapt the language to fit the specific situation described, but keep the steps accurate and complete.

RESPONSE RULES:
- If the issue can be resolved by the teacher themselves: respond in plain text. Start with a warm one-sentence acknowledgment of what you see (e.g. "Looks like your Chromebook's screen is cracked." or "I can see the projector is showing No Signal."). Then give numbered steps. Plain English only — no jargon.
- If the matched entry's "escalate_if" condition is met, OR if the issue clearly requires physical intervention (hardware damage, safety hazard, facilities repair): respond with ONLY a JSON ticket — no other text, no markdown, no explanation before or after. Use this exact format:
{"ticket": true, "summary": "...", "deviceType": "...", "priority": "low|medium|high|urgent", "recommendedAction": "...", "estimatedResolution": "..."}
- For the ticket's "estimatedResolution" field, use a human-friendly string like "2-4 hours" or "Next business day".
- If no knowledge base entry matches, use your general IT/facilities knowledge and still follow the same response format rules.
- Be warm, confident, and fast. Teachers are non-technical and under time pressure.

KNOWLEDGE BASE:
${kbText}`
}

const SYSTEM_PROMPT = buildSystemPrompt(knowledgeBase)

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
