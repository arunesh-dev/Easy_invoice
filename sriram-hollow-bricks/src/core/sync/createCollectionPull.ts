import { collection, collectionGroup, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore'
import { firestore } from '@/core/firebase/client'
import { db } from '@/core/db/schema'
import { normalizeFirestoreDoc } from '@/core/firebase/normalize'

type AnyTable = {
  get: (id: string) => Promise<{ _syncState?: string } | undefined>
  put: (row: any) => Promise<unknown>
  delete: (id: string) => Promise<unknown>
}

interface Options {
  businessId: string
  collectionName: string
  table: AnyTable
  /** If true, use collectionGroup instead of a nested collection */
  group?: boolean
  /** Called once per snapshot batch with the doc IDs that changed. */
  onBatch?: (ids: string[]) => Promise<void> | void
}

export function createCollectionPull({
  businessId,
  collectionName,
  table,
  group,
  onBatch,
}: Options): Unsubscribe {
  const col = group
    ? query(
        collectionGroup(firestore, collectionName),
        where('businessId', '==', businessId)
      )
    : collection(firestore, 'businesses', businessId, collectionName)

  return onSnapshot(
    col,
    async (snap) => {
      const touched: string[] = []

      await db.transaction('rw', table as any, db.outbox, async () => {
        for (const change of snap.docChanges()) {
          const id = change.doc.id

          if (change.type === 'removed') {
            await table.delete(id)
            continue
          }

          const local = await table.get(id)
          // Local pending writes win until they sync.
          if (local?._syncState === 'pending') continue

          const remote = normalizeFirestoreDoc({
            id,
            ...change.doc.data(),
          }) as any

          remote._syncState = 'synced'
          remote._localUpdatedAt = Date.now()

          await table.put(remote)
          touched.push(id)
        }
      })

      if (touched.length && onBatch) await onBatch(touched)
    },
    (err: any) => {
      if (err?.code === 'permission-denied') {
        console.warn(
          `[pull] ${collectionName}: permission denied. ` +
          `If this collection is not supposed to be pulled, remove it from startAllPulls.`
        )
      } else {
        console.warn(`[pull] ${collectionName} listener error:`, err)
      }
    }
  )
}
