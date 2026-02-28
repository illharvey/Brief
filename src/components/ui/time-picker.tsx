"use client"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  value: string       // "HH:MM" format
  timezone: string    // IANA tz string
  onTimeChange: (time: string) => void
  onTimezoneChange: (tz: string) => void
}

// Format "HH:MM" as "8:00am" or "2:30pm"
function formatTimeDisplay(time: string): string {
  if (!time) return ""
  const [hourStr, minuteStr] = time.split(":")
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr
  const period = hour >= 12 ? "pm" : "am"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minute}${period}`
}

export function TimePicker({ value, timezone, onTimeChange, onTimezoneChange }: TimePickerProps) {
  const [detectedTimezone, setDetectedTimezone] = useState(timezone)

  useEffect(() => {
    // Auto-detect from browser — standard Intl API, no library needed
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTimezone(tz)
    onTimezoneChange(tz)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="delivery-time">Delivery time</Label>
        <Input
          id="delivery-time"
          type="time"
          value={value}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-40"
          required
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {value
          ? `Your briefing will arrive at ${formatTimeDisplay(value)} — ${detectedTimezone}`
          : `Your timezone: ${detectedTimezone}`}
      </p>
      {/* Hidden input carries timezone for form submission */}
      <input type="hidden" name="timezone" value={detectedTimezone} />
    </div>
  )
}
