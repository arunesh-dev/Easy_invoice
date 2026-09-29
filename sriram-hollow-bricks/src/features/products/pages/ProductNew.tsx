import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProductForm } from '@/components/form/ProductForm'
import { useProductMutations } from '../hooks'
import type { ProductInput } from '../schemas'

export default function ProductNew() {
  const nav = useNavigate()
  const { create } = useProductMutations()

  async function onSubmit(values: ProductInput) {
    try {
      await create(values)
      toast.success('Product added')
      nav('/products', { replace: true })
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
        <h1 className="text-xl font-semibold">New product</h1>
      </div>
      <ProductForm submitLabel="Add product" onSubmit={onSubmit} onCancel={() => nav(-1)} />
    </div>
  )
}
