import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAnalytics, useAnalyticsBuckets } from '../hooks'
import { monthRange, weekRange, yearRange } from '../compute'
import { formatINR } from '@/core/money'

type Period = 'week' | 'month' | 'year'

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('month')

  const range = useMemo(() => {
    if (period === 'week') return weekRange()
    if (period === 'month') return monthRange()
    return yearRange()
  }, [period])

  const { data, loading } = useAnalytics(range)

  const { buckets } = useAnalyticsBuckets(
    period === 'year' ? 'month' : 'week',
    period === 'year' ? 12 : period === 'month' ? 8 : 8
  )

  const chartData = useMemo(
    () => buckets.map((b) => ({ label: b.label, Income: b.income, Expenses: b.expenses })),
    [buckets]
  )

  const summary = data?.summary ?? { income: 0, expenses: 0, profit: 0 }
  const categories = data?.byCategory ?? []

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
          {(['week', 'month', 'year'] as const).map((p) => (
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

      {/* Profit hero */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="text-xs text-muted-foreground">Profit this {period}</div>
        <div className={`mt-1 text-3xl font-semibold ${summary.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
          {loading ? '—' : formatINR(summary.profit)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Income</div>
            <div className="font-medium">{formatINR(summary.income)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Expenses</div>
            <div className="font-medium">{formatINR(summary.expenses)}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-2xl border bg-card p-4">
        <div className="mb-3 text-sm font-medium">Income vs. Expenses</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => formatINR(Number(v))}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Income"   fill="hsl(142 71% 35%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(0 72% 51%)"   radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="mt-6 rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-medium">Expenses by category</div>
        {categories.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No expenses in this period.
          </div>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => {
              const pct = summary.expenses > 0 ? (c.amount / summary.expenses) * 100 : 0
              return (
                <li key={c.category} className="px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.category}</span>
                    <span>{formatINR(c.amount)}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
