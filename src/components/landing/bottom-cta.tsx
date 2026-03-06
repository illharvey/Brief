"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function BottomCTA() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    router.push(`/signup?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <section className="py-20" style={{ backgroundColor: "#FDF4E0" }}>
      <div className="max-w-xl mx-auto px-6 text-center">
        <h2 className="font-playfair font-bold text-3xl text-espresso mb-4">
          Start reading what matters.
        </h2>
        <p className="font-libre-baskerville text-base text-brief-muted mb-8">
          Free to start. No credit card. No noise.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
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
            Start Reading
          </button>
        </form>
        <p className="font-dm-sans text-xs text-brief-muted mt-4">Free to start. No credit card. No noise.</p>
      </div>
    </section>
  )
}
