import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { createCustomer, updateCustomer, deleteCustomer } from './repository'

const BIZ = 'biz-1'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('createCustomer', () => {
  it('writes to Dexie and enqueues an upsert', async () => {
    const c = await createCustomer(BIZ, { name: 'Ramesh' })

    expect(c._syncState).toBe('pending')
    expect(await db.customers.get(c.id)).toBeTruthy()

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0].op).toBe('upsert')
    expect(outbox[0].entity).toBe('customers')
    expect(outbox[0].entityId).toBe(c.id)
  })

  it('rejects an empty name', async () => {
    await expect(createCustomer(BIZ, { name: '' })).rejects.toThrow()
  })

  it('normalizes blank phone to undefined', async () => {
    const c = await createCustomer(BIZ, { name: 'Ramesh', phone: '' })
    expect(c.phone).toBeUndefined()
  })
})

describe('updateCustomer', () => {
  it('collapses multiple edits into a single outbox entry', async () => {
    const c = await createCustomer(BIZ, { name: 'Ramesh' })
    await updateCustomer(c.id, { name: 'Ramesh Kumar' })
    await updateCustomer(c.id, { name: 'Ramesh Kumar', phone: '9876543210' })

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect((outbox[0].payload as any).name).toBe('Ramesh Kumar')
  })
})

describe('deleteCustomer', () => {
  it('drops both pending upsert and delete when never synced', async () => {
    const c = await createCustomer(BIZ, { name: 'Ramesh' })
    await deleteCustomer(c.id)

    expect(await db.customers.get(c.id)).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
  })

  it('refuses delete when the customer has invoices', async () => {
    const c = await createCustomer(BIZ, { name: 'Ramesh' })
    await db.invoices.put({
      id: 'inv-1', businessId: BIZ, customerId: c.id, customerName: c.name,
      invoiceNumber: 'SRM-001', lineItems: [], subtotal: 0, discount: 0,
      total: 0, paidAmount: 0, balance: 0, status: 'UNPAID',
      issuedAt: Date.now(), _syncState: 'pending', _localUpdatedAt: Date.now(),
    })

    await expect(deleteCustomer(c.id)).rejects.toThrow(/invoice/)
  })
})
