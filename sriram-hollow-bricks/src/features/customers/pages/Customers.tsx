import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useCustomers } from '../hooks'

export default function Customers() {
  const { customers, loading } = useCustomers()
  const [query, setQuery] = useState('')
  const nav = useNavigate()

  const filtered = query
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone?.includes(query)
      )
    : customers

  return (
    <div className="safe-top px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Button size="sm" onClick={() => nav('/customers/new')}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && <SkeletonList rows={3} />}

      {!loading && filtered.length === 0 && (
        <div className="mt-12 text-center text-sm text-muted-foreground">
          {query ? 'No customers match your search.' : 'No customers yet — add your first.'}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => nav(`/customers/${c.id}`)}
              className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  {c._syncState === 'pending' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Not yet synced" />
                  )}
                </div>
                {c.phone && (
                  <div className="truncate text-xs text-muted-foreground">{c.phone}</div>
                )}
              </div>
              {c.outstanding > 0 && (
                <div className="ml-3 shrink-0 text-sm font-medium text-warning">
                  ₹{c.outstanding.toLocaleString('en-IN')}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
