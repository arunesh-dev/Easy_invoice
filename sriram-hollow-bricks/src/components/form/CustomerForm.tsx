import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { customerInputSchema, type CustomerInput } from '@/features/customers/schemas'

interface Props {
  defaultValues?: CustomerInput
  submitLabel: string
  onSubmit: (values: CustomerInput) => Promise<void> | void
  onCancel?: () => void
}

export function CustomerForm({ defaultValues, submitLabel, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof customerInputSchema>,
    unknown,
    z.output<typeof customerInputSchema>
  >({
    resolver: zodResolver(customerInputSchema),
    defaultValues: { name: '', phone: '', address: '', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register('name')} placeholder="e.g. Ramesh Kumar" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...register('phone')}
          placeholder="98765 43210"
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <textarea
          id="address"
          {...register('address')}
          rows={3}
          placeholder="Site or billing address"
          className="flex w-full rounded-xl border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
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
