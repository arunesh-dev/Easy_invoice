


import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/core/firebase/client'
import { db } from '@/core/db/schema'
import { useAuth } from './useAuth'

interface BusinessState {
  businessId: string | null
  loading: boolean
}

export function useBusiness(): BusinessState {
  const { user } = useAuth()
  const [businessId, setBusinessId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!user) {
      setBusinessId(null)
      return
    }

    let isMounted = true
    let dexieDone = false
    let fsDone = false
    let dexieId: string | null = null
    let fsId: string | null = null

    const timeout = setTimeout(() => {
      fsDone = true
      evaluate()
    }, 5000)

    function evaluate() {
      if (!isMounted) return
      if (dexieId || fsId) {
        setBusinessId(dexieId || fsId)
      } else if (dexieDone && fsDone) {
        setBusinessId(null)
      }
    }

    db.businesses.where('ownerUid').equals(user.uid).first().then(biz => {
      dexieDone = true
      if (biz) dexieId = biz.id
      evaluate()
    })

    const unsubFs = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snap) => {
        fsDone = true
        fsId = (snap.data()?.businessId as string | null) ?? null
        evaluate()
      },
      (err) => {
        console.warn('[useBusiness] Firestore listener failed:', err)
        fsId = null
        fsDone = true
        evaluate()
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeout)
      unsubFs()
    }
  }, [user])

  return {
    businessId: businessId === undefined ? null : businessId,
    loading: businessId === undefined
  }
}

export function useRequiredBusinessId(): string {
  const { businessId, loading } = useBusiness()
  if (loading) throw new Promise(() => { })
  if (!businessId) throw new Error('No business yet — run onboarding first')
  return businessId
}
