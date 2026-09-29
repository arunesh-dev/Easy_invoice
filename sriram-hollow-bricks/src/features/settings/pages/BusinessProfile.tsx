import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BusinessForm } from '@/components/form/BusinessForm'
import { useBusiness } from '@/features/auth/useBusiness'
import { useBusinessProfile, useBusinessMutations } from '@/features/business/hooks'
import type { BusinessInput } from '@/features/business/schemas'

export default function BusinessProfile() {
  const nav = useNavigate()
  const { businessId, loading: authLoading } = useBusiness()
  const { business, loading } = useBusinessProfile(businessId)
  const { update } = useBusinessMutations()

  async function onSubmit(values: BusinessInput) {
    if (!businessId) return
    try {
      await update(businessId, values)
      toast.success('Business profile saved')
      nav('/settings', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  if (authLoading || loading || !business) {
    return <div className="safe-top px-4 py-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Business profile</h1>
      </div>
      <BusinessForm
        defaultValues={{
          name: business.name,
          phone: business.phone ?? '',
          address: business.address ?? '',
          gstin: business.gstin ?? '',
        }}
        submitLabel="Save changes"
        onSubmit={onSubmit}
        onCancel={() => nav(-1)}
      />
    </div>
  )
}
