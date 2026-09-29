import { db, type DbExpense, type PaymentMethod, type SyncState } from '@/core/db/schema'
import { newId } from '@/core/sync/id'
import { enqueue } from '@/core/sync/outbox'
import { expenseInputSchema, type ExpenseInput } from './schemas'

const ENTITY = 'expenses' as const

export async function listExpenses(businessId: string): Promise<DbExpense[]> {
  const rows = await db.expenses.where('businessId').equals(businessId).toArray()
  return rows.sort((a, b) => b.date - a.date)
}

export async function getExpense(id: string): Promise<DbExpense | undefined> {
  return db.expenses.get(id)
}

export async function createExpense(
  businessId: string,
  input: ExpenseInput
): Promise<DbExpense> {
  const parsed = expenseInputSchema.parse(input)
  const now = Date.now()

  const doc: DbExpense = {
    id: newId(),
    businessId,
    category: parsed.category,
    amount: parsed.amount,
    method: parsed.method as PaymentMethod,
    date: parsed.date,
    note: parsed.note || undefined,
    _syncState: 'pending',
    _localUpdatedAt: now,
  }

  await db.expenses.put(doc)
  await enqueue({
    entity: ENTITY,
    entityId: doc.id,
    businessId,
    op: 'upsert',
    payload: doc as unknown as Record<string, unknown>,
  })

  return doc
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  const existing = await db.expenses.get(id)
  if (!existing) throw new Error('Expense not found')

  const parsed = expenseInputSchema.parse(input)

  const patch: Partial<DbExpense> = {
    category: parsed.category,
    amount: parsed.amount,
    method: parsed.method as PaymentMethod,
    date: parsed.date,
    note: parsed.note || undefined,
    _syncState: 'pending',
    _localUpdatedAt: Date.now(),
  }

  await db.expenses.update(id, patch)
  const updated = { ...existing, ...patch }

  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'upsert',
    payload: updated as unknown as Record<string, unknown>,
  })
}

export async function deleteExpense(id: string): Promise<void> {
  const existing = await db.expenses.get(id)
  if (!existing) return

  await db.expenses.delete(id)
  await enqueue({
    entity: ENTITY,
    entityId: id,
    businessId: existing.businessId,
    op: 'delete',
  })
}

export async function setExpenseSyncState(id: string, state: SyncState): Promise<void> {
  await db.expenses.update(id, { _syncState: state })
}
