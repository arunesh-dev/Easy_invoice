import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Phone, Pencil, Trash2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { useCustomer, useCustomerMutations } from '../hooks'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { customer, loading } = useCustomer(id)
  const { remove } = useCustomerMutations()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices')

  if (loading || !customer) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  async function onDelete() {
    try {
      await remove(customer!.id)
      toast.success('Customer deleted')
      nav('/customers', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setConfirmOpen(false)
    }
  }

  const waNumber = customer.phone?.replace(/\D/g, '')

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-1">
          <Button
            variant="ghost" size="icon" aria-label="Edit"
            onClick={() => nav(`/customers/${customer.id}/edit`)}
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {customer.name}?</DialogTitle>
                <DialogDescription>
                  This removes the customer and cannot be undone. Customers with invoices
                  cannot be deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={onDelete}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">{customer.name}</h1>
      {customer.phone && (
        <p className="mt-1 text-sm text-muted-foreground">{customer.phone}</p>
      )}

      {customer.phone && (
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${customer.phone}`}>
              <Phone className="mr-1 h-4 w-4" /> Call
            </a>
          </Button>
          {waNumber && (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://wa.me/91${waNumber}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <BalanceTile label="Invoiced" value={0} />
        <BalanceTile label="Paid" value={0} />
        <BalanceTile label="Outstanding" value={customer.outstanding} highlight />
      </div>

      {customer.address && (
        <div className="mt-6 rounded-2xl border bg-card p-4 text-sm">
          <div className="mb-1 text-xs text-muted-foreground">Address</div>
          <div className="whitespace-pre-wrap">{customer.address}</div>
        </div>
      )}

      <div className="mt-6 flex gap-1 rounded-xl bg-muted p-1 text-sm">
        {(['invoices', 'payments'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 capitalize transition-colors ${
              tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
        {tab === 'invoices' ? 'Invoices arrive in M2.' : 'Payments arrive in M3.'}
      </div>
    </div>
  )
}

function BalanceTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${highlight && value > 0 ? 'text-warning' : ''}`}>
        ₹{value.toLocaleString('en-IN')}
      </div>
    </div>
  )
}
