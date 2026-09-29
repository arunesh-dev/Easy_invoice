import { z } from 'zod'

export const businessInputSchema = z.object({
  name: z.string().trim().min(1, 'Business name is required').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN')
    .optional()
    .or(z.literal('')),
})

export type BusinessInput = z.infer<typeof businessInputSchema>
