import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LandingNav } from "@/components/landing/nav"
import { Hero } from "@/components/landing/hero"
import { Ticker } from "@/components/landing/ticker"
import { HowItWorks } from "@/components/landing/how-it-works"
import { TopicsGrid } from "@/components/landing/topics-grid"
import { QuoteSection } from "@/components/landing/quote-section"
import { BottomCTA } from "@/components/landing/bottom-cta"
import { LandingFooter } from "@/components/landing/footer"

export default async function RootPage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <main className="bg-milk">
      <LandingNav />
      <Hero />
      <Ticker />
      <HowItWorks />
      <TopicsGrid />
      <QuoteSection />
      <BottomCTA />
      <LandingFooter />
    </main>
  )
}
