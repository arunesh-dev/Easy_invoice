import { useLiveQuery } from 'dexie-react-hooks'

import { useBusiness } from '@/features/auth/useBusiness'
import * as repo from './repository'
import type { PaymentInput } from './schemas'

export function usePayment(id: string | undefined) {
  const data = useLiveQuery(
    () => (id ? repo.getPayment(id) : Promise.resolve(undefined)),
    [id]
  )
  return { payment: data, loading: data === undefined && !!id }
}

export function usePaymentMutations() {
  const { businessId } = useBusiness()
  return {
    create: (input: PaymentInput) => {
      if (!businessId) throw new Error('No business')
      return repo.createPayment(businessId, input)
    },
    cancel: (id: string, reason: string) => repo.cancelPayment(id, reason),
  }
}
