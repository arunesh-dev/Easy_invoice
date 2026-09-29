import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/form/CustomerForm'
import { useCustomer, useCustomerMutations } from '../hooks'
import type { CustomerInput } from '../schemas'

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { customer, loading } = useCustomer(id)
  const { update } = useCustomerMutations()

  useEffect(() => {
    if (!loading && !customer) {
      toast.error('Customer not found')
      nav('/customers', { replace: true })
    }
  }, [loading, customer, nav])

  async function onSubmit(values: CustomerInput) {
    if (!id) return
    try {
      await update(id, values)
      toast.success('Saved')
      nav(`/customers/${id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  if (loading || !customer) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Edit customer</h1>
      </div>
      <CustomerForm
        defaultValues={{
          name: customer.name,
          phone: customer.phone ?? '',
          address: customer.address ?? '',
        }}
        submitLabel="Save changes"
        onSubmit={onSubmit}
        onCancel={() => nav(-1)}
      />
    </div>
  )
}
