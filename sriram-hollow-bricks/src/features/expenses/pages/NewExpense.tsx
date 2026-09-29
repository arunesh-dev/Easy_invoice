import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from '../components/ExpenseForm'
import { useExpenseMutations } from '../hooks'
import type { ExpenseInput } from '../schemas'

export default function NewExpense() {
  const nav = useNavigate()
  const { create } = useExpenseMutations()

  async function onSubmit(values: ExpenseInput) {
    try {
      await create(values)
      toast.success('Expense saved')
      nav('/expenses', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">New expense</h1>
      </div>
      <ExpenseForm submitLabel="Save expense" onSubmit={onSubmit} onCancel={() => nav(-1)} />
    </div>
  )
}
