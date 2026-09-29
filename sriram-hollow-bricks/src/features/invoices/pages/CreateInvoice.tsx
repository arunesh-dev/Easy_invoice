import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCustomers } from '@/features/customers/hooks'
import { useProducts } from '@/features/products/hooks'
import { computeTotals, lineTotal } from '../math'
import { useInvoiceMutations } from '../hooks'
import { formatINR } from '@/core/money'
import type { LineItemInput } from '../schemas'

export default function CreateInvoice() {
  const nav = useNavigate()
  const { customers } = useCustomers()
  const { products } = useProducts()
  const { create } = useInvoiceMutations()

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState<LineItemInput[]>([])
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const customer = customers.find((c) => c.id === customerId)

  const totals = useMemo(
    () => computeTotals({ lines: lines.map((l) => ({ qty: l.qty, price: l.price })), discount }),
    [lines, discount]
  )

  function addProduct(productId: string) {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    // If already added, bump qty by 1 instead of a new line.
    const existing = lines.findIndex((l) => l.productId === p.id)
    if (existing >= 0) {
      const next = [...lines]
      next[existing] = { ...next[existing], qty: next[existing].qty + 1 }
      next[existing].total = lineTotal(next[existing].qty, next[existing].price)
      setLines(next)
    } else {
      setLines([
        ...lines,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          qty: 1,
          price: p.price,
          total: lineTotal(1, p.price),
        },
      ])
    }
    setPickerOpen(false)
  }

  function updateLine(idx: number, patch: Partial<LineItemInput>) {
    const next = [...lines]
    next[idx] = { ...next[idx], ...patch }
    next[idx].total = lineTotal(next[idx].qty, next[idx].price)
    setLines(next)
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx))
  }

  async function onSave() {
    if (!customer) return toast.error('Select a customer')
    if (lines.length === 0) return toast.error('Add at least one item')
    setSaving(true)
    try {
      const inv = await create({
        customerId: customer.id,
        customerName: customer.name,
        lineItems: lines,
        discount,
        notes,
      })
      toast.success(`Invoice ${inv.invoiceNumber} created`)
      nav(`/invoices/${inv.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">New invoice</h1>
      </div>

      {/* Customer */}
      <div className="space-y-1.5">
        <Label>Customer *</Label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="flex h-10 w-full rounded-xl border bg-background px-3 text-base"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Lines */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </div>

        {lines.length === 0 && (
          <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No items yet — tap Add item.
          </div>
        )}

        <ul className="space-y-2">
          {lines.map((l, i) => (
            <li key={l.productId} className="rounded-2xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.unit}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeLine(i)} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number" inputMode="decimal" min={0} step="0.01"
                    value={l.qty}
                    onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <Input
                    type="number" inputMode="decimal" min={0} step="0.01"
                    value={l.price}
                    onChange={(e) => updateLine(i, { price: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <div className="flex h-10 items-center justify-end text-sm font-medium">
                    {formatINR(l.total)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Discount */}
      <div className="mt-6 space-y-1.5">
        <Label htmlFor="discount">Discount (₹)</Label>
        <Input
          id="discount" type="number" inputMode="decimal" min={0} step="0.01"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value) || 0)}
        />
      </div>

      {/* Notes */}
      <div className="mt-6 space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes" rows={2} value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex w-full rounded-xl border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {/* Totals + Save (sticky) */}
      <div className="safe-bottom sticky bottom-16 mt-6 rounded-2xl border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatINR(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span>−{formatINR(totals.discount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatINR(totals.total)}</span>
        </div>
        <Button className="mt-3 w-full" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create invoice'}
        </Button>
      </div>

      {/* Product picker sheet */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPickerOpen(false)}>
          <div
            className="safe-bottom w-full rounded-t-3xl bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Pick a product</div>
              <Button variant="ghost" size="icon" onClick={() => setPickerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => addProduct(p.id)}
                    className="flex w-full items-center justify-between rounded-xl border bg-card p-3 text-left hover:bg-muted/50"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.unit}</div>
                    </div>
                    <div className="text-sm">{formatINR(p.price)}</div>
                  </button>
                </li>
              ))}
              {products.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">
                  No products yet — add some in Products.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
