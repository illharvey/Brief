export function TopicsGrid() {
  const topics = [
    { emoji: "🌍", name: "Climate" },
    { emoji: "💻", name: "Technology" },
    { emoji: "📈", name: "Finance" },
    { emoji: "🎨", name: "Design" },
    { emoji: "🏛️", name: "Politics" },
    { emoji: "🔬", name: "Science" },
    { emoji: "🎭", name: "Culture" },
    { emoji: "⚽", name: "Sport" },
    { emoji: "🏥", name: "Health" },
    { emoji: "🚀", name: "Space" },
    { emoji: "🍽️", name: "Food" },
    { emoji: "✈️", name: "Travel" },
  ]

  return (
    <section id="topics" className="py-20 bg-milk">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="font-playfair font-bold text-3xl text-espresso text-center mb-4">100+ topics available</h2>
        <p className="font-dm-sans text-sm text-brief-muted text-center mb-12">From the niche to the mainstream — Brief covers it all.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topics.map(t => (
            <div key={t.name} className="border border-steam rounded-lg p-4 text-center hover:border-beeswax/40 transition-colors">
              <span className="text-3xl block mb-2">{t.emoji}</span>
              <p className="font-dm-sans text-sm font-medium text-espresso">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
