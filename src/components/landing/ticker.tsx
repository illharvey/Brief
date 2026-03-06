export function Ticker() {
  const items = ["No doomscrolling", "Curated just for you", "Fresh every morning", "100+ topics available", "No algorithms. No noise.", "Just what matters"]
  const text = items.join(" ✦ ") + " ✦ "

  return (
    <div className="bg-espresso overflow-hidden py-3">
      {/* Duplicate span so translateX(-50%) creates seamless loop */}
      <div className="flex whitespace-nowrap animate-[ticker_25s_linear_infinite]">
        <span className="text-milk font-dm-sans text-sm shrink-0">{text}</span>
        <span className="text-milk font-dm-sans text-sm shrink-0">{text}</span>
      </div>
    </div>
  )
}
