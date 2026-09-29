import { useLiveQuery } from 'dexie-react-hooks'

import { useBusiness } from '@/features/auth/useBusiness'
import * as repo from './repository'
import type { CustomerInput } from './schemas'

// ---------- Queries ----------

export function useCustomers() {
  const { businessId, loading: authLoading } = useBusiness()

  const data = useLiveQuery(
    () => (businessId ? repo.listCustomers(businessId) : Promise.resolve([])),
    [businessId]
  )

  return {
    customers: data ?? [],
    loading: authLoading || data === undefined,
  }
}

export function useCustomer(id: string | undefined) {
  const data = useLiveQuery(
    () => (id ? repo.getCustomer(id) : Promise.resolve(undefined)),
    [id]
  )
  return { customer: data, loading: data === undefined && !!id }
}

// ---------- Mutations ----------

export function useCustomerMutations() {
  const { businessId } = useBusiness()

  return {
    create: (input: CustomerInput) => {
      if (!businessId) throw new Error('No business')
      return repo.createCustomer(businessId, input)
    },
    update: (id: string, input: CustomerInput) => repo.updateCustomer(id, input),
    remove: (id: string) => repo.deleteCustomer(id),
  }
}
