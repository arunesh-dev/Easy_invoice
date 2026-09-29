import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/core/db/schema'
import { createBusiness, updateBusiness, getBusiness } from './repository'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('createBusiness', () => {
  it('creates a business and enqueues an upsert', async () => {
    const b = await createBusiness('uid-1', { name: 'Sriram Hollow Bricks' })
    expect(b.ownerUid).toBe('uid-1')
    expect(b._syncState).toBe('pending')

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0].entity).toBe('businesses')
    expect(outbox[0].entityId).toBe(b.id)
    expect(outbox[0].businessId).toBe(b.id)
  })

  it('rejects an empty name', async () => {
    await expect(createBusiness('uid-1', { name: '' })).rejects.toThrow()
  })

  it('rejects an invalid GSTIN', async () => {
    await expect(
      createBusiness('uid-1', { name: 'X', gstin: 'not-a-gstin' })
    ).rejects.toThrow()
  })

  it('accepts a valid GSTIN', async () => {
    const b = await createBusiness('uid-1', { name: 'X', gstin: '33ABCDE1234F1Z5' })
    expect(b.gstin).toBe('33ABCDE1234F1Z5')
  })
})

describe('updateBusiness', () => {
  it('patches and enqueues a single upsert', async () => {
    const b = await createBusiness('uid-1', { name: 'Old' })
    await updateBusiness(b.id, { name: 'New', phone: '9876543210' })

    const row = await getBusiness(b.id)
    expect(row?.name).toBe('New')
    expect(row?.phone).toBe('9876543210')

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect((outbox[0].payload as any).name).toBe('New')
  })
})
