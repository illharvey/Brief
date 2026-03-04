import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar userEmail={session.user.email ?? ""} />
      <main className="flex-1 bg-milk relative overflow-auto">
        {/* Grain texture overlay — fixed, pointer-events-none */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{ opacity: 0.4 }}
        >
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="brief-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#brief-grain)" />
          </svg>
        </div>
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  )
}
