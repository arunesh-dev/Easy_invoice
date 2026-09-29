import type { DbExpense, DbPayment } from '@/core/db/schema'
import { toP, toR } from '@/core/money'

export interface DateRange { start: number; end: number } // inclusive ms

// ---------- Boundaries (local time, Monday-start week) ----------

export function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

export function endOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(23, 59, 59, 999)
  return out
}

/** Monday 00:00 local. `d.getDay()` is 0=Sun..6=Sat. */
export function startOfWeek(d: Date): Date {
  const out = startOfDay(d)
  const diff = (out.getDay() + 6) % 7 // Mon=0..Sun=6
  out.setDate(out.getDate() - diff)
  return out
}

export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d)
  s.setDate(s.getDate() + 6)
  return endOfDay(s)
}

export function startOfMonth(d: Date): Date {
  const out = startOfDay(d)
  out.setDate(1)
  return out
}

export function endOfMonth(d: Date): Date {
  const out = startOfMonth(d)
  out.setMonth(out.getMonth() + 1)
  out.setDate(0)
  return endOfDay(out)
}

export function weekRange(ref: Date = new Date()): DateRange {
  return { start: startOfWeek(ref).getTime(), end: endOfWeek(ref).getTime() }
}

export function monthRange(ref: Date = new Date()): DateRange {
  return { start: startOfMonth(ref).getTime(), end: endOfMonth(ref).getTime() }
}

export function yearRange(ref: Date = new Date()): DateRange {
  const start = startOfDay(new Date(ref.getFullYear(), 0, 1))
  const end = endOfDay(new Date(ref.getFullYear(), 11, 31))
  return { start: start.getTime(), end: end.getTime() }
}

export function inRange(ms: number, r: DateRange): boolean {
  return ms >= r.start && ms <= r.end
}

// ---------- Summaries ----------

export interface Summary {
  income: number
  expenses: number
  profit: number
}

/**
 * Cash-basis summary for a range:
 *   income  = sum of non-cancelled payments dated within range
 *   expense = sum of expenses dated within range
 *   profit  = income − expenses  (may be negative — that's real)
 */
export function summarize(
  payments: DbPayment[],
  expenses: DbExpense[],
  range: DateRange
): Summary {
  const incomePaise = payments.reduce((sum, p) => {
    if (p.isCancelled) return sum
    if (!inRange(p.date, range)) return sum
    return sum + toP(p.amount)
  }, 0)

  const expensePaise = expenses.reduce((sum, e) => {
    if (!inRange(e.date, range)) return sum
    return sum + toP(e.amount)
  }, 0)

  return {
    income: toR(incomePaise),
    expenses: toR(expensePaise),
    profit: toR(incomePaise - expensePaise),
  }
}

// ---------- Category breakdown ----------

export interface CategorySlice { category: string; amount: number }

export function expenseByCategory(
  expenses: DbExpense[],
  range: DateRange
): CategorySlice[] {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    if (!inRange(e.date, range)) continue
    const key = e.category.trim() || 'Uncategorised'
    totals.set(key, (totals.get(key) ?? 0) + toP(e.amount))
  }
  return Array.from(totals.entries())
    .map(([category, paise]) => ({ category, amount: toR(paise) }))
    .sort((a, b) => b.amount - a.amount)
}

// ---------- Time buckets (for charts) ----------

export interface Bucket {
  label: string
  start: number
  end: number
  income: number
  expenses: number
  profit: number
}

const WEEK_LABEL = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' })

/** Last `n` weeks (oldest → newest), each week Monday–Sunday. */
export function lastNWeeks(n: number, ref: Date = new Date()): Bucket[] {
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref)
    d.setDate(d.getDate() - i * 7)
    const start = startOfWeek(d)
    const end = endOfWeek(start)
    out.push({
      label: WEEK_LABEL.format(start),
      start: start.getTime(),
      end: end.getTime(),
      income: 0,
      expenses: 0,
      profit: 0,
    })
  }
  return out
}

/** Last `n` months (oldest → newest). */
export function lastNMonths(n: number, ref: Date = new Date()): Bucket[] {
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
    const start = startOfMonth(d)
    const end = endOfMonth(start)
    out.push({
      label: MONTH_LABEL.format(start),
      start: start.getTime(),
      end: end.getTime(),
      income: 0,
      expenses: 0,
      profit: 0,
    })
  }
  return out
}

/** Populate bucket.income / expenses / profit by scanning payments + expenses once. */
export function fillBuckets(
  buckets: Bucket[],
  payments: DbPayment[],
  expenses: DbExpense[]
): Bucket[] {
  for (const b of buckets) {
    const r: DateRange = { start: b.start, end: b.end }

    const incomePaise = payments.reduce((sum, p) => {
      if (p.isCancelled || !inRange(p.date, r)) return sum
      return sum + toP(p.amount)
    }, 0)

    const expensePaise = expenses.reduce((sum, e) => {
      if (!inRange(e.date, r)) return sum
      return sum + toP(e.amount)
    }, 0)

    b.income = toR(incomePaise)
    b.expenses = toR(expensePaise)
    b.profit = toR(incomePaise - expensePaise)
  }
  return buckets
}
