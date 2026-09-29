import { describe, expect, it } from 'vitest'
import { amountForPdf, buildInvoicePdf } from './invoice-pdf'
import type { DbBusiness, DbCustomer, DbInvoice } from '@/core/db/schema'

const business: DbBusiness = {
  id: 'b1', ownerUid: 'u1', name: 'Sriram Hollow Bricks',
  phone: '9876543210', address: '12 Brick Lane, Chennai', gstin: '33ABCDE1234F1Z5',
  createdAt: 0, _syncState: 'synced', _localUpdatedAt: 0,
}

const customer: Pick<DbCustomer, 'name' | 'phone' | 'address'> = {
  name: 'Ramesh Kumar', phone: '9876543210', address: '11 Site Road',
}

const invoice: DbInvoice = {
  id: 'i1', businessId: 'b1', customerId: 'c1', customerName: 'Ramesh Kumar',
  invoiceNumber: 'SRM-0042',
  lineItems: [
    { productId: 'p1', name: 'Brick A', unit: 'piece', qty: 100, price: 35.5, total: 3550 },
    { productId: 'p2', name: 'Brick B', unit: 'piece', qty: 50,  price: 42,   total: 2100 },
  ],
  subtotal: 5650, discount: 500, total: 5150,
  paidAmount: 2000, balance: 3150, status: 'PARTIAL',
  issuedAt: Date.now(),
  notes: 'Delivered on site.',
  _syncState: 'synced', _localUpdatedAt: 0,
}

describe('amountForPdf', () => {
  it('uses Indian grouping with Rs. prefix', () => {
    expect(amountForPdf(17750)).toBe('Rs. 17,750')
    expect(amountForPdf(1234567)).toBe('Rs. 12,34,567')
  })
  it('shows paise when present', () => {
    expect(amountForPdf(35.5)).toBe('Rs. 35.50')
    expect(amountForPdf(35.55)).toBe('Rs. 35.55')
  })
})

describe('buildInvoicePdf', () => {
  it('produces a PDF blob', () => {
    const blob = buildInvoicePdf({ business, customer, invoice })
    expect(blob.size).toBeGreaterThan(1000) // non-trivial
    expect(blob.type).toBe('application/pdf')
  })

  it('produces valid PDF magic bytes', async () => {
    const blob = buildInvoicePdf({ business, customer, invoice })
    const buf = await blob.arrayBuffer()
    const header = new TextDecoder().decode(new Uint8Array(buf.slice(0, 5)))
    expect(header).toBe('%PDF-')
  })

  it('handles an invoice with no discount and no notes', () => {
    const minimal: DbInvoice = { ...invoice, discount: 0, notes: undefined }
    const blob = buildInvoicePdf({ business, customer, invoice: minimal })
    expect(blob.size).toBeGreaterThan(500)
  })

  it('handles a business with no GSTIN or address', () => {
    const sparse: DbBusiness = { ...business, gstin: undefined, address: undefined, phone: undefined }
    const blob = buildInvoicePdf({ business: sparse, customer, invoice })
    expect(blob.size).toBeGreaterThan(500)
  })

  it('handles a very long customer address without overflow', () => {
    const longAddr = Array.from({ length: 20 }, () => 'Long line of address').join('\n')
    const blob = buildInvoicePdf({
      business, customer: { ...customer, address: longAddr }, invoice,
    })
    expect(blob.size).toBeGreaterThan(1000)
  })
})
