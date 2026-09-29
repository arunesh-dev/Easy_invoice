import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useAccount, useLocalStats } from '../hooks'
import { UnlinkDialog } from '../UnlinkDialog'
import { DeleteAccountDialog } from '../DeleteAccountDialog'
import { signOutEverywhere } from '../session'

import { db } from '@/core/db/schema'

export default function AccountSecurity() {
  const nav = useNavigate()
  const { user, businessId, providers, hasGoogle, hasPassword, isOnlyOneProvider } = useAccount()
  const { cached, pending } = useLocalStats()
  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; label: string; email?: string | null } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [clearCacheOpen, setClearCacheOpen] = useState(false)

  if (!user || !businessId) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  async function onClearCache() {
    // Preserve the outbox — anything pending needs to sync first.
    if (pending > 0) {
      toast.error(`You have ${pending} unsynced change${pending === 1 ? '' : 's'}. Wait for sync or reconnect first.`)
      setClearCacheOpen(false)
      return
    }
    await db.customers.clear()
    await db.products.clear()
    await db.invoices.clear()
    await db.payments.clear()
    await db.expenses.clear()
    toast.success('Local cache cleared. Data will re-sync from Firestore.')
    setClearCacheOpen(false)
    // The Firestore listeners will repopulate on their next snapshot.
  }

  return (
    <div className="safe-top px-4 py-6">
      <h1 className="text-2xl font-semibold">Account & security</h1>

      {/* Identity */}
      <section className="mt-6 rounded-2xl border bg-card p-4">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="mt-0.5 font-medium">{user.email}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Business ID: <span className="font-mono">{businessId.slice(0, 8)}…</span>
        </div>
      </section>

      {/* Sign-in methods */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Sign-in methods</h2>
        <ul className="rounded-2xl border bg-card divide-y">
          {providers.map((p) => (
            <li key={p.providerId} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                {p.email && <div className="text-xs text-muted-foreground">{p.email}</div>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isOnlyOneProvider}
                title={isOnlyOneProvider ? 'Add another method first' : undefined}
                onClick={() => setUnlinkTarget({ id: p.providerId, label: p.label, email: p.email })}
              >
                {isOnlyOneProvider ? 'Only method' : 'Unlink'}
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {!hasGoogle && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { GoogleAuthProvider, linkWithPopup } = await import('firebase/auth')
                  const { auth } = await import('@/core/firebase/client')
                  if (!auth.currentUser) return
                  await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
                  toast.success('Google linked')
                } catch (err: any) {
                  if (err?.code !== 'auth/popup-closed-by-user') {
                    toast.error(err?.message ?? 'Failed to link Google')
                  }
                }
              }}
            >
              Add Google
            </Button>
          )}
          {!hasPassword && (
            <Button
              variant="outline"
              onClick={() => {
                const pwd = prompt('Choose a password (min 6 characters)')
                if (!pwd || pwd.length < 6) return
                import('@/features/auth/link-account')
                  .then((m) => m.addPasswordToCurrentUser(pwd))
                  .then(() => toast.success('Password added'))
                  .catch((err: any) => toast.error(err?.message ?? 'Failed'))
              }}
            >
              Add password
            </Button>
          )}
        </div>
      </section>

      {/* Sessions */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Sessions</h2>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-sm font-medium">Sign out of this device</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Other signed-in devices stay active. To end all sessions, sign out
            on each device.
          </div>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={async () => {
              await signOutEverywhere()
              nav('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </section>

      {/* Local data */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Local data</h2>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cached records</span>
            <span className="font-medium">{cached}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Pending syncs</span>
            <span className={`font-medium ${pending > 0 ? 'text-warning' : ''}`}>{pending}</span>
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full"
            disabled={pending > 0}
            onClick={() => setClearCacheOpen(true)}
          >
            Clear local cache
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Firestore keeps everything. This only removes the device cache.
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-destructive">Danger zone</h2>
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-left hover:bg-destructive/10"
        >
          <div>
            <div className="text-sm font-medium text-destructive">Delete account</div>
            <div className="text-xs text-muted-foreground">
              Permanently deletes your business and all its data.
            </div>
          </div>
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </section>

      {/* Dialogs */}
      {unlinkTarget && (
        <UnlinkDialog
          providerId={unlinkTarget.id}
          providerLabel={unlinkTarget.label}
          email={unlinkTarget.email}
          open
          onOpenChange={(o) => !o && setUnlinkTarget(null)}
          onSuccess={() => { /* useIdTokenChanged refreshes */ }}
        />
      )}

      <DeleteAccountDialog
        businessId={businessId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => nav('/signup', { replace: true })}
      />

      <Dialog open={clearCacheOpen} onOpenChange={setClearCacheOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear local cache?</DialogTitle>
            <DialogDescription>
              The device will re-download everything from Firestore on the next sync.
              Nothing is deleted from the cloud.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearCacheOpen(false)}>Cancel</Button>
            <Button onClick={onClearCache}>Clear cache</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
