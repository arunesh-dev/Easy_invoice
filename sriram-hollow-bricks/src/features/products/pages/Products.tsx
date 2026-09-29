import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useProducts } from '../hooks'

export default function Products() {
  const nav = useNavigate()
  const [includeInactive, setIncludeInactive] = useState(false)
  const { products, loading } = useProducts({ includeInactive })
  const [query, setQuery] = useState('')

  const filtered = query
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button size="sm" onClick={() => nav('/products/new')}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products"
          value={query} onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox" checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        Show inactive
      </label>

      {loading && <SkeletonList rows={3} />}

      {!loading && filtered.length === 0 && (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          {query ? 'No products match.' : 'No products yet — add your first.'}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => nav(`/products/${p.id}/edit`)}
              className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  {!p.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                  {p._syncState === 'pending' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Not yet synced" />
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {p.unit}{p.category ? ` · ${p.category}` : ''}
                </div>
              </div>
              <div className="ml-3 shrink-0 text-sm font-medium">
                ₹{p.price.toLocaleString('en-IN')}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
