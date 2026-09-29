import { useLiveQuery } from 'dexie-react-hooks'

import { useBusiness } from '@/features/auth/useBusiness'
import * as repo from './repository'
import type { ExpenseInput } from './schemas'

export function useExpenses() {
  const { businessId, loading } = useBusiness()
  const data = useLiveQuery(
    () => (businessId ? repo.listExpenses(businessId) : Promise.resolve([])),
    [businessId]
  )
  return { expenses: data ?? [], loading: loading || data === undefined }
}

export function useExpense(id: string | undefined) {
  const data = useLiveQuery(
    () => (id ? repo.getExpense(id) : Promise.resolve(undefined)),
    [id]
  )
  return { expense: data, loading: data === undefined && !!id }
}

export function useExpenseMutations() {
  const { businessId } = useBusiness()
  return {
    create: (input: ExpenseInput) => {
      if (!businessId) throw new Error('No business')
      return repo.createExpense(businessId, input)
    },
    update: (id: string, input: ExpenseInput) => repo.updateExpense(id, input),
    remove: (id: string) => repo.deleteExpense(id),
  }
}
