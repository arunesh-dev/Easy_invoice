# Product Requirements Document — Sriram Hollow Bricks PWA

## 1. Problem

Small hollow-brick businesses run on notebooks and spreadsheets. This causes:

- Customers, invoices, payments, and expenses scattered across tools
- Manual invoice creation and error-prone totals
- Missed or miscalculated outstanding balances
- No single view of weekly / monthly income, expense, profit
- Risk of losing paper records
- No centralized, secure system designed for the hollow-brick workflow

## 2. Why a PWA (not native Android)

| Concern | PWA | Native Android |
|---|---|---|
| Install friction | Instant (URL → Add to Home Screen) | Play Store download |
| Update cycle | Instant on refresh | Store review delay |
| Works on iPhone, Android, desktop | Yes | Android only |
| Offline capability | IndexedDB + service worker | Room + SQLite |
| Push notifications | Yes (Android/Desktop; iOS 16.4+) | Yes |
| Cost to maintain | One codebase | One codebase per platform |
| Store discovery | None (link-based) | Play Store listing |

**Decision:** PWA. The owner shares one link, the app installs like a native app, and works on any phone the family uses.

## 3. Target User

**Primary persona — Business Owner**
- Runs a small-to-medium hollow-brick manufacturing/supply business
- Uses an Android or iPhone as their primary work device
- Comfortable with WhatsApp and UPI
- Not comfortable with accounting software

**Secondary persona — Store Manager (v2)**
- Records invoices and payments on behalf of the owner
- Needs restricted access

## 4. Goals

| # | Goal | Metric |
|---|---|---|
| G1 | Replace manual records | 100% of invoices, payments, expenses logged in-app |
| G2 | Reduce invoice creation time | < 30 seconds per invoice |
| G3 | Give instant financial visibility | Weekly & monthly profit visible in ≤ 2 taps |
| G4 | Never lose data | 0 record-loss incidents (Firestore + offline queue) |
| G5 | Prevent overpayment errors | System enforces paid ≤ invoice total |
| G6 | Install without friction | PWA install prompt shown after 2nd session |

## 5. User Stories

### Customers
- Add a customer with name, phone, address
- Edit or delete a customer
- Search customers by name or phone
- View a customer's invoice and payment history
- See each customer's outstanding balance

### Products
- Add products with name, unit, price, category
- Activate/deactivate products
- Edit prices without affecting past invoices

### Invoices
- Create an invoice by selecting a customer and adding products
- Set quantity and unit price per line item
- Auto-calculate line totals and grand total
- View a list of all invoices with status (Paid / Partial / Unpaid)
- Generate a PDF for any invoice
- Share PDF via native share sheet (`navigator.share`) or WhatsApp link

### Payments
- Record a payment against an invoice
- Choose a payment method (Cash, UPI, Bank, Cheque)
- See total paid and remaining balance
- Block payments exceeding remaining balance
- Cancel a payment (with reason)

### Expenses
- Record an expense with amount, category, date, method, notes
- View and filter expense history

### Analytics
- See weekly income, expenses, and profit
- See monthly income, expenses, and profit
- See total outstanding across all customers

### PWA
- Install app on home screen from a browser prompt
- Use the app offline (read cached data, queue writes)
- See an "Offline" banner when disconnected
- Auto-update to new version with a refresh prompt

## 6. Scope

### In scope (v1)
Auth · Business profile · Customers · Products · Invoices · Payments · Expenses · Weekly & monthly analytics · PDF invoices · Share · Offline-first · Installable PWA

### Out of scope (v1)
- Multi-user / staff roles
- Push notifications
- Inventory / stock tracking
- WhatsApp direct invoice sending (only share link)
- Yearly reports and Excel export
- iOS native app wrapper

### Future (v2+)
Roles · Push notifications · Yearly analytics · Inventory · WhatsApp Business API · Multi-business support

## 7. Non-Functional Requirements

- **Performance:** LCP < 2.5s, TTI < 3.5s on 4G mid-range Android, Lighthouse PWA ≥ 90
- **Offline:** app shell loads offline; cached data visible; queued writes sync on reconnect
- **Security:** Firestore rules restrict access to the owner's business only; HTTPS enforced
- **Privacy:** no third-party analytics SDKs in v1
- **Locale:** English (India) at launch; INR currency
- **Accessibility:** WCAG 2.1 AA, 48px touch targets, keyboard navigable, screen-reader labeled
- **Browser support:** last 2 versions of Chrome, Edge, Safari, Firefox; iOS Safari 16.4+

## 8. Assumptions & Constraints

- Owner has a phone with a modern browser
- Single business per user account in v1
- Firebase free tier (Spark) is sufficient for expected volume (<10k docs/business)
- No accountant-grade double-entry bookkeeping required
- iOS push notifications require iOS 16.4+ and Add to Home Screen (v2)
