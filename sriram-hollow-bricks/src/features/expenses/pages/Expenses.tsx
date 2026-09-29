import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useExpenses } from '../hooks'
import { formatINR } from '@/core/money'
import { monthRange, weekRange, type DateRange } from '@/features/analytics/compute'

const FILTERS = ['This week', 'This month', 'All'] as const
type Filter = (typeof FILTERS)[number]

export default function Expenses() {
  const nav = useNavigate()
  const { expenses, loading } = useExpenses()
  const [filter, setFilter] = useState<Filter>('This month')

  const range: DateRange | null = useMemo(() => {
    if (filter === 'This week') return weekRange()
    if (filter === 'This month') return monthRange()
    return null
  }, [filter])

  const filtered = useMemo(() => {
    if (!range) return expenses
    return expenses.filter((e) => e.date >= range.start && e.date <= range.end)
  }, [expenses, range])

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const e of filtered) {
      const key = new Date(e.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(e)
    }
    return Array.from(groups.entries())
  }, [filtered])

  const total = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Button size="sm" onClick={() => nav('/expenses/new')}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-muted p-1 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg px-3 py-2 transition-colors ${
              filter === f ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border bg-card p-4">
        <div className="text-xs text-muted-foreground">Total for {filter.toLowerCase()}</div>
        <div className="mt-1 text-2xl font-semibold">{formatINR(total)}</div>
      </div>

      {loading && <SkeletonList rows={1} />}

      {!loading && filtered.length === 0 && (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          No expenses in this period.
        </div>
      )}

      {grouped.map(([month, rows]) => (
        <section key={month} className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {month}
          </h2>
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => nav(`/expenses/${e.id}/edit`)}
                  className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.category}</span>
                      {e._syncState === 'pending' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Not yet synced" />
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString('en-IN')}
                      {e.note ? ` · ${e.note}` : ''}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-sm font-semibold text-destructive">
                    −{formatINR(e.amount)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
