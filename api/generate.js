import Anthropic from '@anthropic-ai/sdk'

// In-memory rate limit store (best-effort for single Vercel instance)
const rateLimitMap = new Map()
const RATE_LIMIT = 10
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

// Extract complete quoted strings from a partial JSON array as it streams in.
// Matches "..." including escaped quotes — only returns fully closed strings.
function extractStarters(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const matches = []
  const regex = /"((?:[^"\\]|\\.)*)"/g
  let match
  while ((match = regex.exec(clean)) !== null) {
    matches.push(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'))
  }
  return matches
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in an hour.' })
  }

  const { country, age, meeting, context } = req.body || {}

  if (!country || !age || !meeting) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const contextLine = context?.trim()
    ? `Additional context about this person: "${context.trim()}"`
    : ''

  const prompt = `You are helping a remote software developer (Indian, based in Bengaluru, mid-20s) start a conversation with a colleague before a work call.

Colleague details:
- Country: ${country}
- Age group: ${age}
- Meeting type: ${meeting}
${contextLine}

Generate exactly 3 conversation starters. Each should:
- Feel genuinely human and specific, not generic
- Be culturally aware
- Avoid weather and "how was your weekend" unless there's a specific hook
- Be 1–2 sentences max
- Be something you'd say out loud, not read from a script

If additional context was provided, at least one starter should reference it.

Respond ONLY with a JSON array of 3 strings. No preamble, no markdown.
Example: ["starter one", "starter two", "starter three"]`

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable Nginx buffering on Vercel

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    })

    let buffer = ''
    let sent = 0

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        buffer += event.delta.text

        // Try to extract newly completed starters
        const all = extractStarters(buffer)
        while (sent < all.length && sent < 3) {
          sendEvent({ starter: all[sent] })
          sent++
        }

        if (sent >= 3) break
      }
    }

    sendEvent('[DONE]')
    res.end()
  } catch (err) {
    console.error('Generate error:', err)
    sendEvent({ error: 'Generation failed' })
    res.end()
  }
}
