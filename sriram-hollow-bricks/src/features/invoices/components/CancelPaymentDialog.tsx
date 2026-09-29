import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { usePaymentMutations } from '@/features/payments/hooks'
import { formatINR } from '@/core/money'
import type { DbPayment } from '@/core/db/schema'

interface Props {
  payment: DbPayment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CancelPaymentDialog({ payment, open, onOpenChange }: Props) {
  const { cancel } = usePaymentMutations()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function onConfirm() {
    if (reason.trim().length === 0) return toast.error('Enter a reason')
    setBusy(true)
    try {
      await cancel(payment.id, reason.trim())
      toast.success('Payment cancelled')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel payment of {formatINR(payment.amount)}?</DialogTitle>
          <DialogDescription>
            The invoice balance and customer outstanding will be restored.
            The payment stays in the history with a cancellation note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason *</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="e.g. Wrong invoice, bounced cheque"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep payment</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Cancelling…' : 'Cancel payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
