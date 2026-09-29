import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { signIn } from './auth-api'
import { completeLink, type PendingLink } from './link-account'

interface Props {
  pending: PendingLink
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function LinkAccountDialog({ pending, open, onOpenChange, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onConfirm() {
    setBusy(true)
    try {
      // Sign in with the existing method.
      await signIn(pending.email, password)
      // Now link the pending Google credential to the account.
      await completeLink(pending)
      toast.success('Google account linked. You can now sign in either way.')
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        toast.error('Incorrect password')
      } else {
        toast.error(err?.message ?? 'Linking failed')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link your Google account</DialogTitle>
          <DialogDescription>
            An account already exists for <strong>{pending.email}</strong> with
            email/password. Enter your password to link your Google account.
            After this, you can sign in with either method.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="link-password">Password</Label>
          <Input
            id="link-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirm() }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy || password.length === 0}>
            {busy ? 'Linking…' : 'Link account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
