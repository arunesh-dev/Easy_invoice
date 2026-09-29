import { Loader2, AlertTriangle } from 'lucide-react'
import { useOutboxCount } from '@/core/sync/useOutboxCount'
import { retryFailed } from '@/core/sync/outbox'
import { flushOutbox } from '@/core/sync/sync'
import { toast } from 'sonner'

export function SyncBadge({ online }: { online: boolean }) {
  const { pending, failed } = useOutboxCount()
  if (!online) return null

  if (failed > 0) {
    return (
      <button
        onClick={async () => {
          await retryFailed()
          await flushOutbox()
          toast.success('Retrying failed changes')
        }}
        className="safe-top flex w-full items-center justify-center gap-2 bg-destructive/15 px-3 py-1.5 text-xs text-destructive"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {failed} change{failed === 1 ? '' : 's'} failed to sync — tap to retry
      </button>
    )
  }

  if (pending > 0) {
    return (
      <div
        role="status"
        className="safe-top flex items-center justify-center gap-2 bg-muted px-3 py-1.5 text-xs text-muted-foreground"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Syncing {pending} change{pending === 1 ? '' : 's'}…
      </div>
    )
  }

  return null
}
