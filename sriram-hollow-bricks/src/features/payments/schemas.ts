import { z } from 'zod'

export const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK', 'CHEQUE'] as const

export const paymentInputSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce
    .number()
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount is too large'),
  method: z.enum(PAYMENT_METHODS),
  date: z.coerce.number().int().positive(),
  note: z.string().trim().max(200).optional().or(z.literal('')),
})

export const cancelPaymentSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(200),
})

export type PaymentInput = z.infer<typeof paymentInputSchema>
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>
