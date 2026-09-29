import { WifiOff } from 'lucide-react'

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div
      role="status"
      className="safe-top flex items-center justify-center gap-2 bg-warning/20 px-3 py-1.5 text-center text-xs text-warning-foreground"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Offline — changes will sync when you reconnect
    </div>
  )
}
