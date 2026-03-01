"use client"
import { useActionState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { signInAction } from "@/actions/auth"

async function signInWrapper(prevState: unknown, formData: FormData) {
  return await signInAction(formData)
}

// Inner component that uses useSearchParams — must be wrapped in Suspense
function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInWrapper, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.push(decodeURIComponent(callbackUrl))
    }
  }, [state, router, callbackUrl])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log in to Brief</h1>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm underline text-muted-foreground">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {/* Vague credential error — does not confirm email existence (user decision: locked) */}
        {state?.error === "invalid_credentials" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        {/* Rate limit feedback — 30-second cooldown per user decision */}
        {state?.error === "rate_limited" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
