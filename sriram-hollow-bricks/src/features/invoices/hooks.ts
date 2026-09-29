import { useLiveQuery } from 'dexie-react-hooks'
import { type InvoiceStatus } from '@/core/db/schema'
import { useBusiness } from '@/features/auth/useBusiness'
import * as repo from './repository'
import type { InvoiceInput } from './schemas'

export function useInvoices(filter: { status?: InvoiceStatus; customerId?: string } = {}) {
  const { businessId, loading } = useBusiness()
  const data = useLiveQuery(
    () => (businessId ? repo.listInvoices(businessId, filter) : Promise.resolve([])),
    [businessId, filter.status, filter.customerId]
  )
  return { invoices: data ?? [], loading: loading || data === undefined }
}

export function useInvoice(id: string | undefined) {
  const data = useLiveQuery(
    () => (id ? repo.getInvoice(id) : Promise.resolve(undefined)),
    [id]
  )
  return { invoice: data, loading: data === undefined && !!id }
}

export function useInvoicePayments(invoiceId: string | undefined) {
  const data = useLiveQuery(
    () => (invoiceId ? repo.listPayments(invoiceId) : Promise.resolve([])),
    [invoiceId]
  )
  return { payments: data ?? [], loading: data === undefined && !!invoiceId }
}

export function useInvoiceMutations() {
  const { businessId } = useBusiness()
  return {
    create: (input: InvoiceInput) => {
      if (!businessId) throw new Error('No business')
      return repo.createInvoice(businessId, input)
    },
    update: (id: string, input: InvoiceInput) => repo.updateInvoice(id, input),
    remove: (id: string) => repo.deleteInvoice(id),
  }
}
