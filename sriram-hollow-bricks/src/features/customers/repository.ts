import { db, type DbCustomer, type SyncState } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { enqueue } from '@/core/sync/outbox'
import { customerInputSchema, type CustomerInput } from './schemas'

const ENTITY = 'customers' as const

// ---------- Reads (Dexie only — reactive via useLiveQuery) ----------

export async function listCustomers(businessId: string): Promise<DbCustomer[]> {
  const rows = await db.customers.where('businessId').equals(businessId).toArray()
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getCustomer(id: string): Promise<DbCustomer | undefined> {
  return db.customers.get(id)
}

// ---------- Writes ----------

export async function createCustomer(
  businessId: string,
  input: CustomerInput
): Promise<DbCustomer> {
  const parsed = customerInputSchema.parse(input)
  const now = Date.now()

  const doc: DbCustomer = {
    id: newId(),
    businessId,
    name: parsed.name,
    phone: parsed.phone || undefined,
    address: parsed.address || undefined,
    outstanding: 0,
    createdAt: now,
    updatedAt: now,
    _syncState: 'pending',
    _localUpdatedAt: now,
  }

  await db.customers.put(doc)
  await enqueue({
    entity: ENTITY,
    entityId: doc.id,
    businessId,
    op: 'upsert',
    payload: doc as unknown as Record<string, unknown>,
  })

  return doc
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<void> {
  const parsed = customerInputSchema.parse(input)
  const existing = await db.customers.get(id)
  if (!existing) throw new Error('Customer not found')

  const patch: Partial<DbCustomer> = {
    name: parsed.name,
    phone: parsed.phone || undefined,
    address: parsed.address || undefined,
    updatedAt: Date.now(),
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }

  await db.customers.update(id, patch)
  const updated = { ...existing, ...patch }

  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })
}

export async function deleteCustomer(id: string): Promise<void> {
  const existing = await db.customers.get(id)
  if (!existing) return

  // Guard: block delete if the customer has any invoices.
  // (invoices table is already declared in schema.ts, so this works pre-M2.)
  const invoiceCount = await db.invoices.where('customerId').equals(id).count()
  if (invoiceCount > 0) {
    throw new Error(
      `Cannot delete: this customer has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}.`
    )
  }

  await db.customers.delete(id)
  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'delete',
  })
}

/** Used by the sync worker's callbacks in sync.ts — not called by UI. */
export async function setCustomerSyncState(id: string, state: SyncState): Promise<void> {
  await db.customers.update(id, { _syncState: state })
}
