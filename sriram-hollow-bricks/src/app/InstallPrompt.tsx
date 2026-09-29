import { useEffect, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const VISITS_KEY = 'shb:visits'
const DISMISS_KEY = 'shb:installDismissedUntil'
const DISMISS_DAYS = 30
const MIN_VISITS = 2

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    // Bump visit count once per session.
    const visits = parseInt(localStorage.getItem(VISITS_KEY) ?? '0', 10) + 1
    localStorage.setItem(VISITS_KEY, String(visits))

    // Respect prior dismissal.
    const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) ?? '0', 10)
    if (Date.now() < dismissedUntil) return

    // Already installed — never show.
    if (isStandalone()) return

    // Need at least MIN_VISITS sessions before nudging.
    if (visits < MIN_VISITS) return

    // iOS has no beforeinstallprompt — show manual instructions.
    if (isIos()) {
      setIos(true)
      setVisible(true)
      return
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(DISMISS_KEY, String(until))
    setVisible(false)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    } else {
      dismiss()
    }
    setDeferred(null)
  }

  if (!visible) return null

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-3">
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {ios ? (
            <Share2 className="h-5 w-5 text-primary" />
          ) : (
            <Download className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex-1 text-sm">
          <div className="font-medium">Install Sriram</div>
          {ios ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <Share2 className="inline h-3 w-3" /> Share, then{' '}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Works offline. Opens like a native app.
            </p>
          )}
          {!ios && (
            <Button size="sm" className="mt-2" onClick={install}>
              Install
            </Button>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
