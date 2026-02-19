# Antigravity Vibecode — Grocery Retail Credit App (MASTER FILE)

This is the **single consolidated Markdown file** for direct use in VS Code / Vibecode agents.



---

## 01_MASTER_PROMPT.md

# MASTER PROMPT — Antigravity Vibecode Dev (Copy/Paste into your Agent)

You are a senior full-stack engineer building a production-ready **Grocery Retail Credit + Inventory + P&L** platform.

## Non-negotiables
- **Single source of truth** for customer balances: `CustomerLedger` entries.
- Inventory base unit for bulk goods: **KG** (even if sold as BAG).
- Must support **multi-branch** with branch-scoped inventory + consolidated reporting.
- Must produce **Daily Credit Control** and **Daily Stock Reconciliation** automatically.
- Must calculate **COGS** and **Profit & Loss** daily/monthly per branch.
- Must log an **audit trail** for all sensitive actions (credit limit changes, adjustments, transfers).

## Scope (MVP)
### Functional
1) POS Sales
- Product search + barcode scan (keyboard wedge scanner)
- Cart, discounts, taxes (configurable)
- Mixed payments: cash/mobile money/card + credit remainder
- Receipt generation + notification dispatch (SMS/WhatsApp/Email)

2) Customer Credit
- Customer profiles with credit limit
- Overdue rules:
  - 7d: reminder
  - 14d: warning
  - 21d: auto-block credit
- Credit approval workflow (Manager role)
- Ledger view with filters and export

3) Inventory Control
- Products with selling units: KG, BAG (bag sizes 25kg/50kg)
- Purchases can be in bags; inventory stored and deducted in KG
- Stock movements: purchase, sale, return, transfer, adjustment, wastage
- Daily reconciliation: expected vs physical count with variance alerts

4) Reporting
- Customer weekly and monthly expense reports (by product/category/date)
- Receivables aging (0–7, 8–30, 31–60, 60+)
- Inventory valuation and low-stock list
- **Profit & Loss** (Revenue, COGS, Gross Profit) daily & monthly

5) Notifications
- Message templates
- Reliable dispatch with retries
- Logs for delivery status

### Non-functional
- Security: role-based access, branch-level scoping
- Offline-friendly POS: cache products, queue transactions (nice-to-have)
- Performance: POS search < 200ms for 10k SKUs
- Observability: structured logs, error reporting

## Deliverables
- Repo structure: frontend, functions/backend, shared types
- Firestore rules (or SQL migrations)
- Cloud Functions endpoints + scheduled jobs
- UI pages + components
- Seed data + minimal admin setup
- Tests: unit tests for conversions/ledger, integration for sale flow

## Architecture (Firebase recommended)
- Firestore collections:
  - companies/{companyId}/branches/{branchId}/...
  - customers, products, inventory, sales, payments, ledger, stockMovements, reports, auditLogs
- Cloud Functions:
  - onSaleCreated -> write ledger + stock movements + notifications
  - onPaymentCreated -> write ledger + notifications
  - nightlyJobs -> stock reconciliation + credit control + daily P&L snapshot

## Implementation rules
- No balance updates without a ledger entry.
- Never mutate historical ledger entries; only append.
- Stock is changed only through `StockMovements` append + inventory aggregate update.
- BAG conversion:
  - kg = bags * bagSizeKg
  - price = kg * pricePerKg
- COGS:
  - cogs = kgSold * costPerKg (weighted average in MVP; FIFO later)

## Start now
Create:
1) Data model types (TS interfaces)
2) Firestore collection layout
3) Cloud Functions skeleton
4) POS flow (create sale) end-to-end
5) Unit conversion engine
6) Daily jobs skeleton with placeholders
Return a checklist of completed items and the next tasks.



---

## Offline Mode (Dead Zones) — Required

### Must work offline
- POS: scan/search (cached), cart, totals, KG/BAG conversion, create sale, record payment, print/offline receipt
- Customer lookup (cached)
- Queue: sales, payments, stock movements, notification jobs

### Local persistence
- Web: IndexedDB (Dexie) for product/customer cache + queue tables
- Mobile: SQLite for cache + queues

### Sync rules (idempotent)
- Every queued transaction includes `clientTxnId` = {deviceId}-{timestamp}-{random}
- Server/API must treat `clientTxnId` as an idempotency key:
  - if seen before → ignore duplicate
- Sync order: sales → payments → stock movements → notifications
- On sync conflicts:
  - credit limit exceeded → mark sale `NEEDS_REVIEW` or require partial cash
  - stock negative → allow but flag variance for manager reconciliation

### Offline credit safety modes
- STRICT (recommended): no credit sales while offline
- CONTROLLED: allow offline credit up to a small cap per customer/day
- OPEN: allow based on cached balance (highest risk)


---

## Smart Catalog + Buy Again

### Smart Catalog
- Categories/tabs: Daily Essentials, Fresh Produce, Household (configurable)
- Fast search + favorites + barcode

### Buy Again / Quick Reorder
- “Buy Again” button based on customer’s last 7/30 day basket
- Weekly list templates per customer (optional)


---

## Multi-Tenant / Multi-Branch (Postgres-first option)

If using PostgreSQL, implement **multi-tenant isolation**:
- `tenant_id` on every table
- Enforce isolation using **Row Level Security (RLS)** policies
- Central Admin can see all tenants; Branch Manager sees only branch rows

If using Firebase:
- Use `companyId` scoping in document paths + Firestore security rules:
  - users can only read/write within assigned companyId/branchIds


---

## 02_BUILD_PLAN_SPRINTS.md

# Build Plan — Sprints & Backlog (Developer Task List)

## Sprint 1 — Core POS + Products + Branches
- [ ] Auth (email/phone), RBAC roles: Owner, Manager, Cashier, Accountant
- [ ] Branch CRUD + user branch assignment
- [ ] Product CRUD (barcode, category, pricePerKg, costPerKg, selling units, bag sizes)
- [ ] POS UI: search/scan, cart, totals, taxes/discounts
- [ ] Create Sale: header + line items
- [ ] Receipt view

Acceptance:
- Cash sale works in < 10 seconds end-to-end
- Barcode scan adds product instantly

## Sprint 2 — Credit Ledger + Payments + Notifications
- [ ] Customer CRUD + credit limit approval
- [ ] CustomerLedger append-only engine
- [ ] Mixed payment: paid + credit remainder
- [ ] Payment recording (cash/mobile/card)
- [ ] Notification service abstraction (SMS/WhatsApp/Email)
- [ ] Templates + logs + retry queue

Acceptance:
- Customer balance changes only via ledger entries
- Customer receives message after sale/payment

## Sprint 3 — Inventory Control + Purchases + Transfers
- [ ] Inventory per branch (stockKg aggregate)
- [ ] StockMovements append-only + inventory updates
- [ ] Purchase receiving in BAG => KG conversion
- [ ] Transfers between branches (out + in)
- [ ] Returns + wastage + manual adjustments (Manager only)
- [ ] Low stock alerts

Acceptance:
- Every sale creates stock movement
- Bag purchase increases KG stock correctly

## Sprint 4 — Reports: Weekly/Monthly + Receivables Aging
- [ ] Customer weekly report generator (by date range)
- [ ] Customer monthly report generator
- [ ] Credit aging dashboard (0–7, 8–30, 31–60, 60+)
- [ ] Export PDF/Excel (server-side or client-side)
- [ ] Dashboard tiles: sales today, outstanding credit

Acceptance:
- Report numbers match ledger totals

## Sprint 5 — Profit & Loss + Daily Jobs (Control Layer)
- [ ] Daily P&L snapshot per branch:
  - Revenue, COGS, Gross Profit, Credit Sales, Cash Collected
- [ ] Monthly P&L aggregation
- [ ] Nightly credit control job:
  - reminders/warnings/blocking by days overdue
- [ ] Nightly stock reconciliation job:
  - compute expected closing; variance capture UI

Acceptance:
- Daily P&L matches sales line items and costPerKg
- Overdue customers auto-blocked on rule

## Sprint 6 — Hardening & Audit
- [ ] Audit logs for sensitive changes
- [ ] Firestore Security Rules or API authorization checks
- [ ] Backup/export strategy
- [ ] Performance tuning: product search indexing
- [ ] Automated tests + CI

Acceptance:
- Unauthorized user cannot see other branches
- All credit-limit changes are auditable



---

## 03_SCHEMA.md

# Database Schema (Firestore-first; includes SQL mapping)

## Firestore Collection Layout (suggested)
companies/{companyId}
  branches/{branchId}
    inventory/{productId}  (aggregate per product, per branch)
  products/{productId}
  customers/{customerId}
  sales/{saleId}
    items/{itemId}
  payments/{paymentId}
  customerLedger/{ledgerId}
  stockMovements/{movementId}
  dailyStockChecks/{checkId}
  reports/{reportId}  (dailyPnL, weeklyCustomer, monthlyCustomer, agingSnapshots)
  auditLogs/{logId}
  notificationLogs/{logId}

---

## Core Documents

### Product
- id
- name
- categoryId
- barcode (string, optional)
- baseUnit: "KG" | "PCS" | "L"
- sellingUnits: ["KG","BAG"] etc.
- bagSizeKg: 25 | 50 | null
- pricePerKg (number)
- costPerKg (number)  // MVP: weighted average
- isActive (bool)

### Branch
- id
- name
- location
- isActive

### Customer
- id
- name
- phone
- address
- creditLimit (number)
- status: "ACTIVE" | "BLOCKED"
- currentBalance (number) // derived cache; must be consistent with ledger
- lastPurchaseAt
- lastPaymentAt
- createdAt

### Sale (Header)
- id
- branchId
- customerId (nullable for walk-in)
- createdAt
- totalAmount
- paidAmount
- creditAmount
- paymentMethods: [{method, amount}]
- cashierUserId
- status: "COMPLETED" | "VOID"

### SaleItem
- productId
- nameSnapshot
- unitUsed: "KG" | "BAG" | "PCS"
- quantity
- kgCalculated (number, nullable for non-KG)
- unitPriceApplied
- lineTotal
- costPerKgSnapshot (for COGS stability)

### Payment
- id
- branchId
- customerId
- createdAt
- amount
- method: "CASH"|"MOBILE_MONEY"|"CARD"|"BANK"
- reference (txn id)

### CustomerLedger (Append-only)
- id
- customerId
- branchId
- createdAt
- type: "SALE"|"PAYMENT"|"ADJUSTMENT"|"VOID"
- amount   // SALE = +, PAYMENT = -
- balanceAfter
- referenceId (saleId or paymentId)
- note

### Inventory Aggregate (per branch per product)
- productId
- branchId
- stockKg  // for baseUnit KG items
- stockPcs // optional for PCS items
- updatedAt

### StockMovement (Append-only)
- id
- branchId
- productId
- createdAt
- type: "PURCHASE"|"SALE"|"RETURN"|"TRANSFER_OUT"|"TRANSFER_IN"|"ADJUSTMENT"|"WASTAGE"
- kgChange (positive/negative)
- referenceId
- userId
- note

### DailyStockCheck
- id
- branchId
- productId
- date (YYYY-MM-DD)
- openingKg
- expectedKg
- physicalKg
- varianceKg
- confirmedByUserId
- confirmedAt

### DailyPnL (Snapshot)
- id (branchId + date)
- branchId
- date (YYYY-MM-DD)
- revenue
- cogs
- grossProfit
- creditSales
- cashCollected
- createdAt

### AuditLog
- id
- createdAt
- userId
- action
- entityType
- entityId
- before (object)
- after (object)

### NotificationLog
- id
- createdAt
- channel: "SMS"|"WHATSAPP"|"EMAIL"
- to
- templateId
- status: "QUEUED"|"SENT"|"FAILED"
- providerResponse
- referenceType
- referenceId

---

## KG/BAG Conversion Rules
- If unitUsed == "BAG": kgCalculated = quantity * bagSizeKg
- Price: lineTotal = kgCalculated * pricePerKg
- Inventory: stockKg -= kgCalculated
- Purchases: stockKg += bagsPurchased * bagSizeKg

---

## SQL Mapping (if using PostgreSQL)
Tables:
- branches, users, roles
- products
- customers
- sales, sale_items
- payments
- customer_ledger
- inventories
- stock_movements
- daily_stock_checks
- daily_pnl
- audit_logs
- notification_logs

Key constraints:
- customer_ledger append-only (no UPDATE/DELETE except admin repair with audit)
- stock_movements append-only


---

## Offline Support (Client Queue + Sync Logs)

### Device (for idempotency)
devices/{deviceId}
- deviceId
- branchId
- lastSyncAt
- appVersion

### SyncLog
syncLogs/{syncId}
- deviceId
- clientTxnId
- type: SALE|PAYMENT|...
- status: APPLIED|DUPLICATE|FAILED
- appliedAt
- error

### Required fields on transactional docs
- clientTxnId (unique per device transaction)
- createdOffline (bool)
- createdOnDeviceAt (timestamp)


---

## Multi-Tenant Key (SQL)

If PostgreSQL:
- Add `tenant_id` (company/shop group) to every table
- Index `(tenant_id, branch_id, created_at)` for all transactional tables
- Use PostgreSQL RLS policies to enforce tenant isolation (recommended for SaaS)


---

## 04_UI_WIREFRAME_LIST.md

# UI Wireframe List (Pages + Key Components)

## Web Dashboard (Admin/Staff)
### 1) Login
- Phone/Email login
- Branch selection (if user has multiple)

### 2) POS (Cashier)
- Search bar + barcode input
- Product quick grid (favorites)
- Cart list
- Unit selector per item: KG / BAG / PCS
- Quantity input (supports decimals for KG)
- Totals: subtotal, discount, tax, total
- Payment panel:
  - paid now (cash/mobile/card)
  - credit remainder
- Confirm sale button
- Receipt modal (print + send)

### 3) Customers
- Customer list + search
- Create customer
- Set credit limit (Manager approval)
- Customer profile:
  - balance, limit, status
  - ledger tab
  - weekly/monthly report tab
  - action: block/unblock, adjust balance (with reason)

### 4) Inventory
- Inventory by branch (table)
- Receive purchase:
  - supplier, product, bags, bag size, cost
  - auto KG added
- Stock movements log
- Transfers between branches
- Adjustments/Wastage (Manager only)

### 5) Daily Controls
- **Daily Credit Control**
  - overdue list, days overdue, actions (remind, warn, block)
- **Daily Stock Check**
  - expected vs physical entry, variance alerts

### 6) Reports
- Sales: daily/weekly/monthly
- Receivables aging
- Inventory valuation & low stock
- **Profit & Loss**:
  - daily P&L per branch
  - monthly P&L consolidated

### 7) Settings
- Branches
- Users & roles
- Taxes/discount rules
- Notification channels (providers + templates)

## Mobile (Optional)
- Manager approvals (credit, adjustments)
- Quick reports


---

## Offline UX عناصر (Required)

- Connectivity badge: ONLINE / OFFLINE (Queue Mode)
- Queue counter: “Queued: N”
- Manual Sync button + Auto-sync on reconnect
- Sync errors view (per clientTxnId)
- Offline credit mode indicator (STRICT/CONTROLLED/OPEN)


---

## Smart Catalog + Buy Again (Customer App or POS)

- Catalog tabs: Daily Essentials / Fresh Produce / Household
- Buy Again button (last week / last month)
- Saved weekly list (optional)


---

## 05_NOTIFICATION_TEMPLATES.md

# Notification Templates (SMS / WhatsApp / Email)

## SALE_CONFIRMATION
Subject (Email): Receipt #{saleId} — {branchName}

Message:
Orbit Market — Purchase Confirmed
Customer: {customerName}
Branch: {branchName}
Total: {totalAmount}
Paid: {paidAmount} ({paidMethods})
Credit: {creditAmount}
New Balance Due: {newBalance}
Credit Available: {creditAvailable}
Date: {dateTime}

## PAYMENT_CONFIRMATION
Orbit Market — Payment Received
Amount: {amount} via {method}
New Balance Due: {newBalance}
Date: {dateTime}

## CREDIT_REMINDER_7D
Reminder: Your balance is {balance}. Please pay to continue using credit. Reply for payment options.

## CREDIT_WARNING_14D
Warning: Your balance is overdue ({daysOverdue} days). Credit may be blocked if not paid.

## CREDIT_BLOCKED_21D
Your credit has been temporarily blocked due to overdue balance. Please pay {balance} to re-enable.

## WEEKLY_EXPENSE_REPORT
This week ({from}–{to}) you spent {weeklyTotal} across {visits} visits.
Top items: {topItemsShort}

## MONTHLY_EXPENSE_REPORT
Monthly report ({month}): Total spent {monthlyTotal}. Visits: {visits}. Balance due: {balance}.


---

## 06_ACCEPTANCE_TESTS.md

# Acceptance Tests (Must Pass)

## POS + Units
1) Sell 2 KG rice at $0.80/kg => lineTotal = $1.60; stockKg reduced by 2.0
2) Sell 1 BAG rice (50kg) at $0.80/kg => lineTotal = $40.00; stockKg reduced by 50.0
3) Mixed payment: total 10, paid 3, credit 7:
   - sale recorded
   - ledger appended (+10)
   - payment entry optional (if paid now tracked separately)
   - customer balance increases by 7 (net) or by 10 then -3 depending design; must be consistent and documented

## Ledger Integrity
4) Customer balance must equal last ledger.balanceAfter
5) Attempt to edit/delete ledger entry must be denied (security rules)

## Inventory Integrity
6) Every sale item creates a stock movement (SALE) with negative kgChange
7) Purchase receiving in bags creates stock movement (PURCHASE) positive kgChange
8) Transfer out + transfer in both exist and net to zero company-wide

## Daily Credit Control
9) If last payment date is > 21 days and balance > 0 => status becomes BLOCKED
10) BLOCKED customers cannot checkout on credit

## P&L
11) Daily P&L revenue = sum(sales totals for the day)
12) Daily COGS = sum(item.kgCalculated * item.costPerKgSnapshot)
13) Gross profit = revenue - cogs

## Notifications
14) Sale triggers queued notification logs for enabled channels
15) Failed notifications retry up to N times and log provider response


---

## Offline Mode

16) Disable internet → complete 5 sales + 2 payments → all persisted locally
17) Restart app offline → queued transactions remain
18) Restore internet → sync → each clientTxnId applied once (no duplicates)
19) Re-sync same queue → server marks duplicates, no double ledger/stock
20) Offline STRICT: credit checkout is blocked while offline
21) Offline CONTROLLED: credit allowed only within offline cap per customer/day
