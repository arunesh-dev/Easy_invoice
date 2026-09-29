import { db } from '@/core/db/schema'

const DEFAULT_PREFIX = 'SRM'
const PAD = 4

/** `SRM-0042`. Padding stops at 4 digits, so #10000 → `SRM-10000`. */
export function formatInvoiceNumber(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(PAD, '0')}`
}

/**
 * Atomically mint the next invoice number for a business.
 * Safe to call offline; safe against concurrent React renders.
 */
export async function nextInvoiceNumber(
  businessId: string,
  prefix: string = DEFAULT_PREFIX
): Promise<string> {
  return db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(businessId)
    const next = (row?.lastInvoiceNumber ?? 0) + 1

    await db.settings.put({
      businessId,
      invoicePrefix: row?.invoicePrefix ?? prefix,
      lastInvoiceNumber: next,
    })

    return formatInvoiceNumber(prefix, next)
  })
}

/** Read the current counter without incrementing. For diagnostics. */
export async function peekInvoiceCounter(businessId: string): Promise<number> {
  const row = await db.settings.get(businessId)
  return row?.lastInvoiceNumber ?? 0
}

/**
 * Force the counter to at least `value`. Call this after pulling remote
 * invoices at login, so a fresh device never re-issues an existing number.
 */
export async function ensureCounterAtLeast(
  businessId: string,
  value: number,
  prefix: string = DEFAULT_PREFIX
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(businessId)
    if (!row || row.lastInvoiceNumber < value) {
      await db.settings.put({
        businessId,
        invoicePrefix: row?.invoicePrefix ?? prefix,
        lastInvoiceNumber: value,
      })
    }
  })
}
