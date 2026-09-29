import { toP, toR } from '@/core/money'
import type { InvoiceStatus } from '@/core/db/schema'

export interface LineInput {
  qty: number
  price: number
}

export interface InvoiceInputs {
  lines: LineInput[]
  /** Absolute rupee discount, applied after subtotal. */
  discount?: number
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  total: number
}

// ---------- Line math ----------

/** qty × price, rounded to paise. Supports fractional qty (cft, kg). */
export function lineTotal(qty: number, price: number): number {
  if (!Number.isFinite(qty) || qty < 0) throw new Error('Invalid quantity')
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price')
  return toR(Math.round(qty * toP(price)))
}

// ---------- Invoice totals ----------

/**
 * Subtotal = Σ line totals.
 * Total = max(0, subtotal − discount). Discount can never make total negative.
 */
export function computeTotals({ lines, discount = 0 }: InvoiceInputs): InvoiceTotals {
  const subtotalPaise = lines.reduce(
    (sum, l) => sum + Math.round(l.qty * toP(l.price)),
    0
  )
  const discountPaise = Math.max(0, toP(discount))
  const totalPaise = Math.max(0, subtotalPaise - discountPaise)

  return {
    subtotal: toR(subtotalPaise),
    discount: toR(discountPaise),
    total: toR(totalPaise),
  }
}

/** Convert a percentage discount into an absolute rupee amount. UI-only helper. */
export function percentOff(subtotal: number, pct: number): number {
  if (pct < 0 || pct > 100) throw new Error('Percent must be between 0 and 100')
  return toR(Math.round((toP(subtotal) * pct) / 100))
}

// ---------- Balance / status ----------

/** Amount still owed. Never negative — overpayment is a bug, not a refund. */
export function balanceOf(total: number, paid: number): number {
  return toR(Math.max(0, toP(total) - toP(paid)))
}

export function statusOf(total: number, paid: number): InvoiceStatus {
  const t = toP(total)
  const p = toP(paid)
  if (p <= 0) return 'UNPAID'
  if (p >= t) return 'PAID'
  return 'PARTIAL'
}

// ---------- Payment guards ----------

/** Highest amount a user can enter on the Record Payment form. */
export function maxPayment(total: number, paid: number): number {
  return balanceOf(total, paid)
}

/** True if `amount` is a valid, non-zero payment not exceeding the balance. */
export function canAcceptPayment(total: number, paid: number, amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false
  return toP(amount) <= toP(total) - toP(paid)
}
