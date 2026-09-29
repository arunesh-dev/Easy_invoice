import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db/schema'

export function useOutboxCount() {
  const pending = useLiveQuery(
    () => db.outbox.where('status').equals('pending').count(),
    [],
    0
  )
  const failed = useLiveQuery(
    () => db.outbox.where('status').equals('failed').count(),
    [],
    0
  )
  return { pending, failed }
}
