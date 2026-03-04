import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Logged in as <strong>{session?.user?.email}</strong>
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Phase 6 will replace this placeholder with the full briefing viewer.
      </p>
    </div>
  )
}
