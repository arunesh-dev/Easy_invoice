import { z } from 'zod'

export const lineItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(20),
  qty: z.coerce.number().positive('Qty must be > 0').max(1_000_000),
  price: z.coerce.number().nonnegative().max(10_000_000),
  total: z.number().nonnegative(),
})

export const invoiceInputSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  customerName: z.string().min(1),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one item'),
  discount: z.coerce.number().nonnegative().max(10_000_000).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type InvoiceInput = z.infer<typeof invoiceInputSchema>
export type LineItemInput = z.infer<typeof lineItemSchema>
