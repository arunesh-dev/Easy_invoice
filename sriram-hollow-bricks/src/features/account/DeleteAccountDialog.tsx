import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/useAuth'
import { reauthenticateWithPassword } from './session'
import { deleteAccount, DeleteAccountError } from './delete-account'

interface Props {
  businessId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onDeleted: () => void
}

export function DeleteAccountDialog({ businessId, open, onOpenChange, onDeleted }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState<'confirm' | 'reauth' | 'deleting'>('confirm')
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const emailMatches = user?.email && typed.trim().toLowerCase() === user.email.toLowerCase()

  function reset() {
    setStep('confirm'); setTyped(''); setPassword(''); setProgress(''); setError(null)
  }

  async function onReauthAndDelete() {
    if (!user) return
    setError(null)
    try {
      await reauthenticateWithPassword(password)
    } catch (err: any) {
      setError(err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
        ? 'Incorrect password'
        : err?.message ?? 'Authentication failed')
      return
    }

    setStep('deleting')
    try {
      await deleteAccount(user, businessId, (p) => setProgress(p.detail))
      toast.success('Your account has been deleted.')
      onDeleted()
    } catch (err) {
      if (err instanceof DeleteAccountError) {
        setError(err.message)
        if (err.code === 'REQUIRES_REAUTH') setStep('reauth')
        else setStep('confirm')
      } else {
        setError(err instanceof Error ? err.message : 'Deletion failed')
        setStep('confirm')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete your account</DialogTitle>
              <DialogDescription>
                This permanently deletes your business, customers, products,
                invoices, payments, and expenses. <strong>This cannot be undone.</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                Export a backup first if you want a copy of your data.
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-email">
                  Type <span className="font-mono text-xs">{user?.email}</span> to confirm
                </Label>
                <Input
                  id="confirm-email"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={!emailMatches}
                onClick={() => setStep('reauth')}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'reauth' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm your password</DialogTitle>
              <DialogDescription>
                For your security, please re-enter your password to continue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="reauth-password">Password</Label>
              <Input
                id="reauth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('confirm')}>Back</Button>
              <Button
                variant="destructive"
                disabled={password.length === 0}
                onClick={onReauthAndDelete}
              >
                Delete account
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'deleting' && (
          <>
            <DialogHeader>
              <DialogTitle>Deleting your account…</DialogTitle>
              <DialogDescription>{progress || 'Preparing…'}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
            </div>
            <p className="text-xs text-muted-foreground">
              Don't close this window. If it takes more than a minute something is wrong.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
