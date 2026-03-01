"use client"
import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { signUpAction } from "@/actions/auth"

// Wrapper action that sets cookie and redirects (must run client-side after action result)
async function signUpWrapper(prevState: unknown, formData: FormData) {
  return await signUpAction(formData)
}

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWrapper, null)
  const router = useRouter()

  useEffect(() => {
    if (state && "success" in state && state.success && state.userId) {
      // Set onboarding cookie (client-side; short-lived; cleared after Step 3)
      document.cookie = `onboarding_user_id=${state.userId}; path=/; max-age=3600; SameSite=Lax`
      router.push("/signup/topics")
    }
  }, [state, router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Step 1 of 3</p>
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
          {state?.error === "invalid_input" && state.fieldErrors?.email && (
            <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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

        {state?.error === "duplicate_email" && (
          <p className="text-sm text-destructive">
            An account with this email exists.{" "}
            <Link href="/login" className="underline">Log in?</Link>
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating account..." : "Continue"}
        </Button>
      </form>

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline">Log in</Link>
      </p>
    </div>
  )
}
