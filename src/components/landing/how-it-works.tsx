export function HowItWorks() {
  const steps = [
    { num: "01", title: "Pick your topics", desc: "Choose from 100+ topics — sports, finance, climate, culture, and more. Freeform typing welcome." },
    { num: "02", title: "We do the reading", desc: "Brief scans hundreds of sources every day, filters out the noise, and composes a personalised briefing." },
    { num: "03", title: "Your brief arrives", desc: "At your chosen time each morning, a clean HTML email (and web reader) delivers exactly what matters to you." },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-cream">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="font-playfair font-bold text-3xl text-espresso text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(step => (
            <div key={step.num} className="text-center">
              <p className="font-playfair font-black text-5xl text-steam mb-4">{step.num}</p>
              <h3 className="font-playfair font-bold text-lg text-espresso mb-3">{step.title}</h3>
              <p className="font-dm-sans text-sm text-brief-muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
