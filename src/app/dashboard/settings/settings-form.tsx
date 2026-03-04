"use client"

import { useState, useEffect, useActionState } from "react"
import { toast } from "sonner"
import { saveTopicsAction, saveDeliveryPreferenceAction } from "@/actions/preferences"
import { TopicInput } from "@/components/ui/topic-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const TIME_SLOTS = [
  { label: "6:00 AM",  value: "06:00" },
  { label: "7:00 AM",  value: "07:00" },
  { label: "8:00 AM",  value: "08:00" },
  { label: "9:00 AM",  value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "11:00 AM", value: "11:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "1:00 PM",  value: "13:00" },
  { label: "2:00 PM",  value: "14:00" },
  { label: "3:00 PM",  value: "15:00" },
  { label: "4:00 PM",  value: "16:00" },
  { label: "5:00 PM",  value: "17:00" },
  { label: "6:00 PM",  value: "18:00" },
  { label: "7:00 PM",  value: "19:00" },
  { label: "8:00 PM",  value: "20:00" },
  { label: "9:00 PM",  value: "21:00" },
  { label: "10:00 PM", value: "22:00" },
]

interface SettingsFormProps {
  initialTopics: string[]
  initialDeliveryTime: string
  initialTimezone: string
}

async function saveSettingsAction(prevState: unknown, formData: FormData) {
  const topicsResult = await saveTopicsAction(formData)
  if ("error" in topicsResult) return topicsResult
  const deliveryResult = await saveDeliveryPreferenceAction(formData)
  return deliveryResult
}

export function SettingsForm({
  initialTopics,
  initialDeliveryTime,
  initialTimezone: _initialTimezone,
}: SettingsFormProps) {
  const [topics, setTopics] = useState<string[]>(initialTopics)
  const [deliveryTime, setDeliveryTime] = useState(initialDeliveryTime)
  const [timezone, setTimezone] = useState("")

  const [state, formAction, isPending] = useActionState(saveSettingsAction, null)

  // Detect client timezone on mount
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(tz)
  }, [])

  // Show toast on action result
  useEffect(() => {
    if (!state) return
    if ("success" in state && state.success) {
      toast.success("Preferences saved")
    } else if ("error" in state) {
      toast.error("Failed to save. Try again.")
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden inputs */}
      <input type="hidden" name="topics" value={JSON.stringify(topics)} />
      <input type="hidden" name="deliveryTime" value={deliveryTime} />
      <input type="hidden" name="timezone" value={timezone} />

      {/* Topics section */}
      <div className="space-y-2">
        <label className="font-dm-sans text-sm font-medium text-espresso">
          Topics
        </label>
        <TopicInput value={topics} onChange={setTopics} />
      </div>

      {/* Delivery time section */}
      <div className="space-y-2">
        <label className="font-dm-sans text-sm font-medium text-espresso">
          Delivery time{timezone ? ` (${timezone})` : ""}
        </label>
        <Select value={deliveryTime} onValueChange={setDeliveryTime}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select a time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((slot) => (
              <SelectItem key={slot.value} value={slot.value}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Save button */}
      <Button
        type="submit"
        disabled={isPending}
        className="bg-beeswax hover:bg-beeswax-deep text-milk rounded-[2px] px-6 py-2"
        style={{ borderRadius: "2px" }}
      >
        {isPending ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  )
}
