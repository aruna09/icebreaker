// Local dev server — proxied from Vite at /api/*
// NOT used in production (Vercel handles api/ directly)
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .forEach(l => {
      const [k, ...v] = l.split('=')
      process.env[k.trim()] = v.join('=').trim()
    })
}

const { default: handler } = await import('./api/generate.js')
const PORT = 3101

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', async () => {
      try {
        req.body = JSON.parse(body)
        // Attach status() shim for error responses before SSE headers are set
        if (!res.status) {
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }
        }
        await handler(req, res)
      } catch (err) {
        console.error(err)
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
        }
        res.end(JSON.stringify({ error: 'Dev server error' }))
      }
    })
    return
  }

  res.writeHead(404).end()
})

server.listen(PORT, () => console.log(`Dev API server → http://localhost:${PORT}`))
