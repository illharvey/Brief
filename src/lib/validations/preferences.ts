import { z } from "zod"

export const topicsSchema = z.object({
  topics: z
    .array(z.string().min(1).max(100))
    .min(1, "Add at least one topic"),
})

export const deliveryPreferenceSchema = z.object({
  deliveryTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format"),
  timezone: z.string().min(1, "Timezone required"),
})
