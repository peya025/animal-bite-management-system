# Stock Card Inventory History Redesign Plan

## Goal

Turn the Stock Card tab into a plain white, green-accented vaccine inventory history page. A nurse or admin should be able to choose a vaccine and batch, review real monthly stock movement and balances, then preview, print, or export the clinic's stock card. Keep the official stock card layout used in the preview and print output.

## Current implementation and constraints

- `frontend/src/features/inventory/pages/VaccineInventoryPage.tsx` hosts the Stock Card tab and passes inventory batches to `StockCardView`.
- `frontend/src/features/inventory/components/StockCardView/StockCardView.tsx` currently opens `StockCardFileManager` as the full page. It also contains `SingleStockCardTable`, which already fetches actual transactions but is not the component rendered by the tab.
- `frontend/src/features/inventory/components/StockCardView/StockCardFileManager.tsx` generates twelve `.scard` entries per year and fabricated 31-day activity. Its preview, CSV, print, and downloaded HTML all use those generated values. Replacing the file explorer UI alone would leave misleading records in place.
- `GET /inventory/{id}/transactions` in `backend/app/Http/Controllers/VaccineInventoryController.php` returns clinic-scoped batch transactions and the inventory item. Use this as the initial source of truth; evaluate a server-side monthly summary only if data volume or balance reconciliation requires it.
- Transaction types in the current schema are `received`, `used`, `adjusted`, `expired`, and `disposed`. The database has a `transferred` column, but no `transferred` transaction type. Do not treat disposal as transfer or assume all adjustments are dispensing. `adjusted` currently adds stock in the controller; zero-quantity vial status events are also logged.
- The action labeled as a PDF download currently saves an `.html` file. The redesign must either implement a real PDF or label the existing action accurately.

## Proposed page

1. Show a compact **Stock Card** heading and one-line description under the existing Vaccine Inventory breadcrumb.
2. Add dependent filters: **Vaccine**, **Batch**, and **Year**. Selecting a vaccine narrows the batch list; the inventory-table “View” action should preselect that batch. Default to the current year, with past years selectable from recorded transaction dates. Keep all months visible for the selected year; a month is chosen from the history table.
3. Show a batch summary with vaccine name, batch/lot number, formatted expiry date, current live balance, and the selected year's received, dispensed, transferred, expired, disposed, and adjustment totals where relevant. Label time ranges explicitly so a monthly total is never confused with the live balance.
4. Replace the file list with a **Stock Card History** table: Month, Opening Balance, Received, Dispensed, Transferred, Expired, Other Adjustments/Disposals, Closing Balance, and View. Include only months with recorded activity, plus the current month when useful; show an honest empty state for months or years without records. Use responsive table scrolling or a compact mobile layout.
5. The View action opens **Stock Card Preview** with vaccine, batch, month/year, and the clinic-format document. Put **Download CSV**, **Download PDF** (only if a real PDF exists), **Print**, and **Close** in a clear action bar. No `.scard` names, folder tree, storage meter, file search, grid/list switch, rename, delete, or “Add New File/Folder” controls appear in the user interface.

## Data and balance rules

- Fetch transactions when the selected batch changes, then group them by clinic-local calendar month and sort by transaction date plus a stable transaction ID tie-breaker. Handle timezone conversion consistently so a transaction near midnight lands in the intended clinic month.
- Define one shared transaction-to-stock-card mapping for the monthly table, preview, CSV, and print output. `received` adds stock; `used` dispenses; `expired` reduces stock; `disposed` is a separate removal; positive `adjusted` is an addition under the current backend rule. Zero-quantity status events do not affect totals. Show transfers only when the recorded transfer field or a supported backend workflow provides them.
- Derive each month's opening balance from earlier transactions, carry the closing balance into the next month, and reconcile the latest computed balance with `inventory.current_quantity`. If older data lacks a trustworthy opening transaction, expose an “Opening balance unavailable” or reconciliation state instead of displaying a fabricated number. Do not silently equate a month's closing balance with today's live quantity.
- Preserve recorded transaction dates, quantities, source/remarks, and batch identity. Generate blank calendar rows only as part of the printable clinic form; never generate fake stock movements or claim that every month has 31 logged entries.
- Format expiry as a clinic-local date, without raw ISO timestamps or an unintended day shift. Treat date-only values differently from UTC timestamps.
- Fetch historical batches as needed: the page currently requests only the first 200 inventory items, which may exclude older or archived batches. Keep clinic scoping and read permissions enforced by the backend.

## Implementation checklist

- [ ] Extract or replace the file manager with a focused Stock Card page; preserve the existing `?tab=stockcard` route and inventory-table deep link to a batch.
- [ ] Add vaccine, batch, and year selection with sensible defaults, loading/error/empty states, and accessible labels.
- [ ] Build one real-data monthly aggregation and balance calculation shared by the history table and all detailed outputs.
- [ ] Render the batch summary and monthly history table with correctly labeled movement categories and balances.
- [ ] Update the modal header and actions to Stock Card language while retaining the Republic of the Philippines/clinic header, vaccine, lot, expiry, and received/dispensed/transferred/expired columns in the printable document.
- [ ] Make CSV, preview, print, and downloadable document use the same transactions and totals. Provide a genuine PDF before exposing a “Download PDF” label; otherwise offer “Download printable stock card” for the existing HTML output.
- [ ] Remove file-management actions and sample-data generators from the user-facing path; verify no old file-manager entry point remains.
- [ ] Confirm historical and archived batches can be selected within the user's clinic.

## Acceptance checks

- [ ] A user can open Stock Card from Vaccine Inventory, change vaccine/batch/year, and open any month with recorded activity.
- [ ] Monthly totals and closing balances agree with underlying transactions; the latest balance reconciles with the batch inventory quantity or shows a clear discrepancy.
- [ ] Empty months and empty years show no invented transactions, files, or balances.
- [ ] CSV, preview, print, and download show the same vaccine, batch, month, transaction rows, and totals.
- [ ] Expiry and transaction dates display correctly around timezone boundaries; the printable stock card retains the clinic's required columns and header.
- [ ] The layout remains usable on desktop and narrow screens with keyboard-accessible filters, row actions, and modal controls.
- [ ] Frontend build passes, and the stock-card flow is manually checked against at least one real batch with receipts, dispensing, expiry/disposal, and a prior-year history when available.
