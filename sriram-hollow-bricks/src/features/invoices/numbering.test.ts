import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import {
  ensureCounterAtLeast,
  formatInvoiceNumber,
  nextInvoiceNumber,
  peekInvoiceCounter,
} from './numbering'

const BIZ = 'biz-1'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('formatInvoiceNumber', () => {
  it('pads to 4 digits', () => {
    expect(formatInvoiceNumber('SRM', 1)).toBe('SRM-0001')
    expect(formatInvoiceNumber('SRM', 42)).toBe('SRM-0042')
    expect(formatInvoiceNumber('SRM', 999)).toBe('SRM-0999')
  })
  it('stops padding past 9999', () => {
    expect(formatInvoiceNumber('SRM', 10000)).toBe('SRM-10000')
    expect(formatInvoiceNumber('SRM', 123456)).toBe('SRM-123456')
  })
  it('honors a custom prefix', () => {
    expect(formatInvoiceNumber('INV', 7)).toBe('INV-0007')
  })
})

describe('nextInvoiceNumber', () => {
  it('starts at 0001 for a fresh business', async () => {
    expect(await nextInvoiceNumber(BIZ)).toBe('SRM-0001')
  })

  it('increments monotonically', async () => {
    const a = await nextInvoiceNumber(BIZ)
    const b = await nextInvoiceNumber(BIZ)
    const c = await nextInvoiceNumber(BIZ)
    expect([a, b, c]).toEqual(['SRM-0001', 'SRM-0002', 'SRM-0003'])
  })

  it('isolates counters per business', async () => {
    await nextInvoiceNumber('biz-1')
    await nextInvoiceNumber('biz-1')
    expect(await nextInvoiceNumber('biz-2')).toBe('SRM-0001')
  })

  it('survives concurrent calls without duplicate numbers', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => nextInvoiceNumber(BIZ))
    )
    const unique = new Set(results)
    expect(unique.size).toBe(20)
  })

  it('persists across a database reopen (reload simulation)', async () => {
    await nextInvoiceNumber(BIZ)
    await nextInvoiceNumber(BIZ)

    await db.close()
    await db.open()

    expect(await nextInvoiceNumber(BIZ)).toBe('SRM-0003')
  })
})

describe('ensureCounterAtLeast', () => {
  it('raises the counter when the floor is higher', async () => {
    await ensureCounterAtLeast(BIZ, 100)
    expect(await peekInvoiceCounter(BIZ)).toBe(100)
    expect(await nextInvoiceNumber(BIZ)).toBe('SRM-0101')
  })

  it('never lowers an existing higher counter', async () => {
    await nextInvoiceNumber(BIZ)
    await nextInvoiceNumber(BIZ)
    await nextInvoiceNumber(BIZ)     // counter = 3
    await ensureCounterAtLeast(BIZ, 2)
    expect(await peekInvoiceCounter(BIZ)).toBe(3)
  })

  it('is a no-op when the counter already matches', async () => {
    await ensureCounterAtLeast(BIZ, 5)
    await ensureCounterAtLeast(BIZ, 5)
    expect(await peekInvoiceCounter(BIZ)).toBe(5)
  })
})
