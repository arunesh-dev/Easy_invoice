import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { createInvoice } from '@/features/invoices/repository'
import { createPayment, cancelPayment } from './repository'

const BIZ = 'biz-1'

const baseInvoice = {
  customerId: 'cust-1',
  customerName: 'Ramesh',
  lineItems: [
    { productId: 'p1', name: 'Brick', unit: 'piece', qty: 100, price: 35.5, total: 0 },
  ],
  discount: 0,
  notes: '',
}

async function seedCustomer() {
  await db.customers.put({
    id: 'cust-1', businessId: BIZ, name: 'Ramesh', outstanding: 0,
    createdAt: Date.now(), updatedAt: Date.now(),
    _syncState: 'synced', _localUpdatedAt: Date.now(),
  })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedCustomer()
})

describe('createPayment', () => {
  it('records a partial payment and updates invoice + customer atomically', async () => {
    const inv = await createInvoice(BIZ, baseInvoice) // total 3550
    const payment = await createPayment(BIZ, {
      invoiceId: inv.id, amount: 1000, method: 'CASH', date: Date.now(), note: '',
    })

    expect(payment.id).toBeTruthy()
    expect(payment.isCancelled).toBe(false)

    const invoice = await db.invoices.get(inv.id)
    expect(invoice?.paidAmount).toBe(1000)
    expect(invoice?.balance).toBe(2550)
    expect(invoice?.status).toBe('PARTIAL')

    const customer = await db.customers.get('cust-1')
    expect(customer?.outstanding).toBe(2550)
  })

  it('marks the invoice PAID on full payment', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    await createPayment(BIZ, {
      invoiceId: inv.id, amount: 3550, method: 'UPI', date: Date.now(), note: '',
    })
    const invoice = await db.invoices.get(inv.id)
    expect(invoice?.status).toBe('PAID')
    expect(invoice?.balance).toBe(0)

    const customer = await db.customers.get('cust-1')
    expect(customer?.outstanding).toBe(0)
  })

  it('accepts multiple partial payments until fully paid', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    await createPayment(BIZ, { invoiceId: inv.id, amount: 1000, method: 'CASH', date: Date.now(), note: '' })
    await createPayment(BIZ, { invoiceId: inv.id, amount: 1000, method: 'CASH', date: Date.now(), note: '' })
    await createPayment(BIZ, { invoiceId: inv.id, amount: 1550, method: 'CASH', date: Date.now(), note: '' })

    const invoice = await db.invoices.get(inv.id)
    expect(invoice?.paidAmount).toBe(3550)
    expect(invoice?.status).toBe('PAID')
  })

  it('rejects overpayment at the repository level', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    await expect(createPayment(BIZ, {
      invoiceId: inv.id, amount: 3550.01, method: 'CASH', date: Date.now(), note: '',
    })).rejects.toThrow(/exceeds/i)
  })

  it('rejects a second payment that would overpay after a partial', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    await createPayment(BIZ, { invoiceId: inv.id, amount: 3000, method: 'CASH', date: Date.now(), note: '' })
    await expect(createPayment(BIZ, {
      invoiceId: inv.id, amount: 600, method: 'CASH', date: Date.now(), note: '',
    })).rejects.toThrow(/exceeds/i)
  })

  it('rejects amount <= 0', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    await expect(createPayment(BIZ, {
      invoiceId: inv.id, amount: 0, method: 'CASH', date: Date.now(), note: '',
    })).rejects.toThrow()
  })

  it('rejects a payment against a missing invoice', async () => {
    await expect(createPayment(BIZ, {
      invoiceId: 'nope', amount: 100, method: 'CASH', date: Date.now(), note: '',
    })).rejects.toThrow(/not found/i)
  })

  it('enqueues payment + invoice + customer in the same outbox', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    await db.outbox.clear()

    await createPayment(BIZ, {
      invoiceId: inv.id, amount: 500, method: 'CASH', date: Date.now(), note: '',
    })

    const entities = (await db.outbox.toArray()).map((e) => e.entity).sort()
    expect(entities).toEqual(['customers', 'invoices', 'payments'])
  })
})

describe('cancelPayment', () => {
  it('rolls back the invoice and customer outstanding', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    const p = await createPayment(BIZ, {
      invoiceId: inv.id, amount: 1000, method: 'CASH', date: Date.now(), note: '',
    })

    await cancelPayment(p.id, 'Wrong invoice')

    const invoice = await db.invoices.get(inv.id)
    expect(invoice?.paidAmount).toBe(0)
    expect(invoice?.balance).toBe(3550)
    expect(invoice?.status).toBe('UNPAID')

    const customer = await db.customers.get('cust-1')
    expect(customer?.outstanding).toBe(3550)

    const cancelled = await db.payments.get(p.id)
    expect(cancelled?.isCancelled).toBe(true)
    expect(cancelled?.cancelledReason).toBe('Wrong invoice')
  })

  it('is idempotent — cancelling twice is a no-op', async () => {
    const inv = await createInvoice(BIZ, baseInvoice)
    const p = await createPayment(BIZ, {
      invoiceId: inv.id, amount: 1000, method: 'CASH', date: Date.now(), note: '',
    })
    await cancelPayment(p.id, 'First')
    await cancelPayment(p.id, 'Second')

    const invoice = await db.invoices.get(inv.id)
    expect(invoice?.paidAmount).toBe(0)
  })

  it('recomputes correctly across multiple invoices for the same customer', async () => {
    const inv1 = await createInvoice(BIZ, baseInvoice)  // 3550
    const inv2 = await createInvoice(BIZ, baseInvoice)  // 3550

    const p1 = await createPayment(BIZ, { invoiceId: inv1.id, amount: 1000, method: 'CASH', date: Date.now(), note: '' })
    await createPayment(BIZ, { invoiceId: inv2.id, amount: 500,  method: 'CASH', date: Date.now(), note: '' })

    // Outstanding = 2550 (inv1) + 3050 (inv2) = 5600
    expect((await db.customers.get('cust-1'))?.outstanding).toBe(5600)

    await cancelPayment(p1.id, 'test')
    // Outstanding = 3550 (inv1) + 3050 (inv2) = 6600
    expect((await db.customers.get('cust-1'))?.outstanding).toBe(6600)
  })
})
