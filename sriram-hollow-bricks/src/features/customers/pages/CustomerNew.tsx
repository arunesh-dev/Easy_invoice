import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/form/CustomerForm'
import { useCustomerMutations } from '../hooks'
import type { CustomerInput } from '../schemas'

export default function CustomerNew() {
  const nav = useNavigate()
  const { create } = useCustomerMutations()

  async function onSubmit(values: CustomerInput) {
    try {
      const c = await create(values)
      toast.success(`Added ${c.name}`)
      nav(`/customers/${c.id}`, { replace: true })
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
        <h1 className="text-xl font-semibold">New customer</h1>
      </div>
      <CustomerForm submitLabel="Add customer" onSubmit={onSubmit} onCancel={() => nav(-1)} />
    </div>
  )
}
