import { toast } from 'sonner'
import { BusinessForm } from '@/components/form/BusinessForm'
import { useBusinessMutations } from '../hooks'
import type { BusinessInput } from '../schemas'

export default function BusinessOnboarding() {
  const { create } = useBusinessMutations()

  async function onSubmit(values: BusinessInput) {
    try {
      await create(values)
      toast.success('Business created')
      // No navigate here. BusinessLayout will re-render automatically
      // because useBusiness() will now return the new businessId.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create business')
    }
  }

  return (
    <div className="safe-top mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Set up your business</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This appears on every invoice you generate.
      </p>
      <div className="mt-6">
        <BusinessForm submitLabel="Create business" onSubmit={onSubmit} />
      </div>
    </div>
  )
}
