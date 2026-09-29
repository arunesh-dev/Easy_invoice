import { useLiveQuery } from 'dexie-react-hooks'

import { useBusiness } from '@/features/auth/useBusiness'
import * as repo from './repository'
import type { ProductInput } from './schemas'

export function useProducts(opts: { includeInactive?: boolean } = {}) {
  const { businessId, loading: authLoading } = useBusiness()
  const data = useLiveQuery(
    () =>
      businessId
        ? repo.listProducts(businessId, opts)
        : Promise.resolve([]),
    [businessId, opts.includeInactive]
  )
  return { products: data ?? [], loading: authLoading || data === undefined }
}

export function useProduct(id: string | undefined) {
  const data = useLiveQuery(
    () => (id ? repo.getProduct(id) : Promise.resolve(undefined)),
    [id]
  )
  return { product: data, loading: data === undefined && !!id }
}

export function useProductMutations() {
  const { businessId } = useBusiness()

  return {
    create: (input: ProductInput) => {
      if (!businessId) throw new Error('No business')
      return repo.createProduct(businessId, input)
    },
    update: (id: string, input: ProductInput) => repo.updateProduct(id, input),
    setActive: (id: string, active: boolean) => repo.setProductActive(id, active),
    remove: (id: string) => repo.deleteProduct(id),
  }
}
