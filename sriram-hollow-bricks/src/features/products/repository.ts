import { db, type DbProduct } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { enqueue } from '@/core/sync/outbox'
import { productInputSchema, type ProductInput } from './schemas'

const ENTITY = 'products' as const

// ---------- Reads ----------

export async function listProducts(
  businessId: string,
  opts: { includeInactive?: boolean } = {}
): Promise<DbProduct[]> {
  let rows = await db.products.where('businessId').equals(businessId).toArray()
  if (!opts.includeInactive) rows = rows.filter((p) => p.isActive)
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getProduct(id: string): Promise<DbProduct | undefined> {
  return db.products.get(id)
}

// ---------- Writes ----------

export async function createProduct(
  businessId: string,
  input: ProductInput
): Promise<DbProduct> {
  const parsed = productInputSchema.parse(input)
  const now = Date.now()

  const doc: DbProduct = {
    id: newId(),
    businessId,
    name: parsed.name,
    unit: parsed.unit,
    price: parsed.price,
    category: parsed.category || undefined,
    isActive: parsed.isActive,
    createdAt: now,
    _syncState: 'pending',
    _localUpdatedAt: now,
  }

  await db.products.put(doc)
  await enqueue({
    entity: ENTITY,
    entityId: doc.id,
    businessId,
    op: 'upsert',
    payload: doc as unknown as Record<string, unknown>,
  })

  return doc
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const parsed = productInputSchema.parse(input)
  const existing = await db.products.get(id)
  if (!existing) throw new Error('Product not found')

  const patch: Partial<DbProduct> = {
    name: parsed.name,
    unit: parsed.unit,
    price: parsed.price,
    category: parsed.category || undefined,
    isActive: parsed.isActive,
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }

  await db.products.update(id, patch)
  const updated = { ...existing, ...patch }

  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })
}

/**
 * Soft toggle — the recommended path for deactivating a product that
 * appears in past invoices. Never breaks historical line items.
 */
export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  const existing = await db.products.get(id)
  if (!existing) return
  await updateProduct(id, {
    name: existing.name,
    unit: existing.unit,
    price: existing.price,
    category: existing.category,
    isActive,
  })
}

/**
 * Hard delete. Blocked if the product appears in any invoice.
 * Prefer setProductActive(false) — that's the intended UI action.
 */
export async function deleteProduct(id: string): Promise<void> {
  const existing = await db.products.get(id)
  if (!existing) return

  // Linear scan — product IDs appear inside invoice lineItems arrays,
  // which Dexie can't index. Fine for M1 scale (<1000 invoices).
  const invoices = await db.invoices.where('businessId').equals(existing.businessId).toArray()
  const usedIn = invoices.find((inv) => inv.lineItems.some((li) => li.productId === id))
  if (usedIn) {
    throw new Error(
      `Cannot delete: used in invoice ${usedIn.invoiceNumber}. Deactivate it instead.`
    )
  }

  await db.products.delete(id)
  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'delete',
  })
}
