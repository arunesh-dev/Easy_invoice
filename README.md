# Sriram Hollow Bricks (PWA)

An installable, offline-first **Progressive Web App** for managing a hollow-brick business.
Replaces notebooks and spreadsheets with one secure, centralized app that works on any device.

---

## What it does

- Customer management (add, edit, search, history, outstanding balance)
- Product catalog (units, prices, categories, active/inactive)
- Invoice creation with automatic totals
- Payment tracking (multiple methods, overpayment prevention, cancellation)
- Expense tracking with categories
- Weekly / monthly income, expense, and profit analytics
- PDF invoice generation and native share sheet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5 |
| Framework | React 19 |
| Build | Vite 6 |
| Routing | React Router v7 |
| UI | Tailwind CSS 4 + shadcn/ui |
| Icons | Lucide React |
| State | Zustand (global) + React Query (server state) |
| Forms | React Hook Form + Zod |
| Backend | Firebase (Auth, Firestore, Storage) |
| Offline DB | Dexie (IndexedDB) |
| Service Worker | vite-plugin-pwa + Workbox |
| PDF | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Testing | Vitest, Testing Library, Playwright |
| Deploy | Firebase Hosting (or Vercel / Netlify) |

---

## PWA Features

- **Installable** on Android, iOS, and desktop (Add to Home Screen)
- **Offline-first** — reads from IndexedDB, queues writes
- **Auto-update** — new version prompts "Refresh to update"
- **Push notifications** (payment reminders — v2)
- **Lighthouse PWA score ≥ 90**

---

## Project Structure

```
src/
 ├── app/            # Router, providers, layouts
 ├── features/       # Feature-sliced modules
 │    ├── auth/
 │    ├── customers/
 │    ├── products/
 │    ├── invoices/
 │    ├── payments/
 │    ├── expenses/
 │    └── analytics/
 ├── core/           # Cross-cutting
 │    ├── firebase/  # Auth, Firestore, Storage clients
 │    ├── db/        # Dexie schema + repos
 │    ├── sync/      # Offline queue + sync engine
 │    ├── pdf/       # PDF generator
 │    └── utils/
 ├── components/     # Shared UI (shadcn-based)
 ├── hooks/
 ├── stores/         # Zustand stores
 └── main.tsx
public/
 ├── manifest.webmanifest
 ├── icons/          # 192, 512, maskable
 └── offline.html
```

---

## Getting Started

### Prerequisites
- Node.js 20 LTS
- pnpm (or npm)
- Firebase project with Auth (Email/Password), Firestore, Storage, Hosting

### Setup
```bash
pnpm install
cp .env.example .env.local   # fill in Firebase keys
pnpm dev                     # http://localhost:5173
```

### Firebase
```bash
firebase login
firebase use <your-project>
firebase deploy --only firestore:rules,storage
```

### Build & Preview
```bash
pnpm build
pnpm preview                 # test PWA + service worker locally
```

**Note:** Service workers require HTTPS in production. `localhost` works for dev.

---

## Environment Variables

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Docs

- [PRD.md](./PRD.md) — What we're building and for whom
- [ARCHITECTURE.md](./ARCHITECTURE.md) — How it's structured
- [DESIGN.md](./DESIGN.md) — Look and feel
- [TESTING.md](./TESTING.md) — How we verify it works
- [ROADMAP.md](./ROADMAP.md) — Build order
