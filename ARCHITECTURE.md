# Architecture — Sriram Hollow Bricks PWA

## 1. Overview

Feature-sliced React app with an **offline-first** data layer.
Firestore is the source of truth; IndexedDB is the read cache and write queue.

```
        ┌────────────────────────────────────┐
        │    React UI (Compose-equivalent)   │
        │   React Router · React Query · UI  │
        └────────────────┬───────────────────┘
                         │  (hooks / mutations)
        ┌────────────────▼───────────────────┐
        │        Feature Layer (hooks)       │
        │   useCustomers · useInvoices ...   │
        └────────────────┬───────────────────┘
                         │
        ┌────────────────▼───────────────────┐
        │         Repository Layer           │
        │   (business rules, transactions)   │
        └────┬────────────────────────┬──────┘
             │                        │
     ┌───────▼──────┐        ┌────────▼────────┐
     │  Dexie       │        │   Firestore     │
     │ (IndexedDB)  │◄──────►│   + Auth +      │
     │  cache+queue │  sync  │   Storage       │
     └──────────────┘        └─────────────────┘
```

## 2. Layers

| Layer | Responsibility | Must NOT |
|---|---|---|
| UI (React) | Render, emit events | Call Firestore directly |
| Hooks / React Query | Cache, orchestrate | Contain business rules |
| Repository | Business logic, transactions | Touch DOM or React |
| Data sources | Dexie + Firestore clients | Know about UI |
| Service Worker | App shell cache, offline fallback | Touch business data |
| Sync engine | Push queued writes, pull changes | Block UI |

## 3. Folder Structure (feature-sliced)

```
src/
 ├── app/
 │    ├── router.tsx
 │    ├── providers.tsx       # Firebase, React Query, Theme, Toaster
 │    └── layouts/
 ├── features/
 │    ├── auth/
 │    │    ├── components/
 │    │    ├── hooks/
 │    │    ├── repository.ts
 │    │    └── pages/
 │    ├── customers/
 │    ├── products/
 │    ├── invoices/
 │    ├── payments/
 │    ├── expenses/
 │    └── analytics/
 ├── core/
 │    ├── firebase/
 │    │    ├── client.ts
 │    │    ├── auth.ts
 │    │    ├── firestore.ts
 │    │    └── storage.ts
 │    ├── db/
 │    │    ├── schema.ts       # Dexie tables
 │    │    └── repos/
 │    ├── sync/
 │    │    ├── queue.ts        # outbox pattern
 │    │    └── sync.ts         # push + pull
 │    ├── pdf/
 │    │    └── invoice-pdf.ts
 │    └── utils/
 ├── components/ui/            # shadcn/ui
 ├── hooks/
 └── main.tsx
```

## 4. State Management

| Kind of state | Tool |
|---|---|
| Server data (Firestore) | **React Query** — cached, revalidated |
| Global UI (theme, auth user) | **Zustand** |
| Form state | **React Hook Form** + **Zod** |
| Local component state | `useState` / `useReducer` |
| Offline queue | **Dexie** table `outbox` |

Rules:
- One hook per feature exposing `useX()` and `useXMutation()`
- Never call Firestore directly from components
- React Query keys are arrays: `['customers', businessId]`

## 5. Data Model (Firestore)

```
users/{uid}
  - email, displayName, businessId

businesses/{businessId}
  - name, phone, address, gstin, ownerUid, createdAt

businesses/{businessId}/customers/{customerId}
  - name, phone, address, outstanding, createdAt, updatedAt

businesses/{businessId}/products/{productId}
  - name, unit, price, category, isActive, createdAt

businesses/{businessId}/invoices/{invoiceId}
  - customerId, customerName, invoiceNumber
  - lineItems: [{ productId, name, unit, qty, price, total }]
  - subtotal, discount, total, paidAmount, balance
  - status: UNPAID | PARTIAL | PAID
  - issuedAt, notes

businesses/{businessId}/invoices/{invoiceId}/payments/{paymentId}
  - amount, method, date, note, isCancelled, cancelledReason

businesses/{businessId}/expenses/{expenseId}
  - category, amount, method, date, note

businesses/{businessId}/settings/{docId}
  - invoicePrefix, defaultTaxRate, currency, invoiceCounter
```

**Design notes**
- `outstanding` on customer is denormalized for fast list rendering; recomputed inside a Firestore transaction on payment/invoice writes.
- Invoice `paidAmount` and `status` are derived from payments; written transactionally.
- Invoice numbers come from `settings/invoiceCounter` incremented in a transaction.

## 6. Offline-First Strategy

**Reads:** Firestore `enableIndexedDbPersistence` (or `enableMultiTabIndexedDbPersistence` for desktop) caches all reads. React Query additionally caches in memory.

**Writes:** All writes go through an **outbox** in Dexie:

```
outbox table:
  id, entity ('invoice' | 'payment' | ...),
  action ('create' | 'update' | 'delete'),
  payload, createdAt, attempts, status
```

Flow:
1. UI calls mutation → repository writes to Dexie immediately (optimistic) + enqueues in outbox
2. Sync engine runs on `online` event and every 30s
3. Push: drain outbox → Firestore; on success, remove
4. Pull: Firestore `onSnapshot` listeners push updates back into Dexie
5. Conflicts: last-write-wins per document (acceptable for single-user app)

**Service worker:** caches app shell (`index.html`, JS, CSS, fonts, icons).
Firestore SDK handles its own offline queue — the outbox is a safety net for
business transactions that must survive hard reloads.

## 7. Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function isOwner(businessId) {
      return request.auth != null &&
        get(/databases/$(db)/documents/businesses/$(businessId)).data.ownerUid == request.auth.uid;
    }

    match /businesses/{businessId} {
      allow read, write: if isOwner(businessId);
      match /{sub=**} {
        allow read, write: if isOwner(businessId);
      }
    }

    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

Storage rules: only `businesses/{businessId}/**` writable by owner.

## 8. Service Worker (vite-plugin-pwa)

```ts
VitePWA({
  registerType: 'prompt',        // show "Refresh to update" toast
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    navigateFallback: '/offline.html',
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com/,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'google-fonts' }
      },
      {
        urlPattern: /^https:\/\/firestore\.googleapis\.com/,
        handler: 'NetworkOnly'   // Firestore SDK does its own caching
      }
    ]
  },
  manifest: { /* see DESIGN.md */ }
})
```

## 9. PDF Generation

- Client-side with **jsPDF + jspdf-autotable**
- Build a single `InvoicePdf` component that takes `Invoice` + `Business` + `Customer`
- Output to Blob → `URL.createObjectURL`
- Share: `navigator.share({ files: [pdfFile] })` when supported, else download

## 10. Routing

React Router v7, lazy-loaded feature routes:

```
/login
/signup
/onboarding/business
/                     → redirect to /home
/home                 → dashboard
/customers
/customers/:id
/customers/new
/products
/invoices
/invoices/new
/invoices/:id
/invoices/:id/payments/new
/expenses
/expenses/new
/analytics
/settings
```

`/home` and above are wrapped in `<ProtectedRoute>` + `<AppShell>`.

## 11. Error Handling

- Firestore errors → typed `AppError` (Network, Auth, NotFound, Conflict, Unknown)
- React Query `onError` → toast + retry once on transient
- Error boundary at app root → friendly "Something went wrong" screen
- Offline banner shown when `navigator.onLine === false`

## 12. Performance

- Route-based code splitting (`React.lazy`)
- Tree-shake Firebase (import from `firebase/firestore/lite` if realtime not needed)
- Preconnect to `firestore.googleapis.com`
- `loading="lazy"` on all images
- Font: self-host Inter, `font-display: swap`
