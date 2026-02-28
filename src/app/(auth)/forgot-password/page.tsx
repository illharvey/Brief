"use client"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { requestPasswordResetAction } from "@/actions/auth"

async function requestResetWrapper(prevState: unknown, formData: FormData) {
  return await requestPasswordResetAction(formData)
}

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestResetWrapper, null)

  if (state && "success" in state && state.success) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-muted-foreground">
          If an account exists for that email, a password reset link is on its way.
          The link expires in 1 hour.
        </p>
        <Link href="/login" className="text-sm underline text-muted-foreground">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="text-sm text-center">
        <Link href="/login" className="underline text-muted-foreground">Back to login</Link>
      </p>
    </div>
  )
}
