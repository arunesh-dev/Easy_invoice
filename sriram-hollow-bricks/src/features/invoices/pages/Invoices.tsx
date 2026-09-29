import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useInvoices } from '../hooks'
import { formatINR } from '@/core/money'
import type { InvoiceStatus } from '@/core/db/schema'

const FILTERS: Array<{ label: string; value: InvoiceStatus | 'ALL' }> = [
  { label: 'All',     value: 'ALL' },
  { label: 'Unpaid',  value: 'UNPAID' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Paid',    value: 'PAID' },
]

export default function Invoices() {
  const nav = useNavigate()
  const [status, setStatus] = useState<InvoiceStatus | 'ALL'>('ALL')
  const { invoices, loading } = useInvoices(status === 'ALL' ? {} : { status })

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Button size="sm" onClick={() => nav('/invoices/new')}>
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 transition-colors ${
              status === f.value ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonList rows={3} />}

      {!loading && invoices.length === 0 && (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          No invoices yet — create your first.
        </div>
      )}

      <ul className="space-y-2">
        {invoices.map((inv) => (
          <li key={inv.id}>
            <button
              onClick={() => nav(`/invoices/${inv.id}`)}
              className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left hover:bg-muted/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inv.invoiceNumber}</span>
                  <StatusBadge status={inv.status} />
                  {inv._syncState === 'pending' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Not yet synced" />
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {inv.customerName} · {new Date(inv.issuedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div className="ml-3 shrink-0 text-right">
                <div className="text-sm font-semibold">{formatINR(inv.total)}</div>
                {inv.balance > 0 && (
                  <div className="text-xs text-warning">₹{inv.balance.toLocaleString('en-IN')} due</div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
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
