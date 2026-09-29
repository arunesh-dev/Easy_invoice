import { z } from 'zod'
import { PAYMENT_METHODS } from '@/features/payments/schemas'

export const EXPENSE_CATEGORIES = [
  'Raw materials', 'Fuel', 'Transport', 'Labour', 'Repairs',
  'Electricity', 'Rent', 'Office', 'Misc',
] as const

export const expenseInputSchema = z.object({
  category: z.string().trim().min(1, 'Category is required').max(40),
  amount: z.coerce
    .number()
    .positive('Amount must be greater than 0')
    .max(10_000_000),
  method: z.enum(PAYMENT_METHODS),
  date: z.coerce.number().int().positive(),
  note: z.string().trim().max(200).optional().or(z.literal('')),
})

export type ExpenseInput = z.infer<typeof expenseInputSchema>
