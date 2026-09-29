import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Share2, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { useInvoice, useInvoiceMutations, useInvoicePayments } from '../hooks'
import { formatINR } from '@/core/money'
import type { InvoiceStatus, DbPayment } from '@/core/db/schema'
import { CancelPaymentDialog } from '../components/CancelPaymentDialog'
import { useBusiness } from '@/features/auth/useBusiness'
import { useBusinessProfile } from '@/features/business/hooks'
import { useCustomer } from '@/features/customers/hooks'
import { shareInvoicePdf } from '@/core/pdf/share'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { invoice, loading } = useInvoice(id)
  const { payments } = useInvoicePayments(id)
  const { remove } = useInvoiceMutations()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<DbPayment | null>(null)
  
  const { businessId } = useBusiness()
  const { business } = useBusinessProfile(businessId)
  const { customer } = useCustomer(invoice?.customerId)
  const [sharing, setSharing] = useState(false)

  if (loading || !invoice) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  async function onDelete() {
    try {
      await remove(invoice!.id)
      toast.success('Invoice deleted')
      nav('/invoices', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setConfirmOpen(false)
    }
  }

  async function onShare() {
    if (!invoice || !business) return
    setSharing(true)
    try {
      const result = await shareInvoicePdf({
        business,
        customer: {
          name: invoice.customerName,
          phone: customer?.phone,
          address: customer?.address,
        },
        invoice,
      })
      if (result === 'downloaded') toast.success('Invoice downloaded')
      else if (result === 'shared') toast.success('Invoice shared')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not share')
    } finally {
      setSharing(false)
    }
  }

  const hasPayments = payments.length > 0

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-1">
          <Button
            variant="ghost" size="icon" aria-label="Share PDF"
            onClick={onShare}
            disabled={sharing || !business}
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete" disabled={hasPayments}>
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete invoice {invoice.invoiceNumber}?</DialogTitle>
                <DialogDescription>This cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={onDelete}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
        <StatusBadge status={invoice.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {invoice.customerName} · {new Date(invoice.issuedAt).toLocaleDateString('en-IN')}
      </p>

      {/* Totals */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Tile label="Total"     value={invoice.total} />
        <Tile label="Paid"      value={invoice.paidAmount} />
        <Tile label="Balance"   value={invoice.balance} highlight={invoice.balance > 0} />
      </div>

      {/* Lines */}
      <div className="mt-6 rounded-2xl border bg-card">
        <div className="border-b px-4 py-2 text-xs text-muted-foreground">Items</div>
        <ul className="divide-y">
          {invoice.lineItems.map((l, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground">
                  {l.qty} {l.unit} × {formatINR(l.price)}
                </div>
              </div>
              <div className="font-medium">{formatINR(l.total)}</div>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t px-4 py-3 text-sm">
          <Row label="Subtotal" value={invoice.subtotal} />
          {invoice.discount > 0 && <Row label="Discount" value={-invoice.discount} />}
          <Row label="Total" value={invoice.total} bold />
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-4 rounded-2xl border bg-card p-4 text-sm">
          <div className="mb-1 text-xs text-muted-foreground">Notes</div>
          <div className="whitespace-pre-wrap">{invoice.notes}</div>
        </div>
      )}

      {/* Payments */}
      <div className="mt-6 rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-xs text-muted-foreground">Payments</div>
          <Button
            size="sm" variant="outline"
            onClick={() => nav(`/invoices/${invoice.id}/payments/new`)}
            disabled={invoice.balance <= 0}
          >
            <Wallet className="mr-1 h-4 w-4" />
            {invoice.balance > 0 ? 'Record payment' : 'Fully paid'}
          </Button>
        </div>
        {payments.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No payments yet.
          </div>
        ) : (
          <ul className="divide-y">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{formatINR(p.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.method} · {new Date(p.date).toLocaleDateString('en-IN')}
                    {p.note ? ` · ${p.note}` : ''}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setCancelTarget(p)}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cancelTarget && (
        <CancelPaymentDialog
          payment={cancelTarget}
          open={!!cancelTarget}
          onOpenChange={(open) => !open && setCancelTarget(null)}
        />
      )}
    </div>
  )
}

function Tile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${highlight ? 'text-warning' : ''}`}>
        {formatINR(value)}
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value < 0 ? `−${formatINR(-value)}` : formatINR(value)}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cls =
    status === 'PAID'    ? 'bg-success/15 text-success' :
    status === 'PARTIAL' ? 'bg-warning/15 text-warning' :
                           'bg-destructive/10 text-destructive'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  )
}
