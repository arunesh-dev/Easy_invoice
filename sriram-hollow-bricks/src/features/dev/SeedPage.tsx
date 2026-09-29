import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { db } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { useBusiness } from '@/features/auth/useBusiness'
import { computeTotals, lineTotal } from '@/features/invoices/math'
import { recalcInvoiceTx, recalcCustomerOutstandingTx } from '@/features/invoices/repository'

const CUSTOMER_NAMES = [
  'Ramesh Kumar', 'Suresh Iyer', 'Anita Reddy', 'Vikram Singh', 'Priya Menon',
  'Karthik Nair', 'Deepa Rao', 'Arun Pillai', 'Meena Sharma', 'Ravi Varma',
]

export default function SeedPage() {
  const { businessId } = useBusiness()
  const [busy, setBusy] = useState(false)

  async function seed(n: number) {
    if (!businessId) return toast.error('No business')
    setBusy(true)
    try {
      const now = Date.now()
      const day = 24 * 60 * 60 * 1000

      // 30 customers
      const customers = Array.from({ length: 30 }, (_, i) => ({
        id: newId(),
        businessId,
        name: `${CUSTOMER_NAMES[i % CUSTOMER_NAMES.length]} ${Math.floor(i / 10) + 1}`,
        phone: `98765${String(40000 + i).slice(-5)}`,
        outstanding: 0,
        createdAt: now - i * day,
        updatedAt: now - i * day,
        _syncState: 'synced' as const,
        _localUpdatedAt: now,
      }))

      // 10 products
      const products = Array.from({ length: 10 }, (_, i) => ({
        id: newId(),
        businessId,
        name: `Brick ${String.fromCharCode(65 + i)}`,
        unit: i % 2 === 0 ? 'piece' : 'cft',
        price: 30 + i * 1.5,
        category: i % 3 === 0 ? 'Hollow' : 'Solid',
        isActive: true,
        createdAt: now,
        _syncState: 'synced' as const,
        _localUpdatedAt: now,
      }))

      await db.transaction('rw', db.customers, db.products, async () => {
        await db.customers.bulkPut(customers)
        await db.products.bulkPut(products)
      })

      // n invoices spread over the last 180 days, with some payments
      for (let i = 0; i < n; i++) {
        const customer = customers[i % customers.length]
        const issuedAt = now - Math.floor(Math.random() * 180) * day
        const lineCount = 1 + Math.floor(Math.random() * 4)
        const lineItems = Array.from({ length: lineCount }, () => {
          const p = products[Math.floor(Math.random() * products.length)]
          const qty = 1 + Math.floor(Math.random() * 500)
          return {
            productId: p.id, name: p.name, unit: p.unit,
            qty, price: p.price, total: lineTotal(qty, p.price),
          }
        })
        const totals = computeTotals({ lines: lineItems, discount: 0 })

        const invoiceId = newId()
        await db.transaction(
          'rw',
          db.invoices, db.payments, db.customers, db.outbox,
          async () => {
            await db.invoices.put({
              id: invoiceId, businessId,
              customerId: customer.id, customerName: customer.name,
              invoiceNumber: `SEED-${String(i + 1).padStart(5, '0')}`,
              lineItems, subtotal: totals.subtotal, discount: 0, total: totals.total,
              paidAmount: 0, balance: totals.total, status: 'UNPAID',
              issuedAt,
              _syncState: 'synced', _localUpdatedAt: now,
            })

            // 70% get some payment
            if (Math.random() < 0.7) {
              const payFraction = Math.random() < 0.6 ? 1 : Math.random()
              await db.payments.put({
                id: newId(), businessId, invoiceId,
                amount: Math.round(totals.total * payFraction * 100) / 100,
                method: (['CASH', 'UPI', 'BANK', 'CHEQUE'] as const)[Math.floor(Math.random() * 4)],
                date: issuedAt + Math.floor(Math.random() * 7) * day,
                isCancelled: false,
                _syncState: 'synced', _localUpdatedAt: now,
              })
            }

            await recalcInvoiceTx(invoiceId)
          }
        )
      }

      // 200 expenses
      for (let i = 0; i < 200; i++) {
        await db.expenses.put({
          id: newId(), businessId,
          category: ['Fuel', 'Raw materials', 'Labour', 'Repairs', 'Misc'][i % 5],
          amount: 100 + Math.random() * 5000,
          method: 'CASH',
          date: now - Math.floor(Math.random() * 180) * day,
          _syncState: 'synced', _localUpdatedAt: now,
        })
      }

      // Roll up customer.outstanding once at the end
      await db.transaction('rw', db.invoices, db.customers, db.outbox, async () => {
        for (const c of customers) await recalcCustomerOutstandingTx(c.id)
      })

      toast.success(`Seeded ${n} invoices, 30 customers, 10 products, 200 expenses`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setBusy(false)
    }
  }

  async function wipe() {
    if (!confirm('Wipe all local data?')) return
    await db.delete()
    location.reload()
  }

  return (
    <div className="safe-top px-4 py-10">
      <h1 className="text-2xl font-semibold">Dev seed</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Local only. Not in production builds.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {[100, 500, 1000, 5000].map((n) => (
          <Button key={n} disabled={busy} onClick={() => seed(n)}>
            Seed {n} invoices
          </Button>
        ))}
        <Button variant="destructive" onClick={wipe}>Wipe all</Button>
      </div>
    </div>
  )
}
