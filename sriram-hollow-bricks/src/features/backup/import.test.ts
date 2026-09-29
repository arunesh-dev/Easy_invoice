import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { importBackup, ImportError } from './import'
import { buildBackup } from './export'

const BIZ = 'biz-1'

function makeBackup() {
  return {
    format: 'sriram-backup' as const,
    version: 1 as const,
    exportedAt: 1_700_000_000_000,
    business: [],
    customers: [
      {
        id: 'c1', businessId: BIZ, name: 'Ramesh', phone: '9876543210',
        outstanding: 0, createdAt: 100, updatedAt: 100,
      },
    ],
    products: [
      {
        id: 'p1', businessId: BIZ, name: 'Brick A', unit: 'piece',
        price: 35.5, isActive: true, createdAt: 100,
      },
    ],
    invoices: [
      {
        id: 'i1', businessId: BIZ, customerId: 'c1', customerName: 'Ramesh',
        invoiceNumber: 'SRM-0001', lineItems: [], subtotal: 100, discount: 0,
        total: 100, paidAmount: 50, balance: 50, status: 'PARTIAL' as const,
        issuedAt: 100,
      },
    ],
    payments: [
      {
        id: 'pay1', businessId: BIZ, invoiceId: 'i1', amount: 50,
        method: 'CASH' as const, date: 100, isCancelled: false,
      },
    ],
    expenses: [
      {
        id: 'e1', businessId: BIZ, category: 'Fuel', amount: 200,
        method: 'CASH' as const, date: 100,
      },
    ],
    settings: [
      { businessId: BIZ, invoicePrefix: 'SRM', lastInvoiceNumber: 1 },
    ],
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('importBackup', () => {
  it('imports a valid backup and enqueues every row', async () => {
    const counts = await importBackup(JSON.stringify(makeBackup()), {
      currentBusinessId: BIZ,
    })

    expect(counts).toMatchObject({
      customers: 1, products: 1, invoices: 1, payments: 1, expenses: 1, skipped: 0,
    })

    expect((await db.customers.get('c1'))?._syncState).toBe('pending')
    expect((await db.invoices.get('i1'))?.invoiceNumber).toBe('SRM-0001')
    expect((await db.settings.get(BIZ))?.lastInvoiceNumber).toBe(1)

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(5)
  })

  it('rejects invalid JSON', async () => {
    await expect(
      importBackup('not-json', { currentBusinessId: BIZ })
    ).rejects.toBeInstanceOf(ImportError)
  })

  it('rejects a payload that is not a sriram-backup', async () => {
    const payload = { ...makeBackup(), format: 'other-app' }
    await expect(
      importBackup(JSON.stringify(payload), { currentBusinessId: BIZ })
    ).rejects.toBeInstanceOf(ImportError)
  })

  it('rejects a backup from a different business', async () => {
    const payload = makeBackup()
    payload.customers[0].businessId = 'other-biz'
    await expect(
      importBackup(JSON.stringify(payload), { currentBusinessId: BIZ })
    ).rejects.toThrow(/different business/)
  })

  it('skips existing rows when overwrite=false', async () => {
    await importBackup(JSON.stringify(makeBackup()), { currentBusinessId: BIZ })
    await db.outbox.clear()

    const payload = makeBackup()
    payload.customers[0].name = 'Ramesh Updated'

    const counts = await importBackup(JSON.stringify(payload), {
      currentBusinessId: BIZ,
      overwrite: false,
    })

    expect(counts.skipped).toBeGreaterThan(0)
    expect((await db.customers.get('c1'))?.name).toBe('Ramesh')
  })

  it('overwrites existing rows when overwrite=true (default)', async () => {
    await importBackup(JSON.stringify(makeBackup()), { currentBusinessId: BIZ })

    const payload = makeBackup()
    payload.customers[0].name = 'Ramesh Updated'

    await importBackup(JSON.stringify(payload), { currentBusinessId: BIZ })
    expect((await db.customers.get('c1'))?.name).toBe('Ramesh Updated')
  })

  it('never lowers the invoice counter', async () => {
    await db.settings.put({ businessId: BIZ, invoicePrefix: 'SRM', lastInvoiceNumber: 500 })
    await importBackup(JSON.stringify(makeBackup()), { currentBusinessId: BIZ })
    expect((await db.settings.get(BIZ))?.lastInvoiceNumber).toBe(500)
  })

  it('round-trips through buildBackup', async () => {
    await importBackup(JSON.stringify(makeBackup()), { currentBusinessId: BIZ })

    const dump = await buildBackup(BIZ)
    expect(dump.customers).toHaveLength(1)
    expect(dump.invoices).toHaveLength(1)
  })
})
