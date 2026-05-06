# IceBreak

**Stop opening every call with "how's the weather."**

IceBreak generates 3 culturally-specific conversation starters before a work call — based on your colleague's country, age group, and meeting type. Built for non-Western devs on Western remote teams who want to actually connect.

![IceBreak — dark UI with card flip animation](https://github.com/aruna09/icebreaker/raw/main/public/preview.png)

---

## What it does

Pick three things about your colleague → hit Generate → get three openers that don't sound like they came from a corporate small-talk handbook.

```
Country  ×  Age group  ×  Meeting type  →  3 human conversation starters
```

Optional: add a personal detail ("they're a big cricket fan", "just got back from parental leave") and at least one starter will reference it.

Cards stream in one by one as Claude generates them — first one appears in about a second.

---

## Stack

| Layer | What |
|---|---|
| Frontend | React + Vite, plain CSS |
| AI | Claude Sonnet via Anthropic API (SSE streaming) |
| Backend | Vercel serverless function (`api/generate.js`) |
| Deploy | Vercel |

No database. No auth. No framework. ~400 lines of code total.

---

## Running locally

```bash
git clone https://github.com/aruna09/icebreaker
cd icebreaker
npm install

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Start both the dev API server and Vite
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

> The `npm run dev` command starts two things: a local Node server on port 3101 that runs the API function, and Vite on port 3100 that proxies `/api/*` to it. In production, Vercel handles the API natively.

---

## Deploying to Vercel

```bash
npx vercel
```

Then go to **Vercel dashboard → Project → Settings → Environment Variables** and add:

```
ANTHROPIC_API_KEY = sk-ant-...
```

Redeploy, and you're live.

---

## Rate limiting

The API route limits each IP to **10 requests per hour** using an in-memory map. This is intentionally simple — good enough for validation. At scale, swap it for [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (a one-line change).

---

## Why this exists

Built to solve a real problem: working remotely with German colleagues 20+ years older and not knowing how to open a call without it being awkward. The target user is exactly this — a non-Western dev on a Western remote team who wants to connect but doesn't know how.

---

## Roadmap

- [ ] More countries (France, Netherlands, Singapore, Canada, Australia)
- [ ] Persistent rate limiting with Vercel KV
- [ ] Copy-to-clipboard on card flip
- [ ] Share a starter via link
