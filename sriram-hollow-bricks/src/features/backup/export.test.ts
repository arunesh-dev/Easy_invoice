import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { buildBackup } from './export'

const BIZ = 'biz-1'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('buildBackup', () => {
  it('includes every table filtered by business', async () => {
    await db.customers.put({
      id: 'c1', businessId: BIZ, name: 'Ramesh', outstanding: 0,
      createdAt: 0, updatedAt: 0, _syncState: 'synced', _localUpdatedAt: 0,
    })
    await db.customers.put({
      id: 'c2', businessId: 'other', name: 'Suresh', outstanding: 0,
      createdAt: 0, updatedAt: 0, _syncState: 'synced', _localUpdatedAt: 0,
    })

    const b = await buildBackup(BIZ)
    expect(b.format).toBe('sriram-backup')
    expect(b.version).toBe(1)
    expect(b.customers).toHaveLength(1)
    expect((b.customers[0] as any).id).toBe('c1')
  })

  it('returns empty arrays for a business with no data', async () => {
    const b = await buildBackup(BIZ)
    expect(b.customers).toEqual([])
    expect(b.invoices).toEqual([])
  })
})
