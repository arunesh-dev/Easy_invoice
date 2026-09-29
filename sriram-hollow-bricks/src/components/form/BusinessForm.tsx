import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { businessInputSchema, type BusinessInput } from '@/features/business/schemas'

interface Props {
  defaultValues?: Partial<BusinessInput>
  submitLabel: string
  onSubmit: (values: BusinessInput) => Promise<void> | void
  onCancel?: () => void
}

export function BusinessForm({ defaultValues, submitLabel, onSubmit, onCancel }: Props) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof businessInputSchema>,
    unknown,
    z.output<typeof businessInputSchema>
  >({
    resolver: zodResolver(businessInputSchema),
    defaultValues: { name: '', phone: '', address: '', gstin: '', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Business name *</Label>
        <Input id="name" {...register('name')} placeholder="Sriram Hollow Bricks" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" inputMode="tel" {...register('phone')} placeholder="98765 43210" />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <textarea
          id="address" rows={3} {...register('address')}
          placeholder="Site / office address"
          className="flex w-full rounded-xl border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="gstin">GSTIN</Label>
        <Input id="gstin" {...register('gstin')} placeholder="33ABCDE1234F1Z5" />
        {errors.gstin && <p className="text-xs text-destructive">{errors.gstin.message}</p>}
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
