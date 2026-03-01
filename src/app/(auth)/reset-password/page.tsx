"use client"
import { useActionState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { consumePasswordResetAction } from "@/actions/auth"

async function consumeResetWrapper(prevState: unknown, formData: FormData) {
  return await consumePasswordResetAction(formData)
}

// Inner component that uses useSearchParams — must be wrapped in Suspense
function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(consumeResetWrapper, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.push("/login?reset=success")
    }
  }, [state, router])

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-muted-foreground">This reset link is invalid. Request a new one.</p>
        <Link href="/forgot-password" className="underline text-sm">Request new link</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account.</p>
      </div>

      {state?.error === "invalid_or_expired_token" && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">This reset link has expired or already been used.</p>
          <Link href="/forgot-password" className="underline text-sm">Request a new link</Link>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Hidden token field — passed to server action */}
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Min 8 characters, 1 uppercase, 1 number"
            autoComplete="new-password"
            required
          />
          {state?.error === "invalid_input" && state.fieldErrors?.password && (
            <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          {state?.error === "invalid_input" && state.fieldErrors?.confirmPassword && (
            <p className="text-sm text-destructive">{state.fieldErrors.confirmPassword[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending || !token}>
          {isPending ? "Setting password..." : "Set new password"}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
