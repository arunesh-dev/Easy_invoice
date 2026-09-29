import { db, type EntityName, type OutboxEntry, type OutboxOp } from '@/core/db/schema'

const MAX_ATTEMPTS = 5

export interface EnqueueParams {
  entity: EntityName
  entityId: string
  businessId: string
  op: OutboxOp
  payload?: Record<string, unknown>
}

/**
 * Enqueue a write. Dedupes against any existing pending entry for the same doc.
 * Returns the outbox entry id (or undefined if the write was cancelled).
 */
export async function enqueue(params: EnqueueParams): Promise<number | undefined> {
  const { entity, entityId, businessId, op, payload } = params
  const key = `${entity}:${entityId}`

  return db.transaction('rw', db.outbox, async () => {
    const existing = await db.outbox.where('key').equals(key).first()

    if (existing?.id) {
      // ----- Merge into existing entry -----

      // Case: pending upsert was never sent, and now a delete arrives.
      // Nothing has hit the server → cancel both.
      if (
        op === 'delete' &&
        existing.op === 'upsert' &&
        existing.attempts === 0
      ) {
        await db.outbox.delete(existing.id)
        return undefined
      }

      // Case: delete replaces any pending upsert (and vice versa).
      await db.outbox.update(existing.id, {
        op,
        payload: op === 'delete' ? undefined : payload,
        attempts: 0,
        status: 'pending',
        lastError: undefined,
      })
      return existing.id
    }

    // ----- New entry -----
    return db.outbox.add({
      key,
      entity,
      entityId,
      businessId,
      op,
      payload,
      createdAt: Date.now(),
      attempts: 0,
      status: 'pending',
    })
  })
}

/**
 * Get the next FIFO batch of work. Excludes entries that have
 * exhausted their retry budget.
 */
export async function nextBatch(limit = 10): Promise<OutboxEntry[]> {
  const rows = await db.outbox
    .where('status')
    .equals('pending')
    .filter((e) => e.attempts < MAX_ATTEMPTS)
    .sortBy('createdAt')
  return rows.slice(0, limit)
}

/** Success → remove from queue. */
export async function markDone(id: number): Promise<void> {
  await db.outbox.delete(id)
}

/** Failure → increment attempts. Moves to 'failed' once budget is gone. */
export async function markFailed(id: number, error: string): Promise<void> {
  const entry = await db.outbox.get(id)
  if (!entry) return
  const attempts = entry.attempts + 1
  await db.outbox.update(id, {
    attempts,
    status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
    lastError: error,
  })
}

/** Count of pending + failed — feed this to a sync badge in the header. */
export async function pendingCount(): Promise<number> {
  return db.outbox.where('status').anyOf('pending', 'failed').count()
}

/** Reset all failed entries to pending. Wire to a "Retry sync" button. */
export async function retryFailed(): Promise<void> {
  const failed = await db.outbox.where('status').equals('failed').toArray()
  if (failed.length === 0) return
  await db.outbox.bulkUpdate(
    failed.map((e) => ({
      key: e.id!,
      changes: { status: 'pending', attempts: 0, lastError: undefined },
    }))
  )
}

/** Hard reset — use only for logout / account switch. */
export async function clearOutbox(): Promise<void> {
  await db.outbox.clear()
}
