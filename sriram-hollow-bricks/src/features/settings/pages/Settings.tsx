import { Button } from '@/components/ui/button'
import { logOut } from '@/features/auth/auth-api'
import { retryFailed } from '@/core/sync/outbox'
import { flushOutbox } from '@/core/sync/sync'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { exportBackup } from '@/features/backup/export'
import { importBackupFromFile, ImportError } from '@/features/backup/import'
import { useBusiness } from '@/features/auth/useBusiness'
import { useAuth } from '@/features/auth/useAuth'
import { addPasswordToCurrentUser } from '@/features/auth/link-account'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

export default function Settings() {
  const nav = useNavigate()
  const { businessId } = useBusiness()
  const { user } = useAuth()
  const [backing, setBacking] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  
  const isGoogleOnly = user?.providerData.every((p) => p.providerId === 'google.com')

  async function onExport() {
    if (!businessId) return
    setBacking(true)
    try {
      const result = await exportBackup(businessId)
      if (result === 'downloaded') toast.success('Backup downloaded')
      else if (result === 'shared') toast.success('Backup shared')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBacking(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file || !businessId) return

    setImporting(true)
    try {
      const counts = await importBackupFromFile(file, { currentBusinessId: businessId })
      toast.success(
        `Imported ${counts.customers} customers, ${counts.invoices} invoices, ` +
        `${counts.payments} payments, ${counts.expenses} expenses` +
        (counts.skipped ? ` (${counts.skipped} skipped)` : '')
      )
      await flushOutbox()
    } catch (err) {
      if (err instanceof ImportError) toast.error(err.message)
      else toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }
  return (
    <div className="safe-top px-4 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      
      <div className="mt-6 flex flex-col gap-3">
        {isGoogleOnly && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setPasswordOpen(true)}
          >
            Add a password
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => nav('/settings/account')}
        >
          Account & security
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => nav('/products')}>
          Products
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => nav('/analytics')}>
          Analytics
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onExport} disabled={backing || importing}>
          {backing ? 'Preparing…' : 'Export backup (JSON)'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onImportFile}
          className="hidden"
        />
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || backing}
          >
            {importing ? 'Importing…' : 'Import backup (JSON)'}
          </Button>
          <p className="text-xs text-muted-foreground px-2">
            Importing overwrites records with matching IDs. Back up first.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={async () => {
            await retryFailed()
            await flushOutbox()
            toast.success('Retrying sync')
          }}
        >
          Retry failed syncs
        </Button>
        <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => logOut()}>
          Sign out
        </Button>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a password</DialogTitle>
            <DialogDescription>
              Set a password for your account so you can sign in with your email even if you lose access to Google.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setPasswordBusy(true)
                try {
                  await addPasswordToCurrentUser(newPassword)
                  toast.success('Password added. You can now sign in with your email.')
                  setPasswordOpen(false)
                  setNewPassword('')
                } catch (err: any) {
                  toast.error(err.message ?? 'Failed to add password')
                } finally {
                  setPasswordBusy(false)
                }
              }}
              disabled={passwordBusy || newPassword.length < 6}
            >
              {passwordBusy ? 'Saving…' : 'Save password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
