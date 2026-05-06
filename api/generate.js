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

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  // DEBUG: echo method so we can see exactly what Vercel passes
  if (req.url?.includes('_debug')) {
    return send(res, 200, { method: req.method, url: req.url, body: req.body })
  }

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed', got: req.method })
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return send(res, 429, { error: 'Rate limit exceeded. Try again in an hour.' })
  }

  const { country, age, meeting, context } = req.body || {}

  if (!country || !age || !meeting) {
    return send(res, 400, { error: 'Missing required fields' })
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return send(res, 500, { error: 'ANTHROPIC_API_KEY not set in environment' })
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].text
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return send(res, 500, { error: 'Failed to parse response', raw: text })

    const starters = JSON.parse(match[0])
    if (!Array.isArray(starters) || starters.length !== 3) {
      return send(res, 500, { error: 'Unexpected response format' })
    }

    send(res, 200, { starters })
  } catch (err) {
    console.error('Generate error:', err)
    send(res, 500, { error: 'Generation failed', detail: err?.message || String(err) })
  }
}
