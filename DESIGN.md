# Design — Sriram Hollow Bricks PWA

## 1. Design Principles

1. **Fast entry** — invoice in under 30 seconds, one hand, thumb-friendly.
2. **Money first** — every screen shows the number that matters.
3. **Forgiving** — confirm destructive actions, undo where possible.
4. **Readable in sunlight** — high contrast, no subtle grays for important text.
5. **Mobile-first, desktop-friendly** — designed for a 360px screen, scales to tablet/desktop.

## 2. Theme (Tailwind 4 + shadcn/ui)

### CSS variables (light)

```css
--background: 0 0% 100%;
--foreground: 20 14% 10%;
--primary: 14 65% 33%;          /* brick red */
--primary-foreground: 0 0% 100%;
--secondary: 105 15% 35%;
--muted: 20 30% 96%;
--muted-foreground: 20 8% 45%;
--destructive: 0 72% 51%;
--success: 142 71% 35%;
--warning: 27 96% 47%;
--border: 20 20% 90%;
--radius: 0.75rem;              /* 12px */
```

### Dark

```css
--background: 20 15% 8%;
--foreground: 20 20% 96%;
--primary: 14 90% 80%;
--primary-foreground: 14 80% 15%;
--muted: 20 10% 15%;
--border: 20 10% 20%;
```

### Typography

| Token | Size / Weight | Use |
|---|---|---|
| `text-4xl` | 36 / 400 | Big profit number |
| `text-2xl` | 24 / 500 | Page title |
| `text-lg` | 18 / 500 | Card title |
| `text-base` | 16 / 400 | Body, inputs (16px prevents iOS zoom) |
| `text-sm` | 14 / 400 | Secondary |
| `text-xs` | 12 / 500 | Badges |

Font: **Inter** (self-hosted, variable).

### Spacing & radius

- 4px grid: `p-2, p-3, p-4, p-6`
- Screen horizontal padding: `px-4` (16px)
- Cards: `rounded-2xl`, `shadow-sm`
- Buttons: `rounded-xl`
- Bottom sheets: `rounded-t-3xl`
- **All touch targets ≥ 44×44px** (Apple HIG) — prefer 48px

## 3. Component Inventory (shadcn/ui)

- `Button` (primary / secondary / ghost / destructive)
- `Input`, `Textarea`, `Select`, `Combobox` (customer/product picker)
- `CurrencyInput` (₹ prefix, `inputMode="decimal"`)
- `DatePicker` (react-day-picker)
- `Card`, `MetricTile`, `SectionHeader`
- `StatusBadge` (UNPAID / PARTIAL / PAID)
- `EmptyState`, `Skeleton`, `ErrorState`
- `ConfirmDialog`, `Sheet` (mobile), `Dialog` (desktop)
- `Toast` (Sonner)
- `BottomNav` (mobile), `Sidebar` (desktop ≥ 1024px)
- `PwaInstallPrompt`, `UpdatePrompt`, `OfflineBanner`

## 4. Navigation

### Mobile (< 768px)
Bottom nav with 5 tabs: **Home · Customers · Invoices · Expenses · More**
FAB (bottom-right, 56px) for the primary action of the current tab.

### Tablet / Desktop (≥ 1024px)
Left sidebar (240px) with the same items + labels.
Two-pane layouts: list on left, detail on right.
FAB becomes a button in the page header.

## 5. Screen Specs

### 5.1 Dashboard
- 3 `MetricTile` row: Income, Expenses, Profit (this week)
- Toggle: Week / Month
- "Outstanding" — top 5 customers, tap → detail
- "Recent invoices" — last 5, status badge visible
- Empty state for new users: "Create your first invoice"

### 5.2 Customer List
- Sticky search bar
- Alphabetical list; row: name, phone, outstanding (right-aligned, colored)
- FAB → Add customer
- Empty: "No customers yet — add your first"

### 5.3 Customer Detail
- Header: name, phone (tap-to-call `tel:` link), address
- Tabs: Invoices | Payments | Balance
- Balance card: total invoiced, total paid, outstanding
- FAB → New invoice for this customer

### 5.4 Create Invoice
- Customer picker (searchable combobox)
- Line items: add product → set qty (price prefilled, editable)
- Live subtotal, discount, total
- Notes
- Save → toast "Invoice #SRM-0042 created" with **Share PDF** action

### 5.5 Invoice Detail
- Header: number, date, status badge
- Customer block
- Line items table (scrollable on mobile)
- Totals block
- Payments section with running balance
- Actions: **Record Payment** (primary), **Share PDF**, **Cancel Invoice**

### 5.6 Record Payment
- Amount field (default = remaining balance, clamped)
- Method chips: Cash / UPI / Bank / Cheque
- Date picker (default today)
- Note (optional)
- Save → transactional update

### 5.7 Expenses
- List grouped by month
- Row: category icon, note, amount (red), date
- Filter chips: All / This week / This month / Custom
- FAB → Add expense

### 5.8 Analytics
- Week / Month / Year toggle
- Bar chart: income vs. expenses (Recharts)
- Profit card (big number)
- Category breakdown for expenses

### 5.9 PWA-specific UI
- **Install prompt:** custom banner after 2nd session, "Install for offline access"
- **Update prompt:** toast when new SW is ready → "Refresh"
- **Offline banner:** top of screen when `!navigator.onLine`
- **Sync indicator:** small dot in header showing pending outbox count

## 6. Web App Manifest

```json
{
  "name": "Sriram Hollow Bricks",
  "short_name": "Sriram",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFF8F5",
  "theme_color": "#8B3A1E",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "New Invoice", "url": "/invoices/new" },
    { "name": "New Customer", "url": "/customers/new" },
    { "name": "New Expense", "url": "/expenses/new" }
  ]
}
```

## 7. Motion

- Page transitions: 200ms fade + 8px slide
- Sheet slide-up: 250ms ease-out
- List item enter: 150ms fade
- Respect `prefers-reduced-motion`

## 8. Accessibility

- WCAG 2.1 AA contrast (4.5:1 body, 3:1 large)
- Every icon button has `aria-label`
- Status is never color-only (badge has text)
- Full keyboard navigation; visible focus rings
- `16px` minimum input font size (prevents iOS auto-zoom)
- Safe area insets respected: `env(safe-area-inset-bottom)` for bottom nav

## 9. Edge Cases

| Case | Handling |
|---|---|
| Long customer name | `truncate` in list, wrap in detail |
| Zero invoices | Empty state with CTA |
| Offline | Banner "Offline — changes will sync later" |
| Overpayment attempt | Field clamps + helper "Max ₹X" |
| Invoice with 20+ items | Scrollable, sticky totals |
| RTL | Use logical properties (`ms-`, `me-`, `ps-`, `pe-`) |
| iOS PWA | No `beforeinstallprompt` — show manual "Add to Home Screen" instructions |
| Slow network | Skeleton loaders, not spinners |
| Print | Dedicated print stylesheet for invoice PDF fallback |
