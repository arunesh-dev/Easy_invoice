import { db, type DbInvoice } from '@/core/db/schema'
import { createCollectionPull } from '@/core/sync/createCollectionPull'
import { ensureCounterAtLeast } from './numbering'

function parseInvoiceSeq(invoiceNumber: string): number {
  const m = /(\d+)\s*$/.exec(invoiceNumber)
  return m ? parseInt(m[1], 10) : 0
}

export function startInvoicePull(businessId: string): () => void {
  return createCollectionPull({
    businessId,
    collectionName: 'invoices',
    table: db.invoices as any,
    onBatch: async (ids) => {
      let highest = 0
      for (const id of ids) {
        const inv = (await db.invoices.get(id)) as DbInvoice | undefined
        if (!inv) continue
        const seq = parseInvoiceSeq(inv.invoiceNumber)
        if (seq > highest) highest = seq
      }
      if (highest > 0) await ensureCounterAtLeast(businessId, highest)
    },
  })
}
