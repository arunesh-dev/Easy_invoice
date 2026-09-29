import { doc, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/core/firebase/client'
import { db } from '@/core/db/schema'
import { normalizeFirestoreDoc } from '@/core/firebase/normalize'

export function startBusinessPull(businessId: string): () => void {
  return onSnapshot(
    doc(firestore, 'businesses', businessId),
    async (snap) => {
      if (!snap.exists()) return

      const local = await db.businesses.get(businessId)
      if (local?._syncState === 'pending') return

      const remote = normalizeFirestoreDoc({
        id: businessId,
        ...snap.data(),
      }) as any

      remote._syncState = 'synced'
      remote._localUpdatedAt = Date.now()

      await db.businesses.put(remote)
    },
    (err) => console.warn('[pull] business listener error:', err)
  )
}
