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

  const [loading, setLoading] = useState(false)
  const [starters, setStarters] = useState(null)   // null | string[]
  const [visible, setVisible] = useState(0)         // how many cards are shown
  const [flipped, setFlipped] = useState([false, false, false])
  const [error, setError] = useState('')

  const revealCards = (cards) => {
    setStarters(cards)
    setVisible(0)
    // stagger each card appearing: 0ms, 350ms, 700ms
    cards.forEach((_, i) => {
      setTimeout(() => setVisible(i + 1), i * 350)
    })
  }

  const generate = async () => {
    setLoading(true)
    setError('')
    setStarters(null)
    setVisible(0)
    setFlipped([false, false, false])

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, age, meeting, context }),
      })

      if (res.status === 429) {
        setError("You've hit the rate limit — come back in an hour.")
        return
      }
      if (!res.ok) throw new Error('API error')

      const { starters: cards } = await res.json()
      revealCards(cards)
    } catch {
      setError("Couldn't generate — try again")
    } finally {
      setLoading(false)
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
    setVisible(0)
    setFlipped([false, false, false])
    setError('')
  }

  const flipCard = (i) => {
    if (i < visible) {
      setFlipped(prev => prev.map((f, idx) => idx === i ? !f : f))
    }
  }

  const showCards = starters !== null

  return (
    <div className="app">
      <header className="header">
        <div className="logo">IceBreak</div>
        <h1 className="tagline">
          Open with something<br /><span>actually good.</span>
        </h1>
      </header>

      {/* Step dots */}
      {!showCards && !loading && (
        <div className="dots">
          {[1, 2, 3].map(n => (
            <div key={n} className={`dot ${step === n ? 'active' : ''}`} />
          ))}
        </div>
      )}

      {/* ── Step 1: Country ── */}
      {step === 1 && !showCards && !loading && (
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
      {step === 2 && !showCards && !loading && (
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
      {step === 3 && !showCards && !loading && (
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

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="card">
          <div className="spinner-wrap">
            <div className="spinner" />
            <div className="spinner-text">Reading the room…</div>
          </div>
        </div>
      )}

      {/* ── Cards (staggered reveal) ── */}
      {showCards && !loading && (
        <>
          <div className="results-header">
            <h2 className="results-title">Your openers</h2>
            <p className="results-hint">Tap a card to flip it</p>
          </div>

          <div className="cards-grid">
            {starters.map((text, i) => (
              <div
                key={i}
                className={`flip-card ${flipped[i] ? 'flipped' : ''} ${i < visible ? 'card-visible' : 'card-hidden'}`}
                onClick={() => flipCard(i)}
              >
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className="card-num">{i + 1}</div>
                    <div className="card-cta">Tap to reveal</div>
                  </div>
                  <div className="flip-card-back" style={{ background: CARD_COLORS[i] }}>
                    <p className="starter-text">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="error-text" style={{ marginTop: 16 }}>{error}</div>}

          <div className="reshuffle-wrap">
            <button className="btn btn-outline" onClick={startOver}>Start over</button>
            <button className="btn btn-outline" onClick={reshuffle}>↺ Reshuffle</button>
          </div>
        </>
      )}
    </div>
  )
}
