import { db } from '@/core/db/schema'

export interface BackupPayload {
  format: 'sriram-backup'
  version: 1
  exportedAt: number
  business: unknown[]
  customers: unknown[]
  products: unknown[]
  invoices: unknown[]
  payments: unknown[]
  expenses: unknown[]
  settings: unknown[]
}

export async function buildBackup(businessId: string): Promise<BackupPayload> {
  const [business, customers, products, invoices, payments, expenses, settings] =
    await Promise.all([
      db.businesses.where('id').equals(businessId).toArray(),
      db.customers.where('businessId').equals(businessId).toArray(),
      db.products.where('businessId').equals(businessId).toArray(),
      db.invoices.where('businessId').equals(businessId).toArray(),
      db.payments.where('businessId').equals(businessId).toArray(),
      db.expenses.where('businessId').equals(businessId).toArray(),
      db.settings.where('businessId').equals(businessId).toArray(),
    ])

  return {
    format: 'sriram-backup',
    version: 1,
    exportedAt: Date.now(),
    business,
    customers,
    products,
    invoices,
    payments,
    expenses,
    settings,
  }
}

export async function exportBackup(businessId: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const payload = await buildBackup(businessId)
  const json = JSON.stringify(payload, null, 2)
  const filename = `sriram-backup-${new Date().toISOString().slice(0, 10)}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const file = new File([blob], filename, { type: 'application/json' })

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sriram backup', text: filename })
      return 'shared'
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
