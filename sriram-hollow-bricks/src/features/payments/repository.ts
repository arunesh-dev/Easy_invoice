import { db, type DbPayment, type PaymentMethod } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { enqueue } from '@/core/sync/outbox'
import { canAcceptPayment, balanceOf } from '@/features/invoices/math'
import {
  recalcCustomerOutstandingTx,
  recalcInvoiceTx,
} from '@/features/invoices/repository'
import { paymentInputSchema, type PaymentInput } from './schemas'

const ENTITY = 'payments' as const

// ---------- Reads ----------

export async function getPayment(id: string): Promise<DbPayment | undefined> {
  return db.payments.get(id)
}

// ---------- Writes ----------

/**
 * Record a payment against an invoice. Atomic: payment + invoice + customer
 * all update together, all enqueued for sync in the same transaction.
 *
 * Rejects overpayments at the repository level. The UI clamps too, but never
 * trust the UI.
 */
export async function createPayment(
  businessId: string,
  input: PaymentInput
): Promise<DbPayment> {
  const parsed = paymentInputSchema.parse(input)

  return db.transaction(
    'rw',
    db.payments, db.invoices, db.customers, db.outbox,
    async () => {
      const invoice = await db.invoices.get(parsed.invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.businessId !== businessId) throw new Error('Invoice belongs to another business')

      if (!canAcceptPayment(invoice.total, invoice.paidAmount, parsed.amount)) {
        const max = balanceOf(invoice.total, invoice.paidAmount)
        throw new Error(
          `Amount exceeds remaining balance of ₹${max.toLocaleString('en-IN')}`
        )
      }

      const now = Date.now()
      const doc: DbPayment = {
        id: newId(),
        businessId,
        invoiceId: parsed.invoiceId,
        amount: parsed.amount,
        method: parsed.method as PaymentMethod,
        date: parsed.date,
        note: parsed.note || undefined,
        isCancelled: false,
        _syncState: 'pending',
        _localUpdatedAt: now,
      }

      await db.payments.put(doc)
      await enqueue({
        entity: ENTITY,
        entityId: doc.id,
        businessId,
        op: 'upsert',
        payload: doc as unknown as Record<string, unknown>,
      })

      // Invoice recalc reads the payments we just wrote — same transaction.
      await recalcInvoiceTx(parsed.invoiceId)
      // Customer outstanding recomputes from the current invoices.
      await recalcCustomerOutstandingTx(invoice.customerId)

      return doc
    }
  )
}

/**
 * Cancel a payment. Keeps the row (soft delete) with `isCancelled = true`
 * so the audit trail survives. Rolls back the invoice and customer balances
 * in the same transaction.
 */
export async function cancelPayment(
  paymentId: string,
  reason: string
): Promise<void> {
  return db.transaction(
    'rw',
    db.payments, db.invoices, db.customers, db.outbox,
    async () => {
      const payment = await db.payments.get(paymentId)
      if (!payment) throw new Error('Payment not found')
      if (payment.isCancelled) return

      const patch: Partial<DbPayment> = {
        isCancelled: true,
        cancelledReason: reason,
        _syncState: 'pending',
        _localUpdatedAt: Date.now(),
      }
      await db.payments.update(paymentId, patch)
      const updated = { ...payment, ...patch }

      await enqueue({
        entity: ENTITY,
        entityId: paymentId,
        businessId: payment.businessId,
        op: 'upsert',
        payload: updated as unknown as Record<string, unknown>,
      })

      const invoice = await db.invoices.get(payment.invoiceId)
      if (!invoice) return

      await recalcInvoiceTx(payment.invoiceId)
      await recalcCustomerOutstandingTx(invoice.customerId)
    }
  )
}

/**
 * Sync-worker callback. Mirrors the pattern in customers/products.
 */
export async function setPaymentSyncState(id: string, state: 'synced' | 'pending' | 'error'): Promise<void> {
  await db.payments.update(id, { _syncState: state })
}
