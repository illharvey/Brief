import { db } from "@/lib/db/client"
import { verificationTokens, users } from "@/lib/db/schema"
import { and, eq, gt } from "drizzle-orm"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams

  if (!token || !email) {
    return <VerifyError message="Invalid verification link." />
  }

  const tokenRow = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.token, token),
      eq(verificationTokens.identifier, email),
      gt(verificationTokens.expires, new Date())
    ),
  })

  if (!tokenRow) {
    return <VerifyError message="This verification link has expired or already been used." />
  }

  // Mark email as verified on the user record
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, email))

  // Clean up the used token
  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.token, token), eq(verificationTokens.identifier, email)))

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="text-4xl mb-2">&#x2713;</div>
        <h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
        <p className="text-muted-foreground mt-2">Your email is confirmed. Log in to access Brief.</p>
      </div>
      <Button asChild className="w-full">
        <Link href="/login">Log in</Link>
      </Button>
    </div>
  )
}

function VerifyError({ message }: { message: string }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Verification failed</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link href="/login">Go to login</Link>
      </Button>
    </div>
  )
}
