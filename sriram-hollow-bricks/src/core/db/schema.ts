import Dexie, { type Table } from 'dexie'

// ---------- Local-only sync metadata ----------

export type SyncState = 'synced' | 'pending' | 'error'

export interface SyncMeta {
  _syncState: SyncState
  _localUpdatedAt: number
  _lastError?: string
}

// ---------- Entities ----------

export interface DbBusiness {
  id: string
  ownerUid: string
  name: string
  phone?: string
  address?: string
  gstin?: string
  createdAt: number
  _syncState: SyncState
  _localUpdatedAt: number
}

export interface DbCustomer extends SyncMeta {
  id: string
  businessId: string
  name: string
  phone?: string
  address?: string
  outstanding: number
  createdAt: number
  updatedAt: number
}

export interface DbProduct extends SyncMeta {
  id: string
  businessId: string
  name: string
  unit: string
  price: number
  category?: string
  isActive: boolean
  createdAt: number
}

export interface DbLineItem {
  productId: string
  name: string
  unit: string
  qty: number
  price: number
  total: number
}

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE'

export interface DbInvoice extends SyncMeta {
  id: string
  businessId: string
  customerId: string
  customerName: string
  invoiceNumber: string
  lineItems: DbLineItem[]
  subtotal: number
  discount: number
  total: number
  paidAmount: number
  balance: number
  status: InvoiceStatus
  issuedAt: number
  notes?: string
}

export interface DbPayment extends SyncMeta {
  id: string
  businessId: string
  invoiceId: string
  amount: number
  method: PaymentMethod
  date: number
  note?: string
  isCancelled: boolean
  cancelledReason?: string
}

export interface DbExpense extends SyncMeta {
  id: string
  businessId: string
  category: string
  amount: number
  method: PaymentMethod
  date: number
  note?: string
}

export type EntityName =
  | 'businesses'
  | 'customers'
  | 'products'
  | 'invoices'
  | 'payments'
  | 'expenses'

export type OutboxOp = 'upsert' | 'delete'

export interface OutboxEntry {
  id?: number
  key: string
  entity: EntityName
  entityId: string
  businessId: string
  op: OutboxOp
  payload?: Record<string, unknown>
  createdAt: number
  attempts: number
  status: 'pending' | 'failed'
  lastError?: string
}

export interface DbSettings {
  businessId: string
  invoicePrefix: string
  lastInvoiceNumber: number
}

// ---------- Database ----------

export class AppDb extends Dexie {
  businesses!: Table<DbBusiness, string>
  customers!: Table<DbCustomer, string>
  products!: Table<DbProduct, string>
  invoices!: Table<DbInvoice, string>
  payments!: Table<DbPayment, string>
  expenses!: Table<DbExpense, string>
  outbox!: Table<OutboxEntry, number>
  settings!: Table<DbSettings, string>

  constructor() {
    super('sriram-hollow-bricks')

    // Version 1: initial schema
    this.version(1).stores({
      businesses: 'id, ownerUid',
      customers: 'id, businessId, [businessId+name], phone, _syncState',
      products: 'id, businessId, [businessId+name], isActive, category, _syncState',
      invoices: 'id, businessId, customerId, [businessId+issuedAt], status, _syncState',
      payments: 'id, businessId, invoiceId, [businessId+date], _syncState',
      expenses: 'id, businessId, category, [businessId+date], _syncState',
      outbox: '++id, key, businessId, status, createdAt',
    })

    // Version 2: add settings table (local-only invoice counter)
    this.version(2).stores({
      settings: 'businessId',
    })

    // Version 3: re-declare ALL tables. Fixes a schema mismatch that 
    // caused Dexie to silently delete the database on every open.
    this.version(3).stores({
      businesses: 'id, ownerUid',
      customers: 'id, businessId, [businessId+name], phone, _syncState',
      products: 'id, businessId, [businessId+name], isActive, category, _syncState',
      invoices: 'id, businessId, customerId, [businessId+issuedAt], status, _syncState',
      payments: 'id, businessId, invoiceId, [businessId+date], _syncState',
      expenses: 'id, businessId, category, [businessId+date], _syncState',
      outbox: '++id, key, businessId, status, createdAt',
      settings: 'businessId',
    })

    // ---- Diagnostics: log when the DB is created or deleted ----

    this.on('populate', () => {
      console.warn(
        '[Dexie] Database was EMPTY and is being populated. ' +
        'If you see this on every refresh, the DB is being deleted.'
      )
    })

    this.on('versionchange', (event) => {
      console.warn(
        '[Dexie] versionchange event:',
        'oldVersion=', (event as any).oldVersion,
        'newVersion=', (event as any).newVersion
      )
    })

    this.on('blocked', () => {
      console.error(
        '[Dexie] Database open was BLOCKED by another tab. ' +
        'Close other tabs running this app.'
      )
    })
  }
}

export const db = new AppDb()
