import { Timestamp } from 'firebase/firestore'

/**
 * Recursively converts Firestore Timestamps to epoch ms, drops `_syncedAt`
 * metadata, and returns a plain object Dexie can store.
 */
export function normalizeFirestoreDoc<T extends Record<string, unknown>>(
  raw: T
): T {
  const { _syncedAt, ...rest } = raw as Record<string, unknown>
  return walk(rest) as T
}

function walk(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Timestamp) return value.toMillis()
  if (Array.isArray(value)) return value.map(walk)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v)
    }
    return out
  }
  return value
}
