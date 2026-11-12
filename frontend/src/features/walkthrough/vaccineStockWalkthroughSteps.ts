import { ROUTES } from '../../shared/config/routes';
import type { WalkthroughStep } from './types';

export function getVaccineStockSteps(role?: string): WalkthroughStep[] {
  const steps: WalkthroughStep[] = [];
  const hasSetup = role === 'admin' || role === 'developer';

  // ── 1. Vaccine Setup Submodule (Admin & Developer Only) ──
  if (hasSetup) {
    steps.push(
      // Step 1: Vaccine Setup Overview
      {
        id: 'vax-setup-overview',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Vaccine Setup & Master Catalog',
        content:
          'Welcome to Vaccine Setup! This is the administrator master catalog where you configure all approved rabies vaccines, immunoglobulins, and tetanus toxoids used across the clinic.',
        targetSelector: 'main.page-content, .page-content',
        fallbackSelector: 'main.page-content',
        placement: 'bottom',
      },

      // Step 2: Add Vaccine Type Button
      {
        id: 'vax-setup-add-btn',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Add Vaccine Type',
        content:
          'Click "+ Add Vaccine Type" to register a new master vaccine. You can define the brand name, biological category (ARV, RIG, Tetanus), standard dose volume, doses per vial, dilution rules, and storage requirements.',
        targetSelector:
          '[data-walkthrough="vax-setup-add-btn"], [data-tour="vax-setup-add-btn"]',
        fallbackSelector: 'main.page-content',
        placement: 'bottom',
      },

      // Step 3: Search & Category Filter Bar
      {
        id: 'vax-setup-filters',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Search & Category Filters',
        content:
          'Easily find existing vaccine brands by typing the brand name, or filter by category: Anti-Rabies Vaccines (ARV), Rabies Immunoglobulins (RIG), Tetanus & Toxoids, or Anti-Tetanus Serum (ATS).',
        targetSelector:
          '[data-walkthrough="vax-setup-filter-bar"], [data-tour="vax-setup-filter-bar"]',
        fallbackSelector: 'main.page-content',
        placement: 'bottom',
      },

      // Step 4: Vaccine Type Catalog Cards
      {
        id: 'vax-setup-cards',
        module: 'Vaccine Stock Management',
        section: 'Vaccine Setup (Admin)',
        route: ROUTES.INVENTORY.TYPES,
        title: 'Vaccine Type Catalog Cards',
        content:
          'Each card displays a registered vaccine brand (e.g., Verorub, Vaxirab, Tetanus Toxoid). It shows whether it is a single-dose or multi-dose vial, validity after opening (e.g., 6 hours), and includes Edit and Archive buttons so administrators can update formulations or retire old brands.',
        targetSelector:
          '[data-walkthrough="vax-setup-cards-grid"], [data-tour="vax-setup-cards-grid"], .MuiCard-root',
        fallbackSelector: 'main.page-content',
        placement: 'top',
      }
    );
  }

  // ── 2. Vaccine Inventory Submodule (Separated Top Action Buttons) ──
  // Step: Stock Card Button
  steps.push({
    id: 'vax-inv-btn-stockcard',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Stock Card Ledger',
    content:
      'Click "Stock Card" to open the official DOH vial ledger. This tracks beginning balances, received deliveries, clinical disbursements, and current vial balances for each vaccine.',
    targetSelector:
      '[data-walkthrough="vax-inv-btn-stockcard"], [data-tour="vax-inv-btn-stockcard"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step: Add Stock Batch Button (Admin & Developer Only)
  if (hasSetup) {
    steps.push({
      id: 'vax-inv-btn-add-batch',
      module: 'Vaccine Stock Management',
      section: 'Vaccine Inventory',
      route: ROUTES.INVENTORY.LIST,
      title: 'Add Stock Batch',
      content:
        'Click "+ Add Stock Batch" to register newly delivered vaccine shipments into storage with brand, lot number, supplier, expiration date, and vial quantity.',
      targetSelector:
        '[data-walkthrough="vax-inv-btn-add-batch"], [data-tour="vax-inv-btn-add-batch"]',
      fallbackSelector: 'main.page-content',
      placement: 'bottom',
    });
  }

  // Step: Circular Refresh Button (beside Add Stock Batch)
  steps.push({
    id: 'vax-inv-btn-refresh',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Refresh Stock Counts',
    content:
      'Click this circular refresh button beside Add Batch to instantly reload real-time stock balances, active vials, and cold-chain status from the clinic database.',
    targetSelector:
      '[data-walkthrough="vax-inv-btn-refresh"], [data-tour="vax-inv-btn-refresh"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step: Summary Stat Cards
  steps.push({
    id: 'vax-inv-summary-cards',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Vaccine Inventory Summary Cards',
    content:
      'Four summary cards show key metrics: Available Vials (total sealed usable stock), Active Batches (number of active shipments), Expiring Soon (batches expiring within 30 days), and Opened Vials (multidose vials currently in use).',
    targetSelector:
      '[data-walkthrough="vax-inv-summary-cards"], [data-tour="vax-inv-summary-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step: Search & Multi-Filter Bar
  steps.push({
    id: 'vax-inv-filter-bar',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Search & Inventory Filters',
    content:
      'Easily filter batches: type a vaccine brand name, select a Category (ARV, RIG, Tetanus), search by Batch/Lot number, filter by Status (Active, Low Stock, Expiring), supplier, or expiration date range.',
    targetSelector:
      '[data-walkthrough="vax-inv-filter-bar"], [data-tour="vax-inv-filter-bar"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step: Inventory Batches Table & FIFO Tracking
  steps.push({
    id: 'vax-inv-batches-table',
    module: 'Vaccine Stock Management',
    section: 'Vaccine Inventory',
    route: ROUTES.INVENTORY.LIST,
    title: 'Inventory Batches Table & FIFO Priority',
    content:
      'This table lists every physical batch in clinic storage. Look for the green "Use first" badge—this indicates the earliest-expiring batch that must be used first under FEFO/FIFO guidelines. You can also view available vials, estimated patient capacity, expiration countdown, and click the three dots icon to adjust stock, view transactions, or mark vials opened.',
    targetSelector:
      '[data-walkthrough="vax-inv-batches-table"], [data-tour="vax-inv-batches-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  });

  // ── 3. Inventory Transactions Submodule (Step 11 onwards: Continuation of Vaccine Inventory) ──
  // Step 11: Stock Card Ledger Button
  steps.push({
    id: 'vax-tx-btn-stockcard',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Stock Card Ledger',
    content:
      'Click "Stock Card" to open the official DOH vial ledger. It records all beginning balances, received deliveries, clinical disbursements, and current vial balances for each vaccine.',
    targetSelector:
      '[data-walkthrough="vax-tx-btn-stockcard"], [data-walkthrough="vax-inv-btn-stockcard"], [data-tour="vax-inv-btn-stockcard"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step 12: Refresh Transaction Log (Image 1)
  steps.push({
    id: 'vax-tx-refresh',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Refresh Transaction Log',
    content:
      'Click this circular refresh button anytime to reload real-time vaccine deductions, newly administered patient doses, and stock usage logs from clinic consultations.',
    targetSelector:
      '[data-walkthrough="vax-tx-btn-refresh"], [data-walkthrough="vax-inv-btn-refresh"], [data-tour="vax-inv-btn-refresh"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step 12: Administration Summary Cards (Image 2)
  steps.push({
    id: 'vax-tx-summary-cards',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Administration Summary Cards',
    content:
      'Three summary cards track daily and overall vaccine usage: Total Doses Administered to patients, Doses Administered Today, and Total Patients Served.',
    targetSelector:
      '[data-walkthrough="vax-tx-summary-cards"], [data-tour="vax-tx-summary-cards"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step 13: Search & Transaction Filters (Image 3)
  steps.push({
    id: 'vax-tx-filter-bar',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Search & Transaction Filters',
    content:
      'Quickly filter dose records: search by patient name or case ID (#BC-...), choose a specific Vaccine brand, filter by Dose schedule (Day 0 to Boosters), or select a custom date range.',
    targetSelector:
      '[data-walkthrough="vax-tx-filter-bar"], [data-tour="vax-tx-filter-bar"]',
    fallbackSelector: 'main.page-content',
    placement: 'bottom',
  });

  // Step 14: Vaccine Administration Log Table (Image 4)
  steps.push({
    id: 'vax-tx-table',
    module: 'Vaccine Stock Management',
    section: 'Inventory Transactions',
    route: ROUTES.INVENTORY.ADMINISTRATIONS,
    title: 'Vaccine Administration Log Table',
    content:
      'A complete audit log of every vaccine dose given in the clinic. Displays the patient name, bite severity category, vaccine brand and batch lot number, dose number, vial usage, administration timestamp, and the responsible staff member.',
    targetSelector:
      '[data-walkthrough="vax-tx-table"], [data-tour="vax-tx-table"]',
    fallbackSelector: 'main.page-content',
    placement: 'top',
  });

  return steps;
}
