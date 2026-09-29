import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '@/features/auth/useAuth'
import { useBusiness } from '@/features/auth/useBusiness'
import { db } from '@/core/db/schema'
export interface LinkedProvider {
  providerId: string
  label: string
  email?: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  'password': 'Email / password',
  'phone': 'Phone number',
}

export function useAccount() {
  const { user } = useAuth()
  const { businessId } = useBusiness()
  const [version, setVersion] = useState(0)

  // Force re-render when providers change after a link/unlink.
  useEffect(() => {
    const unsub = (async () => {
      const { onIdTokenChanged } = await import('firebase/auth')
      const { auth } = await import('@/core/firebase/client')
      return onIdTokenChanged(auth, () => setVersion((v) => v + 1))
    })()
    return () => { unsub.then((u) => u()) }
  }, [])

  const providers: LinkedProvider[] = (user?.providerData ?? []).map((p) => ({
    providerId: p.providerId,
    label: PROVIDER_LABELS[p.providerId] ?? p.providerId,
    email: p.email,
  }))

  const hasGoogle = providers.some((p) => p.providerId === 'google.com')
  const hasPassword = providers.some((p) => p.providerId === 'password')
  const isOnlyOneProvider = providers.length <= 1

  return { user, businessId, providers, hasGoogle, hasPassword, isOnlyOneProvider, version }
}

/** Live counts for the "Local data" section. */
export function useLocalStats() {
  const customers = useLiveQuery(() => db.customers.count(), [], 0)
  const invoices  = useLiveQuery(() => db.invoices.count(),  [], 0)
  const payments  = useLiveQuery(() => db.payments.count(),  [], 0)
  const expenses  = useLiveQuery(() => db.expenses.count(),  [], 0)
  const pending   = useLiveQuery(
    () => db.outbox.where('status').anyOf('pending', 'failed').count(),
    [], 0
  )

  const cached = customers + invoices + payments + expenses
  return { cached, pending }
}
