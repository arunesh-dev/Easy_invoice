# Roadmap — Sriram Hollow Bricks PWA

Six milestones. Each one ships a **working vertical slice** — no half-built features.

---

## M0 — Foundation (Week 1)

**Goal:** runnable PWA with auth and empty dashboard.

- [ ] Scaffold Vite + React + TS + Tailwind + shadcn/ui
- [ ] Set up Firebase project, `.env.local`, Firestore, Auth, Storage
- [ ] Deploy initial Firestore + Storage rules
- [ ] Configure `vite-plugin-pwa` (manifest, service worker, offline fallback)
- [ ] Set up React Router v7 with protected routes
- [ ] Set up React Query + Zustand + Sonner toasts
- [ ] App shell: bottom nav (mobile), sidebar (desktop)
- [ ] Theme (light/dark) + Inter font
- [ ] Login + Sign up pages
- [ ] Business profile creation on first login
- [ ] Empty Dashboard page
- [ ] Deploy to Firebase Hosting
- [ ] Lighthouse PWA score ≥ 90 on the empty app

**Done when:** you can sign up, create a business, install the PWA, and see an empty dashboard.

---

## M1 — Customers & Products (Week 2)

**Goal:** master data in place.

- [ ] Dexie schema + `outbox` table
- [ ] `Customer` model + repository + hook
- [ ] Customer list with search
- [ ] Customer detail page
- [ ] Add / Edit customer form (RHF + Zod)
- [ ] `Product` model + repository
- [ ] Product list, add, edit, activate/deactivate
- [ ] Vitest unit tests for Customer + Product repositories
- [ ] Manual QA: customers + products checklist

**Done when:** you can fully manage customers and products, online and offline.

---

## M2 — Invoices (Week 3)

**Goal:** create and view invoices with correct totals.

- [ ] `Invoice` + `LineItem` models
- [ ] Invoice number counter (Firestore transaction)
- [ ] Create Invoice page (customer combobox, product picker, qty/price)
- [ ] Live total calculation
- [ ] Save invoice (Dexie → outbox → Firestore)
- [ ] Invoice list with status filter
- [ ] Invoice detail page
- [ ] **Unit tests for total calculation — highest priority**
- [ ] Empty / loading / error states for all invoice screens

**Done when:** you can create an invoice and see correct totals in list and detail.

---

## M3 — Payments (Week 4)

**Goal:** close the money loop.

- [ ] `Payment` model + subcollection
- [ ] Record Payment page (amount, method, date, note)
- [ ] Overpayment prevention (UI + repository)
- [ ] Transactional write: payment + invoice `paidAmount` + `status` + customer `outstanding`
- [ ] Payment history on invoice detail
- [ ] Cancel payment (with reason) → rollback balances
- [ ] Unit tests: partial, full, overpay, cancel
- [ ] Manual QA: full invoice → payment → paid flow

**Done when:** recording a payment correctly updates the invoice and customer balance, even offline.

---

## M4 — Expenses & Analytics (Week 5)

**Goal:** business owner sees profit.

- [ ] `Expense` model + repository
- [ ] Add expense page (category, amount, method, date, note)
- [ ] Expense list with month grouping and filters
- [ ] Analytics engine: weekly / monthly income, expense, profit
- [ ] Dashboard metric tiles wired to real data
- [ ] Analytics page with Recharts bar chart
- [ ] Unit tests for week/month boundary and profit math
- [ ] Manual QA: verify totals against manual calculation

**Done when:** dashboard shows correct weekly and monthly profit.

---

## M5 — PDF, PWA Polish & Launch (Week 6)

**Goal:** production-ready PWA.

- [ ] PDF invoice template (jsPDF + autotable)
- [ ] Share via `navigator.share`, fallback download
- [ ] Offline banner + sync indicator
- [ ] Custom install prompt (after 2nd session)
- [ ] Update prompt (SW `registerType: 'prompt'`)
- [ ] Empty states, skeletons, error boundaries across all screens
- [ ] Accessibility pass (aria-labels, focus, keyboard nav, contrast)
- [ ] Dark theme pass
- [ ] Playwright E2E suite (10 scenarios)
- [ ] Lighthouse CI in GitHub Actions
- [ ] Deploy to Firebase Hosting with custom domain + HTTPS
- [ ] Privacy policy + terms pages

**Done when:** production URL passes full QA, Lighthouse ≥ 90 on PWA + Perf + A11y, and installs cleanly on Android + iOS.

---

## v2 Backlog (Post-launch)

- Staff accounts with roles (owner / manager)
- Push notifications (payment reminders)
- Yearly analytics + CSV/Excel export
- Inventory / stock tracking
- WhatsApp Business API integration
- Multi-business support
- Backup & restore (export all data as JSON)
- Hindi / Tamil localization
- Native wrapper via Capacitor (if Play Store presence needed)

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| iOS PWA limitations (no install prompt, push only 16.4+) | Feature parity gap | Show manual install guide; defer push to v2 |
| Offline writes lost on hard reload | Lost sale record | Dexie outbox survives reloads; test explicitly |
| Money rounding errors | Financial loss | Use `big.js` or paise-as-Int; unit tests |
| Service worker stale cache | Users on old version | `registerType: 'prompt'` + update toast |
| Safari IndexedDB eviction | Data loss on iOS | Keep Firestore as source of truth; sync fast |
| Scope creep (staff roles, inventory) | Delay v1 | Strict non-goals list in PRD |
| Firebase free tier limits | Service disruption | Monitor usage; upgrade plan if needed |
| Bundle size balloon | Slow first load | Route-based code splitting, Lighthouse budget in CI |

---

## Definition of Done (per milestone)

1. All tasks checked
2. Unit tests written and passing
3. Manual QA section for the milestone passes
4. Lighthouse scores maintained
5. Docs updated (PRD / ARCHITECTURE / DESIGN if changed)
6. Demo: run the milestone's "Done when" scenario end-to-end on a real phone (installed PWA)
