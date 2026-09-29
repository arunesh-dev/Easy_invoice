import { db } from '@/core/db/schema'
import { createCollectionPull } from './createCollectionPull'
import { startBusinessPull } from '@/features/business/pullBusiness'
import { startInvoicePull } from '@/features/invoices/pullInvoices'

/**
 * Starts Firestore → Dexie listeners for all collections owned by a business.
 *
 * Note: payments are NOT pulled here. Payments live under
 * businesses/{id}/invoices/{invoiceId}/payments, and Firestore rules cannot 
 * authorize a collectionGroup query that uses get() on the parent business.
 * Payments still push to Firestore normally via the outbox. Cross-device 
 * payment pulls are deferred to v1.1.
 */
export function startAllPulls(businessId: string): () => void {
  const stops: Array<() => void> = [
    startBusinessPull(businessId),
    startInvoicePull(businessId),

    createCollectionPull({
      businessId,
      collectionName: 'customers',
      table: db.customers as any,
    }),

    createCollectionPull({
      businessId,
      collectionName: 'products',
      table: db.products as any,
    }),

    createCollectionPull({
      businessId,
      collectionName: 'expenses',
      table: db.expenses as any,
    }),

    // INTENTIONALLY OMITTED: payments collection-group pull.
    // See header comment. Do not re-add without denormalizing ownerUid onto 
    // every payment document.
  ]

  return () => stops.forEach((s) => s())
}
