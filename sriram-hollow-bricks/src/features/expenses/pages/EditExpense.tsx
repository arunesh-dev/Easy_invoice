import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { ExpenseForm } from '../components/ExpenseForm'
import { useExpense, useExpenseMutations } from '../hooks'
import type { ExpenseInput } from '../schemas'

export default function EditExpense() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { expense, loading } = useExpense(id)
  const { update, remove } = useExpenseMutations()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (loading || !expense) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  async function onSubmit(values: ExpenseInput) {
    try {
      await update(id!, values)
      toast.success('Saved')
      nav('/expenses', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  async function onDelete() {
    try {
      await remove(id!)
      toast.success('Expense deleted')
      nav('/expenses', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setConfirmOpen(false)
    }
  }

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Edit expense</h1>
        </div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Delete">
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this expense?</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={onDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ExpenseForm
        defaultValues={{
          category: expense.category,
          amount: expense.amount,
          method: expense.method,
          date: expense.date,
          note: expense.note ?? '',
        }}
        submitLabel="Save changes"
        onSubmit={onSubmit}
        onCancel={() => nav(-1)}
      />
    </div>
  )
}
