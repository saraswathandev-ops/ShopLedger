# ShopLedger

## Stack

- Node.js with CommonJS, Express 4, and `body-parser` 1.x.
- Static HTML, CSS, and browser JavaScript in `public/`. Express also serves printable GST invoices.
- The app persists products, orders, Khata accounts, settlements, and audit entries in `data/db.json`.

## Module map

- `routes/customers.js` lists customers and records Khata settlements.
- `routes/orders.js` lists, retrieves, places, and cancels orders.
- `routes/products.js` serves the product catalog and active coupons.
- `routes/reports.js` serves dashboard and GST reconciliation reports, pricing previews, and admin export.
- `lib/coupons.js` normalizes and validates coupon codes and calculates discounts.
- `lib/dates.js` supplies today's date, normalizes date keys, and computes fiscal years.
- `lib/inventory.js` finds products, checks sellable quantities, handles stock and reservations, and summarizes inventory.
- `lib/invoice.js` recomputes invoice figures and renders printable HTML.
- `lib/ledger.js` manages Khata balances, order charges, reversals, and settlements.
- `lib/orders.js` adds, retrieves, lists, and cancels orders.
- `lib/pricing.js` calculates checkout subtotals, discounts, line GST, and totals.
- `lib/reports.js` builds dashboard summaries and compares saved order figures with invoice figures.
- `lib/store.js` reads and writes the JSON datastore and maintains the audit log.
- `lib/tax.js` resolves GST rates and splits GST into CGST and SGST.

## Commands

- Start the app from the repo root with `npm start`, which runs `node server.js`.
- Run tests from the repo root with `node --test`. The repo currently contains no tests.

## Rules

1. Write characterization tests before changing behaviour.
2. Change only the module(s) the ticket is about.
3. Tests must use in-memory data and must never read or write `data/db.json`.
4. Add no dependencies.
5. Make the smallest fix that works.

## Current ticket

- Checkout cannot sell the last sellable unit because `inventory.check()` rejects quantities equal to sellable stock.
- Cancelling an order never restores physical stock. `orders.cancel()` calls `inventory.release()`, which looks up `productId` while checkout stores `id`, and adjusts `reserved` without restoring `stock`.
- Allowed files for the fix are `lib/inventory.js` and `lib/orders.js` (only `cancel()`).
