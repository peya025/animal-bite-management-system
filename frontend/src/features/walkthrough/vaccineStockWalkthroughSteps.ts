import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export function getVaccineStockSteps(role?: string): WalkthroughStep[] {
  const steps: WalkthroughStep[] = [];
  const hasSetup = role === 'admin' || role === 'developer';

  // ── 1. Vaccine Setup Submodule (Admin & Developer Only) ──
  if (hasSetup) {
    steps.push(
      {
        id: 'vax-setup-overview',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Vaccine Setup',
        content:
          'Configure approved rabies vaccines, immunoglobulins, and tetanus toxoids used in the clinic.',
        targetSelector: 'main.page-content, .page-content',
        fallbackSelector: 'main.page-content',
        placement: 'bottom',
      },
      {
        id: 'vax-setup-add-btn',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Add Vaccine Type',
        content:
          'Add a new vaccine brand with its category, dose volume, doses per vial, and storage rules.',
        targetSelector:
          '[data-walkthrough="vax-setup-add-btn"], [data-tour="vax-setup-add-btn"]',
        fallbackSelector: 'main.page-content',
        placement: 'bottom',
      },
      {
        id: 'vax-setup-filters',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Search & Category Filters',
        content:
          'Search vaccine brands by name or filter by ARV, RIG, Tetanus, or ATS category.',
        targetSelector:
          '[data-walkthrough="vax-setup-filter-bar"], [data-tour="vax-setup-filter-bar"]',
        fallbackSelector: 'main.page-content',
        placement: 'bottom',
      },
      {
        id: 'vax-setup-cards',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Vaccine Catalog Cards',
        content:
          'View registered brands, vial dose format, post-opening validity, and edit or archive options.',
        targetSelector:
          '[data-walkthrough="vax-setup-cards-grid"], [data-tour="vax-setup-cards-grid"], .MuiCard-root',
        fallbackSelector: 'main.page-content',
        placement: 'top',
      }
    );
  }

  // ── 2. Vaccine Inventory Submodule (Top-to-Bottom, Left-to-Right) ──
  steps.push({
    id: 'vax-inv-btn-forecast',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Vial Forecast',
    content:
      'View projected daily follow-up dose demand to plan how many vials to prepare and prevent stockouts.',
    targetSelector:
      '[data-walkthrough="vax-inv-btn-forecast"], [data-tour="vax-inv-btn-forecast"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-inv-btn-stockcard',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Stock Card',
    content:
      'Open the DOH vial ledger to review beginning balances, deliveries, disbursements, and current stock.',
    targetSelector:
      '[data-walkthrough="vax-inv-btn-stockcard"], [data-tour="vax-inv-btn-stockcard"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  if (hasSetup) {
    steps.push({
      id: 'vax-inv-btn-add-batch',
      module: 'Vaccine Stock Management',
      section: 'Vaccine Inventory',
      route: ROUTES.INVENTORY.LIST,
      title: 'Add Stock Batch',
      content:
        'Record new vaccine deliveries with brand, lot number, supplier, expiration date, and vial count.',
      targetSelector:
        '[data-walkthrough="vax-inv-btn-add-batch"], [data-tour="vax-inv-btn-add-batch"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    });
  }

  steps.push({
    id: 'vax-inv-btn-refresh',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Refresh Stock',
    content:
      'Reload real-time stock balances, active vials, and cold-chain counts.',
    targetSelector:
      '[data-walkthrough="vax-inv-btn-refresh"], [data-tour="vax-inv-btn-refresh"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-inv-summary-cards',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Inventory Summary Cards',
    content:
      'Track Available Vials, Active Batches, Expiring Soon (within 30 days), and Opened Vials.',
    targetSelector:
      '[data-walkthrough="vax-inv-summary-cards"], [data-tour="vax-inv-summary-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-inv-filter-bar',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Search & Inventory Filters',
    content:
      'Filter batches by brand, category, lot number, status, supplier, or expiration date.',
    targetSelector:
      '[data-walkthrough="vax-inv-filter-bar"], [data-tour="vax-inv-filter-bar"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-inv-batches-table',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Inventory Batches & FIFO',
    content:
      'View all batches in storage. Use green "Use first" batches first (FEFO/FIFO) and manage stock actions per row.',
    targetSelector:
      '[data-walkthrough="vax-inv-batches-table"], [data-tour="vax-inv-batches-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  });

  // ── 3. Inventory Transactions Submodule ──
  steps.push({
    id: 'vax-tx-btn-stockcard',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Stock Card',
    content:
      'Open the DOH vial ledger to check deliveries, clinical disbursements, and running vial balances.',
    targetSelector:
      '[data-walkthrough="vax-tx-btn-stockcard"], [data-walkthrough="vax-inv-btn-stockcard"], [data-tour="vax-inv-btn-stockcard"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-tx-refresh',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Refresh Transactions',
    content:
      'Reload the latest vaccine deductions and newly recorded patient doses.',
    targetSelector:
      '[data-walkthrough="vax-tx-btn-refresh"], [data-walkthrough="vax-inv-btn-refresh"], [data-tour="vax-inv-btn-refresh"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-tx-summary-cards',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Administration Summary Cards',
    content:
      'Track Total Doses Administered, Doses Administered Today, and Total Patients Served.',
    targetSelector:
      '[data-walkthrough="vax-tx-summary-cards"], [data-tour="vax-tx-summary-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-tx-filter-bar',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Search & Transaction Filters',
    content:
      'Filter records by patient name, case ID, vaccine brand, dose schedule, or date range.',
    targetSelector:
      '[data-walkthrough="vax-tx-filter-bar"], [data-tour="vax-tx-filter-bar"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  steps.push({
    id: 'vax-tx-table',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Administration Log Table',
    content:
      'Review every administered dose with patient details, bite category, batch lot, vial usage, and staff.',
    targetSelector:
      '[data-walkthrough="vax-tx-table"], [data-tour="vax-tx-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  });

  return steps;
}
