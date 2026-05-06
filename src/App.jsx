import { useState } from 'react'

const COUNTRIES = [
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'USA', flag: '🇺🇸' },
  { name: 'UK', flag: '🇬🇧' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Japan', flag: '🇯🇵' },
]

const AGE_GROUPS = ['20s–30s', '40s–50s', '60+']
const MEETING_TYPES = ['Sync check-in', '1:1', 'Project kickoff']
const CARD_COLORS = ['#FFD166', '#06D6A0', '#118AB2']

export default function App() {
  const [step, setStep] = useState(1)
  const [country, setCountry] = useState('')
  const [age, setAge] = useState('')
  const [meeting, setMeeting] = useState('')
  const [context, setContext] = useState('')

  // starters: null = idle, [] = streaming in progress, ['s1',...] = done
  const [starters, setStarters] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [flipped, setFlipped] = useState([false, false, false])
  const [error, setError] = useState('')

  const generate = async () => {
    setStreaming(true)
    setStarters([])           // show card slots immediately
    setFlipped([false, false, false])
    setError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, age, meeting, context }),
      })

      if (res.status === 429) {
        setError("You've hit the rate limit — come back in an hour.")
        setStarters(null)
        return
      }
      if (!res.ok) throw new Error('API error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })

        // Split on SSE double-newline boundaries
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''   // keep any incomplete tail

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const raw = part.slice(6).trim()
          if (raw === '"[DONE]"' || raw === '[DONE]') break
          try {
            const payload = JSON.parse(raw)
            if (payload.error) throw new Error(payload.error)
            if (payload.starter) {
              setStarters(prev => [...(prev ?? []), payload.starter])
            }
          } catch {
            // partial chunk — ignore
          }
        }
      }
    } catch {
      setError("Couldn't generate — try again")
      setStarters(null)
    } finally {
      setStreaming(false)
    }
  }

  const reshuffle = () => {
    setStarters(null)
    generate()
  }

  const startOver = () => {
    setStep(1)
    setCountry('')
    setAge('')
    setMeeting('')
    setContext('')
    setStarters(null)
    setFlipped([false, false, false])
    setError('')
    setStreaming(false)
  }

  const flipCard = (i) => {
    // Only flip if the starter has arrived
    if (starters?.[i] !== undefined) {
      setFlipped(prev => prev.map((f, idx) => idx === i ? !f : f))
    }
  }

  const showCards = starters !== null   // true once generation starts

  return (
    <div className="app">
      <header className="header">
        <div className="logo">IceBreak</div>
        <h1 className="tagline">
          Open with something<br /><span>actually good.</span>
        </h1>
      </header>

      {/* Step dots — only during the 3-step flow */}
      {!showCards && (
        <div className="dots">
          {[1, 2, 3].map(n => (
            <div key={n} className={`dot ${step === n ? 'active' : ''}`} />
          ))}
        </div>
      )}

      {/* ── Step 1: Country ── */}
      {step === 1 && !showCards && (
        <div className="card">
          <div className="step-label">Step 1 of 3</div>
          <h2 className="step-title">Where are they from?</h2>
          <div className="options">
            {COUNTRIES.map(c => (
              <button
                key={c.name}
                className={`pill country ${country === c.name ? 'selected' : ''}`}
                onClick={() => setCountry(c.name)}
              >
                {c.flag} {c.name}
              </button>
            ))}
          </div>
          <div className="nav">
            <button className="btn btn-primary" disabled={!country} onClick={() => setStep(2)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Age + Meeting ── */}
      {step === 2 && !showCards && (
        <div className="card">
          <div className="step-label">Step 2 of 3</div>
          <h2 className="step-title">Tell me about the call.</h2>
          <div className="step2-grid">
            <div>
              <div className="field-label">Their age range</div>
              <div className="options">
                {AGE_GROUPS.map(a => (
                  <button key={a} className={`pill ${age === a ? 'selected' : ''}`} onClick={() => setAge(a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="field-label">Meeting type</div>
              <div className="options">
                {MEETING_TYPES.map(m => (
                  <button key={m} className={`pill ${meeting === m ? 'selected' : ''}`} onClick={() => setMeeting(m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="nav">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" disabled={!age || !meeting} onClick={() => setStep(3)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Context + Generate ── */}
      {step === 3 && !showCards && (
        <div className="card">
          <div className="step-label">Step 3 of 3</div>
          <h2 className="step-title">Anything you know about them?</h2>
          <textarea
            placeholder="e.g. they just got back from vacation, they're a big football fan, they lead the infra team…"
            value={context}
            onChange={e => setContext(e.target.value)}
            rows={3}
          />
          {error && <div className="error-text">{error}</div>}
          <div className="nav">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={generate}>Generate</button>
          </div>
        </div>
      )}

      {/* ── Cards (stream in one by one) ── */}
      {showCards && (
        <>
          <div className="results-header">
            <h2 className="results-title">Your openers</h2>
            <p className="results-hint">
              {streaming ? 'Generating…' : 'Tap a card to flip it'}
            </p>
          </div>

          <div className="cards-grid">
            {[0, 1, 2].map(i => {
              const text = starters?.[i]
              const ready = text !== undefined
              const isFlipped = flipped[i]

              return (
                <div
                  key={i}
                  className={`flip-card ${isFlipped ? 'flipped' : ''} ${!ready ? 'skeleton' : ''}`}
                  onClick={() => flipCard(i)}
                >
                  <div className="flip-card-inner">
                    <div className="flip-card-front">
                      {ready ? (
                        <>
                          <div className="card-num">{i + 1}</div>
                          <div className="card-cta">Tap to reveal</div>
                        </>
                      ) : (
                        <div className="card-loading">
                          <div className="shimmer-line" />
                          <div className="shimmer-line short" />
                        </div>
                      )}
                    </div>
                    <div className="flip-card-back" style={{ background: CARD_COLORS[i] }}>
                      <p className="starter-text">{text}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && <div className="error-text" style={{ marginTop: 16 }}>{error}</div>}

          {!streaming && (
            <div className="reshuffle-wrap">
              <button className="btn btn-outline" onClick={startOver}>Start over</button>
              <button className="btn btn-outline" onClick={reshuffle}>↺ Reshuffle</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
