"use client"
import { useState, useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TimePicker } from "@/components/ui/time-picker"
import { saveDeliveryPreferenceAction } from "@/actions/preferences"

async function saveDeliveryWrapper(prevState: unknown, formData: FormData) {
  return await saveDeliveryPreferenceAction(formData)
}

export default function DeliveryPage() {
  const [deliveryTime, setDeliveryTime] = useState("08:00")
  const [timezone, setTimezone] = useState("")
  const [state, formAction, isPending] = useActionState(saveDeliveryWrapper, null)
  const router = useRouter()

  useEffect(() => {
    if (state && "success" in state && state.success) {
      // Clear onboarding cookie — onboarding is complete
      document.cookie = "onboarding_user_id=; path=/; max-age=0"
      // Pass userId as search param so confirmation page can query the DB for actual topics/time
      router.push(`/signup/confirmation?uid=${state.userId}`)
    }
  }, [state, router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">When should your Brief arrive?</h1>
        <p className="text-sm text-muted-foreground mt-1">Step 3 of 3</p>
      </div>

      <form action={formAction} className="space-y-4">
        <TimePicker
          value={deliveryTime}
          timezone={timezone}
          onTimeChange={setDeliveryTime}
          onTimezoneChange={setTimezone}
        />
        <input type="hidden" name="deliveryTime" value={deliveryTime} />

        {state?.error === "unauthenticated" && (
          <p className="text-sm text-destructive">Session expired. <a href="/signup" className="underline">Start over</a></p>
        )}

        <Button type="submit" className="w-full" disabled={isPending || !deliveryTime}>
          {isPending ? "Saving..." : "Finish setup"}
        </Button>
      </form>
    </div>
  )
}
