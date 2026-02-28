import { auth } from "@/lib/auth"
import { signOutAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Logged in as <strong>{session?.user?.email}</strong></p>
        <p className="text-sm text-muted-foreground">
          Phase 6 will replace this placeholder with the full briefing viewer.
        </p>
      </div>

      {/* AUTH-05: Sign out callable from any page */}
      <form action={signOutAction}>
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </main>
  )
}
