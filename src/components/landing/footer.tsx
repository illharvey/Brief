import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="bg-espresso border-t border-warm-brown/20 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="font-playfair font-black text-2xl text-milk">
              Brief<span className="text-beeswax">.</span>
            </span>
            <p className="font-dm-sans text-xs text-brief-muted mt-1">News that matters. Nothing else.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {["About", "Topics", "Privacy", "Terms", "Contact"].map(link => (
              <Link key={link} href={`/${link.toLowerCase()}`} className="font-dm-sans text-xs text-brief-muted hover:text-milk transition-colors">
                {link}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-warm-brown/20 text-center">
          <p className="font-dm-sans text-xs text-brief-muted">
            © {new Date().getFullYear()} Brief. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
