import { describe, expect, it } from 'vitest'
import {
  balanceOf,
  canAcceptPayment,
  computeTotals,
  lineTotal,
  maxPayment,
  percentOff,
  statusOf,
} from './math'

describe('lineTotal', () => {
  it('multiplies integer quantities', () => {
    expect(lineTotal(500, 35.5)).toBe(17750)
  })

  it('handles fractional quantities (cft, kg)', () => {
    expect(lineTotal(2.5, 35.5)).toBe(88.75)
    expect(lineTotal(0.25, 100)).toBe(25)
  })

  it('rejects negative or non-finite input', () => {
    expect(() => lineTotal(-1, 10)).toThrow()
    expect(() => lineTotal(1, NaN)).toThrow()
  })
})

describe('computeTotals', () => {
  it('sums lines with no discount', () => {
    const t = computeTotals({
      lines: [
        { qty: 500, price: 35.5 },  // 17,750
        { qty: 100, price: 42 },    //  4,200
      ],
    })
    expect(t.subtotal).toBe(21950)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(21950)
  })

  it('applies a flat discount', () => {
    const t = computeTotals({
      lines: [{ qty: 100, price: 100 }], // 10,000
      discount: 500,
    })
    expect(t.total).toBe(9500)
  })

  it('clamps discount larger than subtotal to zero total', () => {
    const t = computeTotals({
      lines: [{ qty: 1, price: 100 }],
      discount: 999,
    })
    expect(t.subtotal).toBe(100)
    expect(t.discount).toBe(999)     // recorded as-given
    expect(t.total).toBe(0)          // but total never negative
  })

  it('avoids float drift across many small lines', () => {
    // 3 × ₹0.10 = ₹0.30, not 0.30000000000000004
    const t = computeTotals({
      lines: [
        { qty: 1, price: 0.1 },
        { qty: 1, price: 0.1 },
        { qty: 1, price: 0.1 },
      ],
    })
    expect(t.subtotal).toBe(0.3)
    expect(t.total).toBe(0.3)
  })

  it('handles an empty invoice', () => {
    const t = computeTotals({ lines: [] })
    expect(t).toEqual({ subtotal: 0, discount: 0, total: 0 })
  })
})

describe('percentOff', () => {
  it('computes 10% of ₹1,000', () => {
    expect(percentOff(1000, 10)).toBe(100)
  })
  it('rounds to nearest paisa', () => {
    expect(percentOff(99.99, 18)).toBe(18)     // 17.9982 → 18.00
    expect(percentOff(100, 33.333)).toBe(33.33)
  })
  it('rejects out-of-range percentages', () => {
    expect(() => percentOff(100, -5)).toThrow()
    expect(() => percentOff(100, 150)).toThrow()
  })
})

describe('balanceOf / statusOf', () => {
  it('UNPAID when nothing paid', () => {
    expect(statusOf(1000, 0)).toBe('UNPAID')
    expect(balanceOf(1000, 0)).toBe(1000)
  })
  it('PARTIAL when paid less than total', () => {
    expect(statusOf(1000, 400)).toBe('PARTIAL')
    expect(balanceOf(1000, 400)).toBe(600)
  })
  it('PAID when paid equals total', () => {
    expect(statusOf(1000, 1000)).toBe('PAID')
    expect(balanceOf(1000, 1000)).toBe(0)
  })
  it('PAID (not negative) if paid somehow exceeds total', () => {
    expect(statusOf(1000, 1200)).toBe('PAID')
    expect(balanceOf(1000, 1200)).toBe(0)
  })
  it('compares correctly at paise precision', () => {
    // 0.1 + 0.2 → 0.3 exact in paise
    expect(statusOf(0.3, 0.3)).toBe('PAID')
    expect(statusOf(0.3, 0.1)).toBe('PARTIAL')
  })
})

describe('payment guards', () => {
  it('maxPayment = remaining balance', () => {
    expect(maxPayment(1000, 250)).toBe(750)
  })
  it('accepts a valid partial payment', () => {
    expect(canAcceptPayment(1000, 0, 500)).toBe(true)
  })
  it('rejects zero and negative', () => {
    expect(canAcceptPayment(1000, 0, 0)).toBe(false)
    expect(canAcceptPayment(1000, 0, -50)).toBe(false)
  })
  it('rejects overpayment', () => {
    expect(canAcceptPayment(1000, 500, 500.01)).toBe(false)
    expect(canAcceptPayment(1000, 500, 501)).toBe(false)
  })
  it('accepts exact remaining balance', () => {
    expect(canAcceptPayment(1000, 500, 500)).toBe(true)
  })
})
