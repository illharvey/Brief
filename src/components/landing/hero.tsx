"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function Hero() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    router.push(`/signup?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <section className="pt-28 pb-20 bg-milk">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <div>
            <p className="font-dm-sans text-xs uppercase tracking-widest text-beeswax mb-4">
              The antidote to doomscrolling
            </p>
            <h1 className="font-playfair font-black text-4xl md:text-5xl text-espresso leading-tight mb-4">
              News that <em>matters to you.</em> Nothing else.
            </h1>
            <p className="font-libre-baskerville text-lg text-brief-muted leading-relaxed mb-8">
              Pick your interests once. Every morning, Brief delivers a curated, AI-composed briefing — no algorithms, no toxicity, no noise.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 font-dm-sans text-sm text-espresso bg-milk border border-warm-brown/30 rounded-[2px] focus:outline-none focus:border-beeswax"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-beeswax hover:bg-beeswax-deep text-milk font-dm-sans text-sm font-semibold rounded-[2px] transition-colors whitespace-nowrap"
              >
                Get Brief.
              </button>
            </form>
            {/* Social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#C1522A", "#5C3D1E", "#1C0F05", "#A33E1A"].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-milk" style={{ backgroundColor: color }} />
                ))}
              </div>
              <p className="font-dm-sans text-xs text-brief-muted">
                2,400+ readers already in the know
              </p>
            </div>
          </div>
          {/* Right column — phone mockup (CSS illustration) */}
          <div className="hidden md:flex justify-center">
            <div
              className="w-64 bg-espresso rounded-3xl shadow-2xl p-4"
              style={{ transform: "rotate(2deg)" }}
            >
              <div className="bg-milk rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-playfair font-black text-sm text-espresso">Brief<span className="text-beeswax">.</span></span>
                  <span className="font-dm-sans text-xs text-brief-muted">Today</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {["AI", "Finance", "Climate"].map(t => (
                    <span key={t} className="text-xs font-dm-sans px-2 py-0.5 bg-steam text-espresso rounded-full">{t}</span>
                  ))}
                </div>
                {[
                  { topic: "AI", text: "OpenAI releases new model..." },
                  { topic: "Finance", text: "Markets respond to Fed..." },
                ].map((item, i) => (
                  <div key={i} className="bg-cream rounded-lg p-3">
                    <p className="font-dm-sans text-xs text-beeswax font-medium mb-1">{item.topic}</p>
                    <p className="font-dm-sans text-xs text-espresso leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
