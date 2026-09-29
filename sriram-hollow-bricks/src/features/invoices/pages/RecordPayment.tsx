import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInvoice } from '../hooks'
import { usePaymentMutations } from '@/features/payments/hooks'
import { canAcceptPayment, maxPayment } from '../math'
import { formatINR } from '@/core/money'
import { PAYMENT_METHODS } from '@/features/payments/schemas'

type Method = (typeof PAYMENT_METHODS)[number]

export default function RecordPayment() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { invoice, loading } = useInvoice(id)
  const { create } = usePaymentMutations()

  const [amount, setAmount] = useState<number | null>(null)
  const [method, setMethod] = useState<Method>('CASH')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize amount from invoice balance.
  useEffect(() => {
    if (invoice && amount === null) setAmount(invoice.balance)
  }, [invoice, amount])

  if (loading || !invoice) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  const currentAmount = amount ?? invoice.balance
  const max = maxPayment(invoice.total, invoice.paidAmount)
  const valid = canAcceptPayment(invoice.total, invoice.paidAmount, currentAmount)

  async function onSave() {
    if (!valid) return
    setSaving(true)
    try {
      await create({
        invoiceId: invoice!.id,
        amount: currentAmount,
        method,
        date: new Date(date).getTime(),
        note,
      })
      toast.success(`${formatINR(currentAmount)} recorded`)
      nav(`/invoices/${invoice!.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
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
        <h1 className="text-xl font-semibold">Record payment</h1>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="text-xs text-muted-foreground">Invoice</div>
        <div className="mt-0.5 font-medium">{invoice.invoiceNumber}</div>
        <div className="text-sm text-muted-foreground">{invoice.customerName}</div>
        <div className="mt-3 flex justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Remaining balance</span>
          <span className="font-medium text-warning">{formatINR(invoice.balance)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="amount">Amount (₹) *</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step="0.01"
          value={amount ?? ''}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={currentAmount > max ? 'text-destructive' : 'text-muted-foreground'}>
            Max {formatINR(max)}
          </span>
          <button
            type="button"
            className="text-primary underline"
            onClick={() => setAmount(max)}
          >
            Pay full amount
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label>Method</Label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                method === m
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <Button
        className="mt-8 w-full"
        onClick={onSave}
        disabled={saving || !valid}
      >
        <Wallet className="mr-2 h-4 w-4" />
        {saving ? 'Saving…' : `Record ${formatINR(currentAmount || 0)}`}
      </Button>
    </div>
  )
}
