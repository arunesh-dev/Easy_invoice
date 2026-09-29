import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { createExpense, updateExpense, deleteExpense, listExpenses } from './repository'

const BIZ = 'biz-1'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('expenses repository', () => {
  it('creates and enqueues an upsert', async () => {
    const e = await createExpense(BIZ, {
      category: 'Fuel', amount: 500, method: 'CASH', date: Date.now(), note: '',
    })
    expect(e._syncState).toBe('pending')

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0].entity).toBe('expenses')
    expect(outbox[0].op).toBe('upsert')
  })

  it('rejects non-positive amounts', async () => {
    await expect(createExpense(BIZ, {
      category: 'Fuel', amount: 0, method: 'CASH', date: Date.now(), note: '',
    })).rejects.toThrow()
  })

  it('collapses multiple edits into a single outbox entry', async () => {
    const e = await createExpense(BIZ, {
      category: 'Fuel', amount: 500, method: 'CASH', date: Date.now(), note: '',
    })
    await updateExpense(e.id, {
      category: 'Fuel', amount: 600, method: 'CASH', date: Date.now(), note: '',
    })
    await updateExpense(e.id, {
      category: 'Fuel', amount: 700, method: 'CASH', date: Date.now(), note: '',
    })
    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect((outbox[0].payload as any).amount).toBe(700)
  })

  it('cancels both writes when created then deleted offline', async () => {
    const e = await createExpense(BIZ, {
      category: 'Fuel', amount: 500, method: 'CASH', date: Date.now(), note: '',
    })
    await deleteExpense(e.id)
    expect(await db.outbox.count()).toBe(0)
    expect(await db.expenses.get(e.id)).toBeUndefined()
  })

  it('lists newest first', async () => {
    await createExpense(BIZ, { category: 'A', amount: 1, method: 'CASH', date: 1000, note: '' })
    await createExpense(BIZ, { category: 'B', amount: 1, method: 'CASH', date: 2000, note: '' })
    const rows = await listExpenses(BIZ)
    expect(rows[0].category).toBe('B')
    expect(rows[1].category).toBe('A')
  })
})
