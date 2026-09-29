import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { createInvoice, updateInvoice, deleteInvoice, recalcInvoiceFromPayments } from './repository'

const BIZ = 'biz-1'

const validInput = {
  customerId: 'cust-1',
  customerName: 'Ramesh',
  lineItems: [
    { productId: 'p1', name: 'Brick A', unit: 'piece', qty: 100, price: 35.5, total: 0 },
  ],
  discount: 0,
  notes: '',
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('createInvoice', () => {
  it('mints a number and computes totals from input', async () => {
    const inv = await createInvoice(BIZ, validInput)
    expect(inv.invoiceNumber).toBe('SRM-0001')
    expect(inv.subtotal).toBe(3550)
    expect(inv.total).toBe(3550)
    expect(inv.status).toBe('UNPAID')
    expect(inv.lineItems[0].total).toBe(3550)
  })

  it('ignores client-supplied line totals and recomputes', async () => {
    const inv = await createInvoice(BIZ, {
      ...validInput,
      lineItems: [{ ...validInput.lineItems[0], total: 999999 }],
    })
    expect(inv.lineItems[0].total).toBe(3550)
    expect(inv.total).toBe(3550)
  })

  it('enqueues a sync upsert', async () => {
    const inv = await createInvoice(BIZ, validInput)
    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0].entity).toBe('invoices')
    expect(outbox[0].entityId).toBe(inv.id)
  })

  it('rejects an invoice with no lines', async () => {
    await expect(createInvoice(BIZ, { ...validInput, lineItems: [] })).rejects.toThrow()
  })
})

describe('updateInvoice', () => {
  it('blocks edit once a payment exists', async () => {
    const inv = await createInvoice(BIZ, validInput)
    await db.payments.put({
      id: 'pay-1', businessId: BIZ, invoiceId: inv.id, amount: 100,
      method: 'CASH', date: Date.now(), isCancelled: false,
      _syncState: 'pending', _localUpdatedAt: Date.now(),
    })
    await expect(updateInvoice(inv.id, validInput)).rejects.toThrow(/payments/)
  })
})

describe('deleteInvoice', () => {
  it('blocks delete once a payment exists', async () => {
    const inv = await createInvoice(BIZ, validInput)
    await db.payments.put({
      id: 'pay-1', businessId: BIZ, invoiceId: inv.id, amount: 100,
      method: 'CASH', date: Date.now(), isCancelled: false,
      _syncState: 'pending', _localUpdatedAt: Date.now(),
    })
    await expect(deleteInvoice(inv.id)).rejects.toThrow(/payments/)
  })

  it('deletes clean invoices', async () => {
    const inv = await createInvoice(BIZ, validInput)
    await deleteInvoice(inv.id)
    expect(await db.invoices.get(inv.id)).toBeUndefined()
  })
})

describe('recalcInvoiceFromPayments', () => {
  it('sets PARTIAL when underpaid', async () => {
    const inv = await createInvoice(BIZ, validInput) // total 3550
    await db.payments.put({
      id: 'p1', businessId: BIZ, invoiceId: inv.id, amount: 1000,
      method: 'CASH', date: Date.now(), isCancelled: false,
      _syncState: 'pending', _localUpdatedAt: Date.now(),
    })
    const updated = await recalcInvoiceFromPayments(inv.id)
    expect(updated?.status).toBe('PARTIAL')
    expect(updated?.paidAmount).toBe(1000)
    expect(updated?.balance).toBe(2550)
  })

  it('sets PAID when fully paid', async () => {
    const inv = await createInvoice(BIZ, validInput) // total 3550
    await db.payments.put({
      id: 'p1', businessId: BIZ, invoiceId: inv.id, amount: 3550,
      method: 'CASH', date: Date.now(), isCancelled: false,
      _syncState: 'pending', _localUpdatedAt: Date.now(),
    })
    const updated = await recalcInvoiceFromPayments(inv.id)
    expect(updated?.status).toBe('PAID')
    expect(updated?.balance).toBe(0)
  })

  it('ignores cancelled payments', async () => {
    const inv = await createInvoice(BIZ, validInput)
    await db.payments.put({
      id: 'p1', businessId: BIZ, invoiceId: inv.id, amount: 3550,
      method: 'CASH', date: Date.now(), isCancelled: true,
      _syncState: 'pending', _localUpdatedAt: Date.now(),
    })
    const updated = await recalcInvoiceFromPayments(inv.id)
    expect(updated?.status).toBe('UNPAID')
    expect(updated?.paidAmount).toBe(0)
  })
})
