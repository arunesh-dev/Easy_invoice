import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXPENSE_CATEGORIES, expenseInputSchema, type ExpenseInput } from '../schemas'
import { PAYMENT_METHODS } from '@/features/payments/schemas'

interface Props {
  defaultValues?: Partial<ExpenseInput>
  submitLabel: string
  onSubmit: (values: ExpenseInput) => Promise<void> | void
  onCancel?: () => void
}

export function ExpenseForm({ defaultValues, submitLabel, onSubmit, onCancel }: Props) {
  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof expenseInputSchema>,
    unknown,
    z.output<typeof expenseInputSchema>
  >({
    resolver: zodResolver(expenseInputSchema),
    defaultValues: {
      category: 'Raw materials',
      amount: 0,
      method: 'CASH',
      date: Date.now(),
      note: '',
      ...defaultValues,
    },
  })

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="category">Category *</Label>
        <select
          id="category"
          {...register('category')}
          className="flex h-10 w-full rounded-xl border bg-background px-3 text-base"
        >
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₹) *</Label>
          <Input
            id="amount" type="number" inputMode="decimal" min={0} step="0.01"
            {...register('amount')}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="method">Paid via *</Label>
          <select
            id="method"
            {...register('method')}
            className="flex h-10 w-full rounded-xl border bg-background px-3 text-base"
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date *</Label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <input
              type="date"
              max={todayIso}
              value={new Date(Number(field.value)).toISOString().slice(0, 10)}
              onChange={(e) => field.onChange(new Date(e.target.value).getTime())}
              className="flex h-10 w-full rounded-xl border bg-background px-3 text-base"
            />
          )}
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Input id="note" {...register('note')} maxLength={200} placeholder="Optional" />
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
