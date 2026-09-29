import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db, type OutboxEntry } from '@/core/db/schema'
import { firestore, auth } from '@/core/firebase/client' // rename your `db` export to `firestore`
import { nextBatch, markDone, markFailed } from './outbox'

let running = false
let intervalId: number | undefined

/** Firestore path for a given outbox entry. */
function pathFor(entry: OutboxEntry): string {
  const { entity, businessId, entityId } = entry
  if (entity === 'businesses') return `businesses/${businessId}`
  return `businesses/${businessId}/${entity}/${entityId}`
}

function toFirestore(entry: OutboxEntry): Record<string, unknown> {
  const { payload } = entry
  if (!payload) return {}

  const {
    _syncState: _s,
    _localUpdatedAt: _l,
    _lastError: _e,
    businessId: _b,
    id: _i,
    ...rest
  } = payload

  const clean = stripUndefined(rest) as Record<string, unknown>

  // Every document carries ownerUid so rules can authorize without get().
  const uid = auth.currentUser?.uid
  if (uid) clean.ownerUid = uid

  return clean
}

/**
 * Recursively remove undefined values. Preserves null (which Firestore 
 * accepts and stores as an explicit null).
 */
function stripUndefined(value: unknown): unknown {
  if (value === undefined) return undefined // caller drops key
  if (value === null) return null
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((v) => v !== undefined)
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripUndefined(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return out
  }
  return value
}

async function processOne(entry: OutboxEntry): Promise<void> {
  const ref = doc(firestore, pathFor(entry))

  try {
    if (entry.op === 'delete') {
      await deleteDoc(ref)
    } else {
      await setDoc(
        ref,
        { ...toFirestore(entry), _syncedAt: serverTimestamp() },
        { merge: true }
      )
    }
    await markDone(entry.id!)
    await markSynced(entry)
  } catch (err) {
    const e = err as { code?: string; message?: string }
    const msg = e?.code ? `${e.code}: ${e.message ?? ''}` : String(err)
    await markFailed(entry.id!, msg)
    await markLocalError(entry, msg)
  }
}

/** Flip `_syncState` on the local doc after a successful write. */
async function markSynced(entry: OutboxEntry): Promise<void> {
  const table = (db as any)[entry.entity]
  if (!table) return
  await table.update(entry.entityId, { _syncState: 'synced', _lastError: undefined })
}

async function markLocalError(entry: OutboxEntry, msg: string): Promise<void> {
  const table = (db as any)[entry.entity]
  if (!table) return
  await table.update(entry.entityId, { _syncState: 'error', _lastError: msg })
}

/** Process one FIFO batch. Safe to call repeatedly. */
export async function flushOutbox(): Promise<void> {
  if (running) return
  if (!navigator.onLine) return
  running = true

  try {
    let batch = await nextBatch(20)
    while (batch.length > 0) {
      for (const entry of batch) {
        await processOne(entry)
      }
      batch = await nextBatch(20)
    }
  } finally {
    running = false
  }
}

/** Start the worker: on startup, on 'online', and every 30s. */
export function startSync(): () => void {
  if (intervalId !== undefined) return () => {}
  flushOutbox()
  intervalId = window.setInterval(flushOutbox, 30_000)
  const onOnline = () => flushOutbox()
  window.addEventListener('online', onOnline)

  return () => {
    if (intervalId !== undefined) window.clearInterval(intervalId)
    intervalId = undefined
    window.removeEventListener('online', onOnline)
  }
}
