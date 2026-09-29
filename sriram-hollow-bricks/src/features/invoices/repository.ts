import { db, type DbInvoice, type DbPayment, type InvoiceStatus, type SyncState, type DbCustomer } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { enqueue } from '@/core/sync/outbox'
import { balanceOf, computeTotals, lineTotal, statusOf } from './math'
import { nextInvoiceNumber } from './numbering'
import { invoiceInputSchema, type InvoiceInput } from './schemas'

const ENTITY = 'invoices' as const

// ---------- Reads ----------

export async function listInvoices(
  businessId: string,
  filter: { status?: InvoiceStatus; customerId?: string } = {}
): Promise<DbInvoice[]> {
  let rows = await db.invoices.where('businessId').equals(businessId).toArray()
  if (filter.status)     rows = rows.filter((i) => i.status === filter.status)
  if (filter.customerId) rows = rows.filter((i) => i.customerId === filter.customerId)
  return rows.sort((a, b) => b.issuedAt - a.issuedAt)
}

export async function getInvoice(id: string): Promise<DbInvoice | undefined> {
  return db.invoices.get(id)
}

export async function listPayments(invoiceId: string): Promise<DbPayment[]> {
  const rows = await db.payments.where('invoiceId').equals(invoiceId).toArray()
  return rows
    .filter((p) => !p.isCancelled)
    .sort((a, b) => a.date - b.date)
}

// ---------- Writes ----------

export async function createInvoice(
  businessId: string,
  input: InvoiceInput
): Promise<DbInvoice> {
  const parsed = invoiceInputSchema.parse(input)

  // Recompute totals and line totals — never trust the UI's numbers.
  const lines = parsed.lineItems.map((l) => ({
    ...l,
    total: lineTotal(l.qty, l.price),
  }))
  const totals = computeTotals({ lines, discount: parsed.discount })

  const invoiceNumber = await nextInvoiceNumber(businessId)
  const now = Date.now()

  const doc: DbInvoice = {
    id: newId(),
    businessId,
    customerId: parsed.customerId,
    customerName: parsed.customerName,
    invoiceNumber,
    lineItems: lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    paidAmount: 0,
    balance: totals.total,
    status: 'UNPAID',
    issuedAt: now,
    notes: parsed.notes || undefined,
    _syncState: 'pending',
    _localUpdatedAt: now,
  }

  await db.invoices.put(doc)
  await enqueue({
    entity: ENTITY,
    entityId: doc.id,
    businessId,
    op: 'upsert',
    payload: doc as unknown as Record<string, unknown>,
  })

  return doc
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<void> {
  const existing = await db.invoices.get(id)
  if (!existing) throw new Error('Invoice not found')

  const payments = await listPayments(id)
  if (payments.length > 0) {
    throw new Error('Cannot edit an invoice that already has payments.')
  }

  const parsed = invoiceInputSchema.parse(input)
  const lines = parsed.lineItems.map((l) => ({ ...l, total: lineTotal(l.qty, l.price) }))
  const totals = computeTotals({ lines, discount: parsed.discount })

  const patch: Partial<DbInvoice> = {
    customerId: parsed.customerId,
    customerName: parsed.customerName,
    lineItems: lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    paidAmount: 0,
    balance: totals.total,
    status: 'UNPAID',
    notes: parsed.notes || undefined,
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }

  await db.invoices.update(id, patch)
  const updated = { ...existing, ...patch }
  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  const existing = await db.invoices.get(id)
  if (!existing) return

  const payments = await listPayments(id)
  if (payments.length > 0) {
    throw new Error('Cannot delete an invoice that has payments.')
  }

  await db.invoices.delete(id)
  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'delete',
  })
}

/**
 * Internal: assumes you are ALREADY inside a Dexie transaction that covers
 * invoices + payments + outbox. Never call this from outside a transaction.
 */
export async function recalcInvoiceTx(invoiceId: string): Promise<DbInvoice | undefined> {
  const invoice = await db.invoices.get(invoiceId)
  if (!invoice) return undefined

  const payments = await listPayments(invoiceId)
  const paid = payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = balanceOf(invoice.total, paid)
  const status = statusOf(invoice.total, paid)

  const patch: Partial<DbInvoice> = {
    paidAmount: paid,
    balance,
    status,
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }
  await db.invoices.update(invoiceId, patch)
  const updated = { ...invoice, ...patch }

  await enqueue({
    entity: 'invoices',
    entityId: invoiceId,
    businessId: invoice.businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })

  return updated
}

/**
 * Public wrapper — use this from the UI or tests. Opens its own transaction.
 */
export async function recalcInvoiceFromPayments(invoiceId: string): Promise<DbInvoice | undefined> {
  return db.transaction(
    'rw',
    db.invoices, db.payments, db.outbox,
    () => recalcInvoiceTx(invoiceId)
  )
}

/**
 * Internal: recompute a customer's outstanding from the current set of
 * non-cancelled invoices. Assumes you are already inside a transaction
 * covering customers + invoices + outbox.
 *
 * Called after every payment change. O(n) over the customer's invoices,
 * which is fine at this scale and impossible to get out of sync.
 */
export async function recalcCustomerOutstandingTx(customerId: string): Promise<DbCustomer | undefined> {
  const customer = await db.customers.get(customerId)
  if (!customer) return undefined

  const invoices = await db.invoices.where('customerId').equals(customerId).toArray()
  const outstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0)

  if (customer.outstanding === outstanding) return customer

  const patch: Partial<DbCustomer> = {
    outstanding,
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }
  await db.customers.update(customerId, patch)
  const updated = { ...customer, ...patch }

  await enqueue({
    entity: 'customers',
    entityId: customerId,
    businessId: customer.businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })

  return updated
}

/** Sync worker callback. Kept for symmetry with the customers repo. */
export async function setInvoiceSyncState(id: string, state: SyncState): Promise<void> {
  await db.invoices.update(id, { _syncState: state })
}
