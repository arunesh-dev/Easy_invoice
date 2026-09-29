import { describe, expect, it } from 'vitest'
import { formatINR, toP, toR } from './money'

describe('toP / toR', () => {
  it('converts exact rupees to paise', () => {
    expect(toP(35)).toBe(3500)
    expect(toP(35.5)).toBe(3550)
    expect(toP(0)).toBe(0)
  })

  it('kills float epsilon', () => {
    expect(toP(0.1 + 0.2)).toBe(30) // not 30.000000000000004
    expect(toR(toP(35.55))).toBe(35.55)
  })

  it('round-trips commonly used prices', () => {
    for (const r of [0, 1, 9.99, 35, 35.5, 35.55, 499.95, 10000]) {
      expect(toR(toP(r))).toBeCloseTo(r, 10)
    }
  })
})

describe('formatINR', () => {
  it('drops decimals for whole rupees', () => {
    expect(formatINR(17750)).toMatch(/17,750/)
    expect(formatINR(17750)).not.toMatch(/\.00/)
  })

  it('shows paise when present', () => {
    expect(formatINR(35.5)).toMatch(/35\.50/)
  })
})
