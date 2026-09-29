import { db, type DbBusiness } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { enqueue } from '@/core/sync/outbox'
import { businessInputSchema, type BusinessInput } from './schemas'

const ENTITY = 'businesses' as const

export async function getBusiness(businessId: string): Promise<DbBusiness | undefined> {
  return db.businesses.get(businessId)
}

/**
 * Create the business doc and link it to the user. Called exactly once,
 * from the onboarding screen, right after signup.
 *
 * Also updates `users/{uid}.businessId` — done directly to Firestore since
 * this is a fire-and-forget step that only needs to succeed once, online.
 */
export async function createBusiness(
  ownerUid: string,
  input: BusinessInput
): Promise<DbBusiness> {
  const parsed = businessInputSchema.parse(input)
  const id = newId()
  const now = Date.now()

  const doc: DbBusiness = {
    id,
    ownerUid,
    name: parsed.name,
    phone: parsed.phone || undefined,
    address: parsed.address || undefined,
    gstin: parsed.gstin || undefined,
    createdAt: now,
    _syncState: 'pending',
    _localUpdatedAt: now,
  }

  await db.businesses.put(doc)
  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: id,
    op: 'upsert',
    payload: doc as unknown as Record<string, unknown>,
  })

  return doc
}

export async function updateBusiness(
  businessId: string,
  input: BusinessInput
): Promise<void> {
  const existing = await db.businesses.get(businessId)
  if (!existing) throw new Error('Business not found')

  const parsed = businessInputSchema.parse(input)

  const patch: Partial<DbBusiness> = {
    name: parsed.name,
    phone: parsed.phone || undefined,
    address: parsed.address || undefined,
    gstin: parsed.gstin || undefined,
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }

  await db.businesses.update(businessId, patch)
  const updated = { ...existing, ...patch }

  await enqueue({
    entity: ENTITY,
    entityId: businessId,
    businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })
}
