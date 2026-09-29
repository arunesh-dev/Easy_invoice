import {
  collection, getDocs, deleteDoc, doc, writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { deleteUser, type User } from 'firebase/auth'
import { firestore } from '@/core/firebase/client'
import { db } from '@/core/db/schema'

export class DeleteAccountError extends Error {
  constructor(
    message: string,
    public code: string,
    public step: 'data' | 'auth' | 'local'
  ) { super(message) }
}

const COLLECTIONS = [
  'customers',
  'products',
  'invoices',
  'expenses',
  // Payments are a subcollection of invoices and handled separately.
] as const

/** Batch-delete every document matching a query, 400 at a time. */
async function deleteQueryBatched(
  fs: Firestore,
  path: string
): Promise<number> {
  const snap = await getDocs(collection(fs, path))
  let deleted = 0

  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(fs)
    const chunk = snap.docs.slice(i, i + 400)
    for (const d of chunk) batch.delete(d.ref)
    await batch.commit()
    deleted += chunk.length
  }
  return deleted
}

/** Delete every payment inside every invoice, then the invoices themselves. */
async function deleteInvoicesDeep(fs: Firestore, businessId: string): Promise<number> {
  const invCol = collection(fs, 'businesses', businessId, 'invoices')
  const invs = await getDocs(invCol)
  let count = 0

  for (const inv of invs.docs) {
    const paySnap = await getDocs(collection(inv.ref, 'payments'))
    for (let i = 0; i < paySnap.docs.length; i += 400) {
      const batch = writeBatch(fs)
      const chunk = paySnap.docs.slice(i, i + 400)
      for (const p of chunk) batch.delete(p.ref)
      await batch.commit()
    }
    await deleteDoc(inv.ref)
    count++
  }
  return count
}

export interface DeleteProgress {
  step: 'data' | 'auth' | 'local'
  detail: string
}

export async function deleteAccount(
  user: User,
  businessId: string,
  onProgress: (p: DeleteProgress) => void
): Promise<void> {
  // ---- 1. Delete Firestore data (user is still authed, rules allow it) ----
  onProgress({ step: 'data', detail: 'Deleting invoices and payments…' })
  try {
    await deleteInvoicesDeep(firestore, businessId)

    for (const col of COLLECTIONS) {
      onProgress({ step: 'data', detail: `Deleting ${col}…` })
      await deleteQueryBatched(
        firestore,
        `businesses/${businessId}/${col}`
      )
    }

    onProgress({ step: 'data', detail: 'Deleting business profile…' })
    await deleteDoc(doc(firestore, 'businesses', businessId))

    onProgress({ step: 'data', detail: 'Deleting user record…' })
    await deleteDoc(doc(firestore, 'users', user.uid))
  } catch (err: any) {
    throw new DeleteAccountError(
      `Failed to delete cloud data: ${err.message}`,
      err.code ?? 'FIRESTORE_ERROR',
      'data'
    )
  }

  // ---- 2. Delete the auth user ----
  onProgress({ step: 'auth', detail: 'Deleting your account…' })
  try {
    await deleteUser(user)
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      throw new DeleteAccountError(
        'Please re-enter your password to confirm deletion.',
        'REQUIRES_REAUTH',
        'auth'
      )
    }
    throw new DeleteAccountError(
      `Failed to delete account: ${err.message}`,
      err.code ?? 'AUTH_ERROR',
      'auth'
    )
  }

  // ---- 3. Wipe local Dexie ----
  onProgress({ step: 'local', detail: 'Clearing local data…' })
  try {
    await db.delete()
  } catch (err: any) {
    // Not fatal — auth user is gone. Just log.
    console.warn('[delete-account] Local wipe failed:', err)
  }
}
