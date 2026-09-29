import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { productInputSchema, type ProductInput } from '@/features/products/schemas'

const UNITS = ['piece', 'cft', 'load', 'kg', 'sqft']

interface Props {
  defaultValues?: Partial<ProductInput>
  submitLabel: string
  onSubmit: (values: ProductInput) => Promise<void> | void
  onCancel?: () => void
}

export function ProductForm({ defaultValues, submitLabel, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof productInputSchema>,
    unknown,
    z.output<typeof productInputSchema>
  >({
    resolver: zodResolver(productInputSchema),
    defaultValues: {
      name: '', unit: 'piece', price: 0, category: '', isActive: true,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Product name *</Label>
        <Input id="name" {...register('name')} placeholder="e.g. 8-inch hollow brick" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="unit">Unit *</Label>
          <select
            id="unit"
            {...register('unit')}
            className="flex h-10 w-full rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">Price (₹) *</Label>
          <Input
            id="price" type="number" inputMode="decimal" step="0.01" min="0"
            {...register('price')}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" {...register('category')} placeholder="e.g. Solid, Hollow" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border" />
        Active (visible when creating invoices)
      </label>

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
