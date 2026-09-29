import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useAnalytics } from '../hooks'
import { monthRange, weekRange } from '../compute'
import { useCustomers } from '@/features/customers/hooks'
import { useInvoices } from '@/features/invoices/hooks'
import { SkeletonMetrics } from '@/components/ui/Skeleton'
import { formatINR } from '@/core/money'

type Period = 'week' | 'month'

export default function Dashboard() {
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('week')
  const range = useMemo(() => (period === 'week' ? weekRange() : monthRange()), [period])
  const { data, loading } = useAnalytics(range)
  const { customers } = useCustomers()
  const { invoices } = useInvoices()

  const topOutstanding = useMemo(
    () =>
      [...customers]
        .filter((c) => c.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 5),
    [customers]
  )

  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices])

  const summary = data?.summary ?? { income: 0, expenses: 0, profit: 0 }

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
          {(['week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                period === p ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonMetrics /> : (
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="Income"
            value={summary.income}
            loading={false}
            icon={<TrendingUp className="h-4 w-4 text-success" />}
          />
          <Metric
            label="Expenses"
            value={summary.expenses}
            loading={false}
            icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          />
          <Metric
            label="Profit"
            value={summary.profit}
            loading={false}
            icon={<Wallet className="h-4 w-4" />}
            highlight={summary.profit >= 0 ? 'positive' : 'negative'}
          />
        </div>
      )}

      {/* Outstanding */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Outstanding</h2>
          <button onClick={() => nav('/customers')} className="text-xs text-primary underline">
            View all
          </button>
        </div>
        {topOutstanding.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No outstanding balances. 🎉
          </div>
        ) : (
          <ul className="space-y-2">
            {topOutstanding.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => nav(`/customers/${c.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left hover:bg-muted/50"
                >
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="ml-3 shrink-0 text-sm font-semibold text-warning">
                    {formatINR(c.outstanding)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent invoices */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent invoices</h2>
          <button onClick={() => nav('/invoices')} className="text-xs text-primary underline">
            View all
          </button>
        </div>
        {recentInvoices.length === 0 ? (
          <button
            onClick={() => nav('/invoices/new')}
            className="w-full rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground hover:bg-muted/40"
          >
            Create your first invoice
          </button>
        ) : (
          <ul className="space-y-2">
            {recentInvoices.map((inv) => (
              <li key={inv.id}>
                <button
                  onClick={() => nav(`/invoices/${inv.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{inv.invoiceNumber}</div>
                    <div className="truncate text-xs text-muted-foreground">{inv.customerName}</div>
                  </div>
                  <div className="ml-3 shrink-0 text-sm font-semibold">{formatINR(inv.total)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Metric({
  label, value, loading, icon, highlight,
}: {
  label: string
  value: number
  loading: boolean
  icon?: React.ReactNode
  highlight?: 'positive' | 'negative'
}) {
  const tone =
    highlight === 'positive' ? 'text-success' :
    highlight === 'negative' ? 'text-destructive' : ''
  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <div className="mt-2 h-5 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <div className={`mt-1 text-base font-semibold ${tone}`}>{formatINR(value)}</div>
      )}
    </div>
  )
}
