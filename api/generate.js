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
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return send(res, 429, { error: 'Rate limit exceeded. Try again in an hour.' })
  }

  const { country, age, meeting, context } = req.body || {}

  if (!country || !age || !meeting) {
    return send(res, 400, { error: 'Missing required fields' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return send(res, 500, { error: 'Server configuration error' })
  }

  const contextLine = context?.trim()
    ? `Additional context about this person: "${context.trim()}"`
    : ''

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const prompt = `You are helping a remote software developer (Indian, based in Bengaluru, mid-20s) start a conversation with a colleague before a work call.

Today's date: ${today}

Colleague details:
- Country: ${country}
- Age group: ${age}
- Meeting type: ${meeting}
${contextLine}

Your job:
1. Identify one specific, timely cultural hook relevant to ${country} right now — a sports season, ongoing event, recent holiday, cultural moment, or seasonal thing that someone there would actually be thinking about in ${today}. Avoid politics, tragedies, or anything heavy. Keep it light and connecting.
2. Use that hook naturally in at least one of the starters.
3. Generate exactly 3 conversation starters that:
   - Feel genuinely human and specific, not generic
   - Are culturally aware and seasonally accurate
   - Avoid "how was your weekend" unless there's a specific hook
   - Are 1–2 sentences max
   - Sound like something you'd say out loud, not read from a script

If additional context was provided, at least one starter should reference it.

Respond ONLY with a JSON object in this exact format. No preamble, no markdown:
{
  "hook": "one sentence describing the cultural/seasonal reference you drew from",
  "starters": ["starter one", "starter two", "starter three"]
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic API error:', response.status)
      return send(res, 500, { error: 'Generation failed' })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text
    if (!text) return send(res, 500, { error: 'Generation failed' })

    // Parse the JSON object response
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return send(res, 500, { error: 'Generation failed' })

    const parsed = JSON.parse(match[0])
    const { hook, starters } = parsed

    if (!Array.isArray(starters) || starters.length !== 3) {
      return send(res, 500, { error: 'Generation failed' })
    }

    send(res, 200, { starters, hook: hook || null })
  } catch (err) {
    console.error('Generate error:', err)
    send(res, 500, { error: 'Generation failed' })
  }
}
