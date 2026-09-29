import { z } from 'zod'

export const productInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  unit: z.string().trim().min(1, 'Unit is required').max(20), // piece / cft / load
  price: z.coerce
    .number()
    .nonnegative('Price cannot be negative')
    .max(10_000_000),
  category: z.string().trim().max(40).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export type ProductInput = z.infer<typeof productInputSchema>
