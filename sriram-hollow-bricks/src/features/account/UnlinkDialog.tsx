import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { unlinkProvider, UnlinkError } from './unlink'

interface Props {
  providerId: string
  providerLabel: string
  email: string | null | undefined
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}

export function UnlinkDialog({
  providerId, providerLabel, email, open, onOpenChange, onSuccess,
}: Props) {
  const [busy, setBusy] = useState(false)

  async function onConfirm() {
    setBusy(true)
    try {
      const { auth } = await import('@/core/firebase/client')
      if (!auth.currentUser) throw new Error('Not signed in')
      await unlinkProvider(auth.currentUser, providerId)
      toast.success(`${providerLabel} removed`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof UnlinkError) toast.error(err.message)
      else toast.error(err instanceof Error ? err.message : 'Unlink failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {providerLabel}?</DialogTitle>
          <DialogDescription>
            You will no longer be able to sign in with {providerLabel}
            {email ? ` (${email})` : ''}. Your other sign-in methods still work.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Removing…' : `Remove ${providerLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
