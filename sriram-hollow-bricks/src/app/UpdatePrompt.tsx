import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function UpdatePrompt() {
  const [dismissed, setDismissed] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Poll for updates while the app is open.
      setInterval(() => registration.update().catch(() => {}), CHECK_INTERVAL_MS)
    },
    onRegisterError(err) {
      // Non-fatal; log for diagnostics only.
      console.warn('[PWA] SW registration failed:', err)
    },
  })

  // Re-show the prompt if a new update arrives after a prior dismissal.
  useEffect(() => {
    if (needRefresh) setDismissed(false)
  }, [needRefresh])

  if (!needRefresh || dismissed) return null

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 mx-auto flex max-w-md items-center gap-2 rounded-b-2xl border-b bg-card px-3 py-2 shadow-lg">
      <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1 text-sm">A new version is ready.</div>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        Refresh
      </Button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
