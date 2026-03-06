import Link from "next/link"

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-espresso/95 backdrop-blur-sm border-b border-warm-brown/20">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-playfair font-black text-2xl text-milk">
          Brief<span className="text-beeswax">.</span>
        </span>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-brief-muted hover:text-milk font-dm-sans text-sm transition-colors">How it works</a>
          <a href="#topics" className="text-brief-muted hover:text-milk font-dm-sans text-sm transition-colors">Topics</a>
          <Link href="/login" className="text-brief-muted hover:text-milk font-dm-sans text-sm transition-colors">Log in</Link>
          <Link href="/signup" className="text-brief-muted hover:text-milk font-dm-sans text-sm transition-colors">Sign up</Link>
        </div>
        <Link
          href="/signup"
          className="bg-beeswax hover:bg-beeswax-deep text-milk font-dm-sans text-sm font-medium px-4 py-2 rounded-[2px] transition-colors"
        >
          Get started
        </Link>
      </div>
    </nav>
  )
}
