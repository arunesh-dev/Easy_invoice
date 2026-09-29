import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signInWithGoogle } from '../auth-api'
import { toast } from 'sonner'
import { extractPendingLink, type PendingLink } from '../link-account'
import { LinkAccountDialog } from '../LinkAccountDialog'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      nav('/home', { replace: true })
    } catch (err: any) {
      toast.error(err.message ?? 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="safe-top mx-auto flex h-full max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Sriram Hollow Bricks</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage your business</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await signInWithGoogle()
            nav('/home', { replace: true })
          } catch (err: any) {
            // User closed the popup — not an error.
            if (err?.code === 'auth/popup-closed-by-user') {
              // no-op
            } else if (err?.code === 'auth/account-exists-with-different-credential') {
              const pending = extractPendingLink(err)
              if (pending) setPendingLink(pending)
              else toast.error('Account exists with a different method')
            } else {
              toast.error(err?.message ?? 'Google sign-in failed')
            }
          } finally {
            setBusy(false)
          }
        }}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <p className="text-center text-sm">
        No account? <Link to="/signup" className="text-primary underline">Sign up</Link>
      </p>

      {pendingLink && (
        <LinkAccountDialog
          pending={pendingLink}
          open={!!pendingLink}
          onOpenChange={(open) => !open && setPendingLink(null)}
          onSuccess={() => {
            setPendingLink(null)
            nav('/home', { replace: true })
          }}
        />
      )}
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  )
}
