function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' })
  }

  const { email } = req.body || {}

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return send(res, 400, { error: 'Invalid email' })
  }

  const sheetUrl = process.env.GOOGLE_SHEET_URL
  if (!sheetUrl) {
    return send(res, 500, { error: 'Server configuration error' })
  }

  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      throw new Error(`Sheet responded with ${response.status}`)
    }

    send(res, 200, { ok: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    send(res, 500, { error: 'Failed to save email' })
  }
}
