# Testing — Sriram Hollow Bricks PWA

## 1. Strategy

Test pyramid target:

```
      E2E / Playwright        10%
    Component / Integration   30%
      Unit (logic + hooks)    60%
```

Because Firebase is the backend, most logic is tested at the **repository + hook** level with fake data sources. Firebase itself is covered by a small number of integration tests using the emulator suite.

## 2. Tooling

| Layer | Tools |
|---|---|
| Unit | Vitest, @testing-library/react, MSW (mocks) |
| Component | Testing Library, user-event |
| E2E | Playwright (Chromium, WebKit, Firefox) |
| Firebase integration | Firebase Emulator Suite |
| PWA audit | Lighthouse CI |
| Lint | ESLint, Prettier, TypeScript strict |
| CI | GitHub Actions |

## 3. Unit Tests

### Pure logic (highest priority)
- **Invoice totals**: subtotal, discount, total, balance
- **Payment rules**: overpayment rejected, partial → PARTIAL, full → PAID
- **Outstanding calculation**: invoices − payments − cancellations
- **Profit calculation**: income − expenses for week/month
- **Date bucketing**: week boundaries, month boundaries, timezone (IST)

A bug in totals loses money. These are tested first.

### Repositories
- DTO ↔ domain mapping
- Success / failure paths
- Transactional writes (invoice + payment + customer outstanding)

### Hooks (React Query)
- Use `@testing-library/react` + `QueryClientProvider`
- MSW mocks Firestore REST endpoints
- Test loading → data → error transitions

Example:
```ts
it('shows customers after load', async () => {
  render(<CustomerList />, { wrapper });
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByText('Ramesh')).toBeInTheDocument();
});
```

## 4. Offline & Sync Tests

Critical for a PWA — must simulate offline:

- **Outbox:** creating an invoice while offline enqueues it
- **Reconnect:** queued writes drain in order
- **Conflict:** server doc wins for LWW fields
- **Service worker:** app shell loads with network blocked
- **IndexedDB:** cache persists across "reloads" in tests

Use Playwright's `context.setOffline(true)`.

## 5. Component Tests

- `CurrencyInput` clamps and formats correctly
- `StatusBadge` renders correct color + text for each status
- `ConfirmDialog` blocks destructive action until confirmed
- `BottomNav` marks active tab
- `OfflineBanner` appears/hides based on `navigator.onLine`

## 6. E2E Tests (Playwright)

Test the money flows end-to-end against the Firebase emulator:

1. **Sign up → business setup → empty dashboard**
2. **Create customer → appears in list → search finds it**
3. **Create invoice (3 line items) → verify total → open detail**
4. **Record partial payment → status PARTIAL → record rest → PAID**
5. **Attempt overpayment → Save disabled, error shown**
6. **Cancel a payment → balance restored**
7. **Add expense → appears in list → analytics updated**
8. **Generate PDF → download or share triggered**
9. **Offline mode → create invoice → reconnect → invoice syncs**
10. **PWA install prompt appears after 2 sessions**

Run E2E on Chromium, WebKit (iOS Safari proxy), and Firefox.

## 7. PWA / Lighthouse Audits

Run in CI on every PR to `main`:

- **Lighthouse PWA score ≥ 90**
- Installable: manifest valid, icons present, SW registered
- Offline: app shell loads with network throttled to "Offline"
- Performance: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Accessibility: score ≥ 95

## 8. Device & Browser Matrix

| Browser | Version | Notes |
|---|---|---|
| Chrome Android | last 2 | primary target |
| Safari iOS | 16.4+ | PWA install, no `beforeinstallprompt` |
| Samsung Internet | last 2 | common on Android |
| Chrome Desktop | last 2 | dev + dashboard use |
| Edge Desktop | last 2 | corporate |
| Firefox Desktop | last 2 | fallback |

Test viewports: **360×640** (small phone), **390×844** (iPhone 14), **768×1024** (tablet), **1440×900** (desktop).

## 9. Manual QA Checklist (before every release)

- [ ] Sign up new account → business created
- [ ] Add customer with all fields
- [ ] Add product, deactivate it, confirm hidden in invoice builder
- [ ] Create invoice with 5 line items, verify total
- [ ] Generate PDF, share via native share sheet, open PDF
- [ ] Record partial payment → status PARTIAL
- [ ] Record remaining payment → status PAID
- [ ] Attempt overpayment → blocked
- [ ] Cancel a payment → balance restored
- [ ] Add expense in each category
- [ ] Verify weekly / monthly profit matches manual math
- [ ] Toggle airplane mode → banner appears, cached data visible
- [ ] Create invoice offline → reconnect → verify sync
- [ ] Install PWA on Android → opens standalone
- [ ] Install PWA on iOS → opens standalone
- [ ] Rotate device on every screen
- [ ] Test on 360px width
- [ ] Test with system font size = largest
- [ ] Test keyboard-only navigation
- [ ] Run Lighthouse → all green

## 10. CI Gates

Every PR must pass:
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (Vitest)
- Coverage on `core/` and `features/**/repository` ≥ 70%

Nightly:
- Playwright E2E against emulator
- Lighthouse CI
- Bundle size check (main chunk < 200KB gzipped)

## 11. Definition of Done

A feature is done when:
1. Code reviewed and merged
2. Unit tests cover happy path + 1 failure path
3. Manual QA checklist item passes
4. Lighthouse scores maintained
5. Relevant doc updated (PRD / ARCHITECTURE / DESIGN)
