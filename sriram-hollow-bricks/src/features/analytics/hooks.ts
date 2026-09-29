import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db/schema'
import { useBusiness } from '@/features/auth/useBusiness'
import {
  expenseByCategory, fillBuckets, lastNMonths, lastNWeeks,
  summarize, type DateRange,
} from './compute'

/** Summary + category breakdown for a single date range. */
export function useAnalytics(range: DateRange) {
  const { businessId } = useBusiness()
  const data = useLiveQuery(async () => {
    if (!businessId) return null
    const [payments, expenses] = await Promise.all([
      db.payments.where('businessId').equals(businessId).toArray(),
      db.expenses.where('businessId').equals(businessId).toArray(),
    ])
    return {
      summary: summarize(payments, expenses, range),
      byCategory: expenseByCategory(expenses, range),
    }
  }, [businessId, range.start, range.end])

  return { data, loading: data === undefined }
}

/** Bucketed series for charts. `period` selects week or month buckets. */
export function useAnalyticsBuckets(period: 'week' | 'month', count: number) {
  const { businessId } = useBusiness()
  const data = useLiveQuery(async () => {
    if (!businessId) return null
    const [payments, expenses] = await Promise.all([
      db.payments.where('businessId').equals(businessId).toArray(),
      db.expenses.where('businessId').equals(businessId).toArray(),
    ])
    const buckets = period === 'week' ? lastNWeeks(count) : lastNMonths(count)
    return fillBuckets(buckets, payments, expenses)
  }, [businessId, period, count])

  return { buckets: data ?? [], loading: data === undefined }
}
