import { z } from 'zod'

const zSyncState = z.enum(['synced', 'pending', 'error'])

const zBusiness = z.object({
  id: z.string(),
  ownerUid: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  createdAt: z.number(),
  _syncState: zSyncState.optional(),
  _localUpdatedAt: z.number().optional(),
}).passthrough()

const zCustomer = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  outstanding: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
}).passthrough()

const zProduct = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  unit: z.string(),
  price: z.number(),
  category: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.number(),
}).passthrough()

const zInvoice = z.object({
  id: z.string(),
  businessId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  invoiceNumber: z.string(),
  lineItems: z.array(z.any()),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  paidAmount: z.number(),
  balance: z.number(),
  status: z.enum(['UNPAID', 'PARTIAL', 'PAID']),
  issuedAt: z.number(),
  notes: z.string().optional(),
}).passthrough()

const zPayment = z.object({
  id: z.string(),
  businessId: z.string(),
  invoiceId: z.string(),
  amount: z.number(),
  method: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE']),
  date: z.number(),
  note: z.string().optional(),
  isCancelled: z.boolean(),
  cancelledReason: z.string().optional(),
}).passthrough()

const zExpense = z.object({
  id: z.string(),
  businessId: z.string(),
  category: z.string(),
  amount: z.number(),
  method: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE']),
  date: z.number(),
  note: z.string().optional(),
}).passthrough()

const zSettings = z.object({
  businessId: z.string(),
  invoicePrefix: z.string(),
  lastInvoiceNumber: z.number(),
}).passthrough()

export const backupPayloadSchema = z.object({
  format: z.literal('sriram-backup'),
  version: z.literal(1),
  exportedAt: z.number(),
  business: z.array(zBusiness),
  customers: z.array(zCustomer),
  products: z.array(zProduct),
  invoices: z.array(zInvoice),
  payments: z.array(zPayment),
  expenses: z.array(zExpense),
  settings: z.array(zSettings),
})

export type BackupPayloadParsed = z.infer<typeof backupPayloadSchema>
