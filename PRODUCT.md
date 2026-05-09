# IceBreak — Product Document

Last updated: May 2025

---

## Problem

Remote work across cultures is quietly awkward. The first 2 minutes of a call — before the agenda starts — are where rapport either forms or doesn't. Most people default to "how's the weather" or silence.

This is worse for non-Western developers on Western remote teams. Small talk that feels natural in Bengaluru doesn't land the same way in Munich or Tokyo. There's no playbook for it.

ChatGPT can generate conversation starters, but using it requires prompting, back-and-forth, and time you don't have when you're 90 seconds from joining a call.

---

## Target User

A developer based in India (or another non-Western country) working on a remote team with Western colleagues. Mid-20s to early 30s. Has calls with people from Germany, the US, the UK, Japan. Finds the pre-call small talk either awkward or formulaic. Wants something real, fast, and culturally aware — not a corporate icebreaker from an HR deck.

---

## What It Does

Pick three things about your colleague → get three conversation openers in under 5 seconds.

```
Country × Age group × Meeting type → 3 human conversation starters
```

Optional: add a personal detail ("they're a big cricket fan", "just got back from parental leave") and at least one starter will reference it.

Cards reveal one by one with a flip animation. Tap to read.

---

## Current Features (v1 — shipped)

### 3-step flow
- **Step 1 — Country:** Germany, USA, UK, India, Japan
- **Step 2 — Age group + Meeting type:** 20s–30s / 40s–50s / 60+ and Sync check-in / 1:1 / Project kickoff
- **Step 3 — Context (optional):** free text field for personal details

### Generation
- Calls Claude Sonnet via raw fetch to the Anthropic REST API
- Prompt includes today's date to keep cultural references seasonally accurate (avoids suggesting Diwali in May)
- Returns exactly 3 starters as a JSON array

### Card UI
- Three flip cards reveal staggered (0ms, 350ms, 700ms)
- Front face shows card number + "Tap to reveal"
- Back face shows the starter text on a coloured background (#FFD166 / #06D6A0 / #118AB2)
- Reshuffle generates a new set without resetting the form
- Start over resets everything

### Infrastructure
- React + Vite frontend
- Vercel serverless function (`api/generate.js`) — native fetch, no SDK
- In-memory rate limiting: 10 requests per IP per hour
- Dark theme (#0F0E17 background, #6C63FF accent)
- Fonts: Syne (headings) + DM Sans (body)

---

## Key Technical Decisions

| Decision | What we chose | Why |
|---|---|---|
| API approach | Raw `fetch` to Anthropic REST API | `@anthropic-ai/sdk` silently fails in Vercel's serverless runtime |
| Streaming vs. blocking | Blocking `messages.create()` + setTimeout stagger | Vercel buffers SSE until `res.end()`, so streaming never reached the client |
| Rate limiting | In-memory Map | Simple, zero dependencies. Swap for Vercel KV at scale |
| SPA routing | `vercel.json` with `handle: filesystem` | Catch-all rewrites were intercepting API routes |
| Card reveal | `setTimeout` stagger (350ms intervals) | Same progressive feel as streaming, no complexity |

---

## User Feedback (Reddit launch — May 2025)

### Top objections
1. **"Only 5 countries — there are 195 in the world"** — Most upvoted criticism. Valid. Fix is prioritised.
2. **"Why not just ask ChatGPT directly?"** — Asked by multiple people. The answer (zero prompting, 30-second flow, no conversation needed) isn't visible enough in the UI.
3. **"Outputs might get generic after a few uses"** — Accurate risk. Cultural references collapse toward safe patterns (sports, work setup, current affairs).

### Strongest positive signal
- The core problem was validated even by critics — nobody argued that cross-cultural small talk isn't awkward
- "This is more useful than it sounds at first" (upvoted)
- Local news idea got 13 upvotes — highest engagement in the thread

### Ideas from the community
- Surface local news/current events for the colleague's region alongside starters (13 upvotes)
- Calendar integration — auto-detect colleague from next meeting, pre-generate starters
- Memory/context layer — team history, previous conversations, shared events

---

## Prioritised Roadmap

### Tier 1 — This week (low effort, addresses loudest feedback)
- [x] **More countries** — expanded to 20: Australia, Brazil, Canada, China, France, Germany, India, Israel, Italy, Japan, Netherlands, Poland, Portugal, Singapore, South Korea, Spain, Sweden, UAE, UK, USA. Search filter added.
- [x] **Copy-to-clipboard** — pill button on card back, shows '✓ Copied' for 1.5s, doesn't interfere with flip
- [x] **Landing page copy** — "No prompting. 30 seconds. Done." added as subtagline

### Tier 2 — Next sprint (medium effort, meaningful UX improvement)
- [x] **Cultural hook** — Claude identifies one timely, non-political cultural reference for the country and uses it in at least one starter. Displayed as a "Based on →" strip below the cards. No extra API — Claude's knowledge handles seasonal/cultural context well enough for small talk.
- [x] **Share a starter via link** — Share button on card back generates /?s=<base64> URL, copies to clipboard. Shared URL shows a standalone view with the starter and "Generate your own →" CTA.

### Tier 3 — Longer term (high effort, high ceiling)
- [ ] **Calendar integration** — read the user's next meeting, detect the colleague's location, pre-generate starters automatically
- [ ] **Persistent rate limiting** — swap in-memory Map for Vercel KV once traffic justifies it

### Deprioritised
- Memory/context accumulation (personality, seniority, inside jokes) — interesting but a different product scope entirely

---

## Distribution

- Reddit (r/sideprojects) — posted May 2025, got traction and feedback
- Peerlist — good for developer audience, quality feedback over volume
- Product Hunt — hold until: more countries shipped, copy-to-clipboard done, email capture added (no way to retain visitors currently)

---

## Monetisation

None currently. Not the focus at validation stage. Rough future options:
- Free tier with rate limit, paid for more generations
- Team plan with shared context/history
- API access for calendar integrations
