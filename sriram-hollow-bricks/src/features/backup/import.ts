import { db } from '@/core/db/schema'
import { enqueue } from '@/core/sync/outbox'
import { backupPayloadSchema } from './import-schema'

export interface ImportResult {
  customers: number
  products: number
  invoices: number
  payments: number
  expenses: number
  skipped: number
}

export interface ImportOptions {
  /** Refuse to import if the backup's businessId differs from this. */
  currentBusinessId: string
  /** Overwrite existing records with the same ID (default true). */
  overwrite?: boolean
}

export class ImportError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

export async function importBackup(
  rawJson: string,
  options: ImportOptions
): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new ImportError('File is not valid JSON', 'INVALID_JSON')
  }

  const result = backupPayloadSchema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new ImportError(
      `Backup is malformed: ${first.path.join('.')} — ${first.message}`,
      'INVALID_SCHEMA'
    )
  }

  const backup = result.data
  const overwrite = options.overwrite ?? true

  // Cross-business guard: refuse mixed data.
  const backupBusinessIds = new Set<string>([
    ...backup.customers.map((c) => c.businessId),
    ...backup.products.map((p) => p.businessId),
    ...backup.invoices.map((i) => i.businessId),
    ...backup.payments.map((p) => p.businessId),
    ...backup.expenses.map((e) => e.businessId),
  ])

  for (const bid of backupBusinessIds) {
    if (bid !== options.currentBusinessId) {
      throw new ImportError(
        `This backup belongs to a different business (${bid}). Sign in as that owner to import.`,
        'WRONG_BUSINESS'
      )
    }
  }

  const counts: ImportResult = {
    customers: 0, products: 0, invoices: 0, payments: 0, expenses: 0, skipped: 0,
  }

  const now = Date.now()

  // ---- Customers ----
  for (const row of backup.customers) {
    const existing = await db.customers.get(row.id)
    if (existing && !overwrite) { counts.skipped++; continue }
    const doc = {
      ...row,
      _syncState: 'pending' as const,
      _localUpdatedAt: now,
    }
    await db.customers.put(doc)
    await enqueue({
      entity: 'customers', entityId: doc.id, businessId: doc.businessId,
      op: 'upsert', payload: doc as unknown as Record<string, unknown>,
    })
    counts.customers++
  }

  // ---- Products ----
  for (const row of backup.products) {
    const existing = await db.products.get(row.id)
    if (existing && !overwrite) { counts.skipped++; continue }
    const doc = { ...row, _syncState: 'pending' as const, _localUpdatedAt: now }
    await db.products.put(doc)
    await enqueue({
      entity: 'products', entityId: doc.id, businessId: doc.businessId,
      op: 'upsert', payload: doc as unknown as Record<string, unknown>,
    })
    counts.products++
  }

  // ---- Invoices + Payments (single transaction to keep referential integrity) ----
  await db.transaction(
    'rw', db.invoices, db.payments, db.outbox,
    async () => {
      for (const row of backup.invoices) {
        const existing = await db.invoices.get(row.id)
        if (existing && !overwrite) { counts.skipped++; continue }
        const doc = { ...row, _syncState: 'pending' as const, _localUpdatedAt: now }
        await db.invoices.put(doc)
        await enqueue({
          entity: 'invoices', entityId: doc.id, businessId: doc.businessId,
          op: 'upsert', payload: doc as unknown as Record<string, unknown>,
        })
        counts.invoices++
      }

      for (const row of backup.payments) {
        const existing = await db.payments.get(row.id)
        if (existing && !overwrite) { counts.skipped++; continue }
        const doc = { ...row, _syncState: 'pending' as const, _localUpdatedAt: now }
        await db.payments.put(doc)
        await enqueue({
          entity: 'payments', entityId: doc.id, businessId: doc.businessId,
          op: 'upsert', payload: doc as unknown as Record<string, unknown>,
        })
        counts.payments++
      }
    }
  )

  // ---- Expenses ----
  for (const row of backup.expenses) {
    const existing = await db.expenses.get(row.id)
    if (existing && !overwrite) { counts.skipped++; continue }
    const doc = { ...row, _syncState: 'pending' as const, _localUpdatedAt: now }
    await db.expenses.put(doc)
    await enqueue({
      entity: 'expenses', entityId: doc.id, businessId: doc.businessId,
      op: 'upsert', payload: doc as unknown as Record<string, unknown>,
    })
    counts.expenses++
  }

  // ---- Settings (invoice counter) — restore the highest value ----
  for (const s of backup.settings) {
    if (s.businessId !== options.currentBusinessId) continue
    const current = await db.settings.get(s.businessId)
    if (!current || current.lastInvoiceNumber < s.lastInvoiceNumber) {
      await db.settings.put(s)
    }
  }

  return counts
}

/** Read a File object as text and hand off to importBackup. */
export async function importBackupFromFile(
  file: File,
  options: ImportOptions
): Promise<ImportResult> {
  if (file.size > 50 * 1024 * 1024) {
    throw new ImportError('Backup file is larger than 50 MB', 'TOO_LARGE')
  }
  const text = await file.text()
  return importBackup(text, options)
}
