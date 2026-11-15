import { test, expect } from '@playwright/test';
import {
  getAdminReportsSteps,
  getRegistrationReportsSteps,
  getDoctorReportsSteps,
  getTreatmentNurseReportsSteps,
  getReportsAnalyticsSteps,
} from '../../src/features/walkthrough/reportsAnalyticsWalkthroughSteps';

test.describe('Role-Based Reports & Analytics Interactive Walkthrough Audit & Verification', () => {
  test('1. Administrator Reports Walkthrough is comprehensive and covers all admin reporting features', () => {
    const steps = getAdminReportsSteps();
    expect(steps.length).toBeGreaterThanOrEqual(14);

    // Verify visual sequence
    const ids = steps.map(s => s.id);
    expect(ids).toContain('admin-reports-overview');
    expect(ids).toContain('admin-reports-tabs');
    expect(ids).toContain('admin-reports-filters');
    expect(ids).toContain('admin-reports-kpi-cards');
    expect(ids).toContain('admin-reports-overdue-card');
    expect(ids).toContain('admin-reports-vaccine-stock-card');
    expect(ids).toContain('admin-reports-trends-charts');
    expect(ids).toContain('admin-reports-clinic-records');
    expect(ids).toContain('admin-reports-doh-registry');
    expect(ids).toContain('admin-reports-doh-monthly');
    expect(ids).toContain('admin-reports-doh-cohort');
    expect(ids).toContain('admin-reports-patients-filters');
    expect(ids).toContain('admin-reports-patients-registry');
    expect(ids).toContain('admin-reports-inventory-kpis');
    expect(ids).toContain('admin-reports-inventory-patient-usage');
    expect(ids).toContain('admin-reports-inventory-audit-log');

    // Verify DOH and Inventory features are present
    expect(steps.some(s => s.section === 'DOH Submissions')).toBeTruthy();
    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeTruthy();

    // Verify all steps have non-empty targets and titles
    for (const step of steps) {
      expect(step.title).toBeTruthy();
      expect(step.content).toBeTruthy();
      expect(step.targetSelector).toBeTruthy();
    }
  });

  test('2. Registration Staff Reports Walkthrough only covers registration features and excludes admin-only features', () => {
    const steps = getRegistrationReportsSteps();
    expect(steps.length).toBeGreaterThanOrEqual(15);

    const ids = steps.map(s => s.id);
    expect(ids).toContain('reg-reports-overview');
    expect(ids).toContain('reg-reports-tabs');
    expect(ids).toContain('reg-reports-kpi-completion');
    expect(ids).toContain('reg-reports-kpi-priorities');
    expect(ids).toContain('reg-reports-kpi-delay');
    expect(ids).toContain('reg-reports-kpi-followup');
    expect(ids).toContain('reg-reports-surveillance-filters');
    expect(ids).toContain('reg-reports-chart-categories');
    expect(ids).toContain('reg-reports-chart-demographics');
    expect(ids).toContain('reg-reports-demographics');
    expect(ids).toContain('reg-reports-pep-outcomes');
    expect(ids).toContain('reg-reports-pep-overdue');
    expect(ids).toContain('reg-reports-pep-awaiting');
    expect(ids).toContain('reg-reports-surveillance-incidents');
    expect(ids).toContain('reg-reports-surveillance-referrals');
    expect(ids).toContain('reg-reports-clinic-summary');
    expect(ids).toContain('reg-reports-actions');

    // Ensure NO admin-only DOH or Vaccine Inventory steps
    expect(steps.some(s => s.section === 'DOH Submissions')).toBeFalsy();
    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeFalsy();
    expect(ids.some(id => id.includes('doh'))).toBeFalsy();
    expect(ids.some(id => id.includes('inventory'))).toBeFalsy();
  });

  test('3. Doctor Reports Walkthrough covers clinical reports and strictly excludes restricted inventory & DOH', () => {
    const steps = getDoctorReportsSteps();
    expect(steps.length).toBeGreaterThanOrEqual(9);

    const ids = steps.map(s => s.id);
    expect(ids).toContain('doctor-reports-overview');
    expect(ids).toContain('doctor-reports-tabs');
    expect(ids).toContain('doctor-reports-summary-filters');
    expect(ids).toContain('doctor-reports-kpi-cards');
    expect(ids).toContain('doctor-reports-category-cards');
    expect(ids).toContain('doctor-reports-cases-filters');
    expect(ids).toContain('doctor-reports-cases-table');
    expect(ids).toContain('doctor-reports-patients-filters');
    expect(ids).toContain('doctor-reports-patients-table');
    expect(ids).toContain('doctor-reports-print-action');

    // Ensure Doctor does NOT have Vaccine Inventory or DOH Submissions
    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeFalsy();
    expect(steps.some(s => s.section === 'DOH Submissions')).toBeFalsy();
    expect(ids.some(id => id.includes('inventory'))).toBeFalsy();
    expect(ids.some(id => id.includes('doh'))).toBeFalsy();

    // Verify physician print action exists
    const printStep = steps.find(s => s.id === 'doctor-reports-print-action');
    expect(printStep).toBeDefined();
    expect(printStep?.content).toContain('Physician');
  });

  test('4. Treatment Nurse Reports Walkthrough covers clinical + inventory reports and excludes DOH submissions', () => {
    const steps = getTreatmentNurseReportsSteps();
    expect(steps.length).toBeGreaterThanOrEqual(11);

    const ids = steps.map(s => s.id);
    expect(ids).toContain('nurse-reports-overview');
    expect(ids).toContain('nurse-reports-tabs');
    expect(ids).toContain('nurse-reports-summary-filters');
    expect(ids).toContain('nurse-reports-kpi-cards');
    expect(ids).toContain('nurse-reports-category-cards');
    expect(ids).toContain('nurse-reports-cases-filters');
    expect(ids).toContain('nurse-reports-cases-table');
    expect(ids).toContain('nurse-reports-patients-table');
    expect(ids).toContain('nurse-reports-inventory-filters');
    expect(ids).toContain('nurse-reports-inventory-kpis');
    expect(ids).toContain('nurse-reports-inventory-table');
    expect(ids).toContain('nurse-reports-print-action');

    // Treatment Nurse HAS Vaccine Inventory
    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeTruthy();
    // Treatment Nurse does NOT have DOH Submissions
    expect(steps.some(s => s.section === 'DOH Submissions')).toBeFalsy();

    // Verify nurse print sign-off
    const printStep = steps.find(s => s.id === 'nurse-reports-print-action');
    expect(printStep).toBeDefined();
    expect(printStep?.content).toContain('Nurse');
  });

  test('5. getReportsAnalyticsSteps dispatches correctly by role', () => {
    const adminSteps = getReportsAnalyticsSteps('admin');
    expect(adminSteps[0].id).toBe('admin-reports-overview');

    const devSteps = getReportsAnalyticsSteps('developer');
    expect(devSteps[0].id).toBe('admin-reports-overview');

    const regSteps = getReportsAnalyticsSteps('registration');
    expect(regSteps[0].id).toBe('reg-reports-overview');

    const triageSteps = getReportsAnalyticsSteps('triage');
    expect(triageSteps[0].id).toBe('doctor-reports-overview');

    const doctorSteps = getReportsAnalyticsSteps('doctor');
    expect(doctorSteps[0].id).toBe('doctor-reports-overview');

    const treatmentSteps = getReportsAnalyticsSteps('treatment');
    expect(treatmentSteps[0].id).toBe('nurse-reports-overview');

    const nurseSteps = getReportsAnalyticsSteps('nurse');
    expect(nurseSteps[0].id).toBe('nurse-reports-overview');
  });

  test('6. All four roles have distinct, tailored walkthrough step sequences', () => {
    const admin = getAdminReportsSteps().map(s => s.id);
    const reg = getRegistrationReportsSteps().map(s => s.id);
    const doc = getDoctorReportsSteps().map(s => s.id);
    const nurse = getTreatmentNurseReportsSteps().map(s => s.id);

    // None of the roles share identical step ids
    expect(admin).not.toEqual(reg);
    expect(admin).not.toEqual(doc);
    expect(admin).not.toEqual(nurse);
    expect(reg).not.toEqual(doc);
    expect(reg).not.toEqual(nurse);
    expect(doc).not.toEqual(nurse);
  });

  test('7. Admin Walkthrough separates action cards and targets full table containers with top clearance', () => {
    const steps = getAdminReportsSteps();

    // 1. Action cards are separated into individual steps
    const overdueStep = steps.find(s => s.id === 'admin-reports-overdue-card');
    const vaccineStockStep = steps.find(s => s.id === 'admin-reports-vaccine-stock-card');
    expect(overdueStep).toBeDefined();
    expect(vaccineStockStep).toBeDefined();
    expect(overdueStep?.targetSelector).toContain('admin-reports-overdue-card');
    expect(vaccineStockStep?.targetSelector).toContain('admin-reports-vaccine-stock-card');
    expect(overdueStep?.id).not.toEqual(vaccineStockStep?.id);

    // 2. Full table containers are targeted for all tables
    const tableStepIds = [
      'admin-reports-clinic-records',
      'admin-reports-patients-registry',
      'admin-reports-inventory-patient-usage',
      'admin-reports-inventory-audit-log',
    ];
    for (const tableId of tableStepIds) {
      const step = steps.find(s => s.id === tableId);
      expect(step).toBeDefined();
      expect(step?.placement).toBe('top'); // Places modal above so whole table scrolls into view below
      expect(step?.targetSelector).toContain(tableId);
    }
  });

  test('8. Registration Walkthrough separates all summary KPI cards and surveillance charts into individual feature steps without grouped container overlap', () => {
    const steps = getRegistrationReportsSteps();

    // 1. All 4 KPI summary cards are separated into individual steps
    const completionKpi = steps.find(s => s.id === 'reg-reports-kpi-completion');
    const prioritiesKpi = steps.find(s => s.id === 'reg-reports-kpi-priorities');
    const delayKpi = steps.find(s => s.id === 'reg-reports-kpi-delay');
    const followupKpi = steps.find(s => s.id === 'reg-reports-kpi-followup');

    expect(completionKpi).toBeDefined();
    expect(prioritiesKpi).toBeDefined();
    expect(delayKpi).toBeDefined();
    expect(followupKpi).toBeDefined();

    expect(completionKpi?.targetSelector).toContain('reg-reports-kpi-completion');
    expect(prioritiesKpi?.targetSelector).toContain('reg-reports-kpi-priorities');
    expect(delayKpi?.targetSelector).toContain('reg-reports-kpi-delay');
    expect(followupKpi?.targetSelector).toContain('reg-reports-kpi-followup');

    // 2. Surveillance filters and charts: Age & Day of week in one step, Row 2 (Barangays & Animals) in one step
    const filtersStep = steps.find(s => s.id === 'reg-reports-surveillance-filters');
    const categoryChart = steps.find(s => s.id === 'reg-reports-chart-categories');
    const demographicsChart = steps.find(s => s.id === 'reg-reports-chart-demographics');
    const row2Demographics = steps.find(s => s.id === 'reg-reports-demographics');

    expect(filtersStep).toBeDefined();
    expect(categoryChart).toBeDefined();
    expect(demographicsChart).toBeDefined();
    expect(row2Demographics).toBeDefined();

    expect(demographicsChart?.targetSelector).toContain('reg-reports-chart-demographics');
    expect(row2Demographics?.targetSelector).toContain('reg-reports-demographics');

    expect(categoryChart?.placement).toBe('top');
    expect(demographicsChart?.placement).toBe('top');
    expect(row2Demographics?.placement).toBe('top');

    // 3. Tables have top placement for clearance
    const tableStepIds = [
      'reg-reports-pep-outcomes',
      'reg-reports-pep-overdue',
      'reg-reports-pep-awaiting',
      'reg-reports-surveillance-incidents',
      'reg-reports-surveillance-referrals',
      'reg-reports-clinic-summary',
    ];
    for (const tableId of tableStepIds) {
      const step = steps.find(s => s.id === tableId);
      expect(step).toBeDefined();
      expect(step?.placement).toBe('top');
    }
  });
});
