import { Outlet } from 'react-router-dom'
import { useBusiness } from '@/features/auth/useBusiness'
import BusinessOnboarding from './pages/BusinessOnboarding'

export function BusinessLayout() {
  const { businessId, loading } = useBusiness()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!businessId) {
    return <BusinessOnboarding />
  }

  return <Outlet />
}
