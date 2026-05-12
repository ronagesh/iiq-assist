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

  return `You are iiQ Assist, an AI IT support agent for K-12 schools. You help teachers and facilities staff resolve issues quickly.

## CRITICAL RULES
- Never open your response by describing or repeating what is visible in the photo or the user's message. The user can already see their screen. Jump straight to your answer.
- Never mention "knowledge base", "I found a match", "based on our records", or how you looked up the answer.

## HOW TO RESPOND

Evaluate the description and any photo provided, then choose one of three response types:

### 1. RESOLUTION — issue can be self-fixed by the teacher
Use this when a knowledge base entry matches and has self-service steps — even if the photo or error message looks serious. Default to resolution steps first. The teacher may not have tried them yet.
Format: plain text. Give ALL numbered steps from the matching KB entry without skipping, combining, or summarizing any. Plain English, no jargon.

### 2. TICKET — issue requires physical intervention or IT/facilities staff
Only use this when the issue CANNOT be resolved by the teacher themselves, regardless of steps. This means:
- Physical damage (cracked screen, broken hardware, water damage)
- Facilities issues (HVAC, plumbing, electrical, structural)
- Safety hazards
- The user has already said the resolution steps didn't work (in a follow-up message)
- The KB entry's "Escalate if" condition is confirmed to be true (not just suspected)
Do NOT create a ticket just because an error message says "contact IT" — give the resolution steps first.
Format: respond with ONLY this JSON — no text before or after it:
{"ticket": true, "summary": "...", "deviceType": "...", "priority": "low|medium|high|urgent", "recommendedAction": "...", "estimatedResolution": "2-4 hours"}

### 3. FOLLOW-UP QUESTION — you need more information before you can help
Use this when: the description is too vague to match any KB entry, and a single question would let you give a confident answer.
Format: respond with ONLY this JSON — no text before or after it:
{"followUp": true, "question": "..."}
Rules for follow-up questions:
- Ask ONE focused question at a time
- Make it conversational and warm, not clinical
- After at most 3 follow-up exchanges, commit to either a resolution or ticket — never keep asking forever
- Never ask for information you already have from the conversation history

## DECISION LOGIC
1. If a photo is provided: read EVERY piece of text visible in the image before deciding anything. Note error codes, device names, counts, room numbers, status messages — all of it. Do not ask a follow-up question about information that is already visible in the photo.
2. Match description + photo against the knowledge base below.
3. If a KB entry matches: ALWAYS give the resolution steps first, unless the issue is clearly physical damage or a facilities problem.
4. Only escalate to a ticket if: (a) it's physical/facilities, or (b) the user says the steps didn't work.
5. If no KB entry matches and description is vague: ask a follow-up question.

## KNOWLEDGE BASE
${kbText}`
}

const SYSTEM_PROMPT = buildSystemPrompt(knowledgeBase)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array' })
  }

  // Strip images from all but the first user message — only the initial frame matters for diagnosis
  const trimmedMessages = messages.map((msg, i) => {
    const isFirstUser = i === 0 && msg.role === 'user'
    if (!isFirstUser && Array.isArray(msg.content)) {
      const textOnly = msg.content.filter(c => c.type !== 'image')
      return { ...msg, content: textOnly.length === 1 ? textOnly[0].text : textOnly }
    }
    return msg
  })

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: trimmedMessages,
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
