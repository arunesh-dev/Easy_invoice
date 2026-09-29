import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Home, Users, FileText, Wallet, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncEngine } from '@/core/sync/useSync'
import { useBusiness } from '@/features/auth/useBusiness'
import { startAllPulls } from '@/core/sync/startAllPulls'
import { OfflineBanner } from './OfflineBanner'
import { SyncBadge } from './SyncBadge'
import { UpdatePrompt } from './UpdatePrompt'
import { InstallPrompt } from './InstallPrompt'

const tabs = [
  { to: '/home',      label: 'Home',      icon: Home },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/invoices',  label: 'Invoices',  icon: FileText },
  { to: '/expenses',  label: 'Expenses',  icon: Wallet },
  { to: '/settings',  label: 'More',      icon: MoreHorizontal },
]

export function AppShell() {
  const { online } = useSyncEngine()
  const { businessId } = useBusiness()

  useEffect(() => {
    if (!businessId) return
    return startAllPulls(businessId)
  }, [businessId])

  return (
    <div className="flex h-full flex-col">
      <UpdatePrompt />
      <OfflineBanner online={online} />
      <SyncBadge online={online} />

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <InstallPrompt />

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-around">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
