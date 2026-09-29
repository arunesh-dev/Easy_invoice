import { useLiveQuery } from 'dexie-react-hooks'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/core/firebase/client'

import { useAuth } from '@/features/auth/useAuth'
import * as repo from './repository'
import type { BusinessInput } from './schemas'

export function useBusinessProfile(businessId: string | null | undefined) {
  const data = useLiveQuery(
    () => (businessId ? repo.getBusiness(businessId) : Promise.resolve(undefined)),
    [businessId]
  )
  return { business: data, loading: data === undefined && !!businessId }
}

export function useBusinessMutations() {
  const { user } = useAuth()
  return {
    create: async (input: BusinessInput) => {
      if (!user) throw new Error('Not signed in')
      const biz = await repo.createBusiness(user.uid, input)
      // Link the user → business. Firestore offline will queue this too.
      await setDoc(
        doc(firestore, 'users', user.uid),
        { businessId: biz.id, updatedAt: serverTimestamp() },
        { merge: true }
      )
      return biz
    },
    update: (businessId: string, input: BusinessInput) =>
      repo.updateBusiness(businessId, input),
  }
}
