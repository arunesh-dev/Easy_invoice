import { describe, expect, it } from 'vitest'
import type { DbExpense, DbPayment } from '@/core/db/schema'
import {
  endOfMonth, endOfWeek, expenseByCategory, fillBuckets, inRange,
  lastNMonths, lastNWeeks, monthRange, startOfMonth, startOfWeek,
  summarize, weekRange, yearRange,
} from './compute'

// A fixed reference: Monday 15 Jan 2024, 10:00 IST
const REF = new Date(2024, 0, 15, 10, 0, 0)

function pay(amount: number, date: Date, cancelled = false): DbPayment {
  return {
    id: `p-${Math.random()}`, businessId: 'b', invoiceId: 'i',
    amount, method: 'CASH', date: date.getTime(), isCancelled: cancelled,
    _syncState: 'synced', _localUpdatedAt: 0,
  }
}

function exp(amount: number, category: string, date: Date): DbExpense {
  return {
    id: `e-${Math.random()}`, businessId: 'b', category,
    amount, method: 'CASH', date: date.getTime(),
    _syncState: 'synced', _localUpdatedAt: 0,
  }
}

describe('week boundaries (Monday-start)', () => {
  it('startOfWeek returns Monday 00:00', () => {
    const s = startOfWeek(REF) // Mon
    expect(s.getDay()).toBe(1)
    expect(s.getHours()).toBe(0)
    expect(s.getDate()).toBe(15)
  })

  it('handles Sunday (belongs to the week that just ended)', () => {
    const sun = new Date(2024, 0, 21) // Sun 21 Jan
    const s = startOfWeek(sun)
    expect(s.getDate()).toBe(15) // back to Monday
  })

  it('endOfWeek is Sunday 23:59:59.999', () => {
    const e = endOfWeek(REF)
    expect(e.getDay()).toBe(0)
    expect(e.getHours()).toBe(23)
    expect(e.getMinutes()).toBe(59)
  })

  it('handles month-boundary weeks', () => {
    // Week 29 Jan – 4 Feb 2024 (Mon–Sun)
    const wed = new Date(2024, 0, 31)
    expect(startOfWeek(wed).getDate()).toBe(29)
    expect(endOfWeek(wed).getDate()).toBe(4)
    expect(endOfWeek(wed).getMonth()).toBe(1) // Feb
  })
})

describe('month boundaries', () => {
  it('startOfMonth is the 1st at 00:00', () => {
    const s = startOfMonth(REF)
    expect(s.getDate()).toBe(1)
    expect(s.getMonth()).toBe(0)
    expect(s.getHours()).toBe(0)
  })

  it('endOfMonth handles 31-day and 30-day months', () => {
    expect(endOfMonth(new Date(2024, 0, 15)).getDate()).toBe(31) // Jan
    expect(endOfMonth(new Date(2024, 1, 15)).getDate()).toBe(29) // Feb leap
    expect(endOfMonth(new Date(2023, 1, 15)).getDate()).toBe(28) // Feb non-leap
    expect(endOfMonth(new Date(2024, 3, 15)).getDate()).toBe(30) // Apr
  })
})

describe('inRange', () => {
  it('is inclusive at both ends', () => {
    const r = weekRange(REF)
    expect(inRange(r.start, r)).toBe(true)
    expect(inRange(r.end, r)).toBe(true)
    expect(inRange(r.start - 1, r)).toBe(false)
    expect(inRange(r.end + 1, r)).toBe(false)
  })
})

describe('summarize', () => {
  it('sums income from payments and expenses in range', () => {
    const payments = [
      pay(1000, new Date(2024, 0, 15, 9)),  // in week
      pay(500,  new Date(2024, 0, 17, 15)), // in week
      pay(999,  new Date(2024, 0, 10)),     // previous week
    ]
    const expenses = [
      exp(200, 'Fuel',    new Date(2024, 0, 16)),
      exp(300, 'Repairs', new Date(2024, 0, 18)),
      exp(100, 'Misc',    new Date(2024, 0, 5)), // previous week
    ]
    const s = summarize(payments, expenses, weekRange(REF))
    expect(s.income).toBe(1500)
    expect(s.expenses).toBe(500)
    expect(s.profit).toBe(1000)
  })

  it('ignores cancelled payments', () => {
    const payments = [
      pay(1000, new Date(2024, 0, 15), false),
      pay(500,  new Date(2024, 0, 16), true), // cancelled
    ]
    const s = summarize(payments, [], weekRange(REF))
    expect(s.income).toBe(1000)
  })

  it('returns negative profit when expenses exceed income', () => {
    const payments = [pay(100, new Date(2024, 0, 15))]
    const expenses = [exp(500, 'Fuel', new Date(2024, 0, 15))]
    const s = summarize(payments, expenses, weekRange(REF))
    expect(s.profit).toBe(-400)
  })

  it('is exact to the paise (no float drift)', () => {
    const payments = [
      pay(0.1, new Date(2024, 0, 15)),
      pay(0.1, new Date(2024, 0, 15)),
      pay(0.1, new Date(2024, 0, 15)),
    ]
    expect(summarize(payments, [], weekRange(REF)).income).toBe(0.3)
  })

  it('returns zeros for empty input', () => {
    expect(summarize([], [], weekRange(REF))).toEqual({ income: 0, expenses: 0, profit: 0 })
  })
})

describe('expenseByCategory', () => {
  it('groups and sorts descending', () => {
    const e = [
      exp(100, 'Fuel',    new Date(2024, 0, 15)),
      exp(500, 'Repairs', new Date(2024, 0, 15)),
      exp(200, 'Fuel',    new Date(2024, 0, 16)),
      exp(50,  'Misc',    new Date(2024, 0, 17)),
    ]
    const out = expenseByCategory(e, weekRange(REF))
    expect(out.map((x) => x.category)).toEqual(['Repairs', 'Fuel', 'Misc'])
    expect(out[0].amount).toBe(500)
    expect(out[1].amount).toBe(300)
  })

  it('buckets blank categories under "Uncategorised"', () => {
    const e = [exp(100, '', new Date(2024, 0, 15))]
    expect(expenseByCategory(e, weekRange(REF))[0].category).toBe('Uncategorised')
  })

  it('excludes expenses outside range', () => {
    const e = [
      exp(100, 'Fuel', new Date(2024, 0, 15)),
      exp(999, 'Fuel', new Date(2024, 0, 1)),
    ]
    const out = expenseByCategory(e, weekRange(REF))
    expect(out).toHaveLength(1)
    expect(out[0].amount).toBe(100)
  })
})

describe('lastNWeeks', () => {
  it('returns n buckets oldest → newest', () => {
    const buckets = lastNWeeks(4, REF)
    expect(buckets).toHaveLength(4)
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].start).toBeGreaterThan(buckets[i - 1].start)
    }
  })

  it('last bucket contains the reference date', () => {
    const buckets = lastNWeeks(4, REF)
    const last = buckets[buckets.length - 1]
    expect(inRange(REF.getTime(), { start: last.start, end: last.end })).toBe(true)
  })

  it('weeks are non-overlapping and contiguous', () => {
    const buckets = lastNWeeks(4, REF)
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].start).toBe(buckets[i - 1].end + 1)
    }
  })
})

describe('lastNMonths', () => {
  it('crosses year boundaries correctly', () => {
    const dec = new Date(2024, 11, 15)
    const buckets = lastNMonths(3, dec) // Oct, Nov, Dec 2024
    expect(buckets.map((b) => b.label)).toEqual(expect.arrayContaining([expect.stringMatching(/Oct|Nov|Dec/)]))
    expect(new Date(buckets[0].start).getMonth()).toBe(9) // Oct
    expect(new Date(buckets[2].start).getMonth()).toBe(11) // Dec
  })
})

describe('fillBuckets', () => {
  it('populates income, expenses, and profit per bucket', () => {
    const buckets = lastNWeeks(2, REF)
    const payments = [
      pay(1000, new Date(buckets[0].start + 1000)),
      pay(2000, new Date(buckets[1].start + 1000)),
    ]
    const expenses = [
      exp(400, 'Fuel', new Date(buckets[0].start + 1000)),
      exp(1500, 'Repairs', new Date(buckets[1].start + 1000)),
    ]
    const filled = fillBuckets(buckets, payments, expenses)
    expect(filled[0]).toMatchObject({ income: 1000, expenses: 400, profit: 600 })
    expect(filled[1]).toMatchObject({ income: 2000, expenses: 1500, profit: 500 })
  })
})

describe('yearRange / monthRange', () => {
  it('yearRange covers full calendar year', () => {
    const r = yearRange(REF)
    const s = new Date(r.start)
    const e = new Date(r.end)
    expect(s.getFullYear()).toBe(2024)
    expect(s.getMonth()).toBe(0)
    expect(s.getDate()).toBe(1)
    expect(e.getFullYear()).toBe(2024)
    expect(e.getMonth()).toBe(11)
    expect(e.getDate()).toBe(31)
  })

  it('monthRange is a subrange of yearRange', () => {
    const y = yearRange(REF)
    const m = monthRange(REF)
    expect(m.start).toBeGreaterThanOrEqual(y.start)
    expect(m.end).toBeLessThanOrEqual(y.end)
  })
})
