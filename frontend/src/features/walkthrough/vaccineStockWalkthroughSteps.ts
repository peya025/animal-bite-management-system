import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export function getVaccineStockSteps(role?: string): WalkthroughStep[] {
  const steps: WalkthroughStep[] = [];
  const hasSetup = role === 'admin' || role === 'developer';

  if (hasSetup) {
    steps.push({
      id: 'vax-setup',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.TYPES,
      title: 'Vaccine Setup & Catalog',
      content:
        'Configure vaccine presets, brand names, dosage volumes, standard doses per vial, dilution rules, and cold chain storage specifications.',
      targetSelector: 'main.page-content, .page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    });
  }

  steps.push(
    {
      id: 'vax-inventory',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'Vaccine Inventory Overview',
      content:
        'Summary cards display total vials in stock, active lots, opened vials nearing shelf-life limits, and low stock threshold alerts.',
      targetSelector: 'main.page-content, .inventory-stats-grid',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-batches',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'Vaccine Batches & Lot Management',
      content:
        'Track lot numbers, manufacturer expiration dates, remaining doses per batch, and log newly received vaccine shipments.',
      targetSelector: '.MuiTableContainer-root, .MuiTable-root, main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'top',
    },
    {
      id: 'vax-stock-cards',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'Stock Cards & Vial Ledger',
      content:
        'Inspect official DOH stock card ledgers recording beginning balances, receipts, clinical disbursements, and current vial balances.',
      targetSelector: '.MuiTabs-root, [role="tablist"], main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-fifo',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.LIST,
      title: 'FIFO Compliance Report',
      content:
        'Ensure First-In, First-Out stock rotation compliance so earlier-expiring vaccine batches are utilized before newer stock.',
      targetSelector: '.MuiTabs-root, [role="tablist"], main.page-content',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    },
    {
      id: 'vax-transactions',
      module: 'Vaccine Stock Management',
      route: ROUTES.INVENTORY.ADMINISTRATIONS,
      title: 'Inventory Transactions & Logs',
      content:
        'Audit real-time transaction logs, automatic stock deductions linked to administered doses, and manual inventory adjustments.',
      targetSelector: 'main.page-content, .transactions-container',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    }
  );

  return steps;
}
