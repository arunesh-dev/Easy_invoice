import { z } from 'zod'

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().max(240).optional().or(z.literal('')),
})

export type CustomerInput = z.infer<typeof customerInputSchema>
