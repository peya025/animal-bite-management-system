import { test, expect } from '@playwright/test';
import {
  getAdminReportsSteps,
  getRegistrationReportsSteps,
  getDoctorReportsSteps,
  getTreatmentNurseReportsSteps,
  getReportsAnalyticsSteps,
} from '../../src/features/walkthrough/reportsAnalyticsWalkthroughSteps';

test.describe('Role-Based Reports & Analytics Interactive Walkthrough Audit & Verification', () => {
  test('1. Administrator Reports Walkthrough groups cards and covers all admin reporting sections', () => {
    const steps = getAdminReportsSteps();
    expect(steps.length).toBe(11);

    const ids = steps.map(s => s.id);
    expect(ids).toEqual([
      'admin-reports-overview',
      'admin-reports-tabs',
      'admin-reports-filters',
      'admin-reports-kpi-cards',
      'admin-reports-action-cards',
      'admin-reports-trends-charts',
      'admin-reports-clinic-records',
      'admin-reports-doh-submissions',
      'admin-reports-patients-registry',
      'admin-reports-inventory-kpis',
      'admin-reports-inventory-audit-log',
    ]);

    expect(steps.some(s => s.section === 'DOH Submissions')).toBeTruthy();
    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeTruthy();

    for (const step of steps) {
      expect(step.title).toBeTruthy();
      expect(step.content).toBeTruthy();
      expect(step.targetSelector).toBeTruthy();
    }
  });

  test('2. Registration Staff Reports Walkthrough groups cards and excludes admin-only sections', () => {
    const steps = getRegistrationReportsSteps();
    expect(steps.length).toBe(8);

    const ids = steps.map(s => s.id);
    expect(ids).toEqual([
      'reg-reports-overview',
      'reg-reports-tabs',
      'reg-reports-summary-cards',
      'reg-reports-surveillance-filters',
      'reg-reports-charts',
      'reg-reports-pep',
      'reg-reports-surveillance',
      'reg-reports-clinic-summary',
    ]);

    expect(steps.some(s => s.section === 'DOH Submissions')).toBeFalsy();
    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeFalsy();
    expect(ids.some(id => id.includes('doh'))).toBeFalsy();
    expect(ids.some(id => id.includes('inventory'))).toBeFalsy();
  });

  test('3. Doctor Reports Walkthrough groups summary/category cards and excludes inventory & DOH', () => {
    const steps = getDoctorReportsSteps();
    expect(steps.length).toBe(7);

    const ids = steps.map(s => s.id);
    expect(ids).toEqual([
      'doctor-reports-overview',
      'doctor-reports-tabs',
      'doctor-reports-summary-filters',
      'doctor-reports-summary-cards',
      'doctor-reports-cases-table',
      'doctor-reports-patients-table',
      'doctor-reports-print-action',
    ]);

    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeFalsy();
    expect(steps.some(s => s.section === 'DOH Submissions')).toBeFalsy();

    const printStep = steps.find(s => s.id === 'doctor-reports-print-action');
    expect(printStep?.content).toContain('Physician');
  });

  test('4. Treatment Nurse Reports Walkthrough groups summary & inventory cards and excludes DOH', () => {
    const steps = getTreatmentNurseReportsSteps();
    expect(steps.length).toBe(9);

    const ids = steps.map(s => s.id);
    expect(ids).toEqual([
      'nurse-reports-overview',
      'nurse-reports-tabs',
      'nurse-reports-summary-filters',
      'nurse-reports-summary-cards',
      'nurse-reports-cases-table',
      'nurse-reports-patients-table',
      'nurse-reports-inventory-kpis',
      'nurse-reports-inventory-table',
      'nurse-reports-print-action',
    ]);

    expect(steps.some(s => s.section === 'Vaccine Inventory & Wastage')).toBeTruthy();
    expect(steps.some(s => s.section === 'DOH Submissions')).toBeFalsy();

    const printStep = steps.find(s => s.id === 'nurse-reports-print-action');
    expect(printStep?.content).toContain('Nurse');
  });

  test('5. getReportsAnalyticsSteps dispatches correctly by role', () => {
    expect(getReportsAnalyticsSteps('admin')[0].id).toBe('admin-reports-overview');
    expect(getReportsAnalyticsSteps('developer')[0].id).toBe('admin-reports-overview');
    expect(getReportsAnalyticsSteps('registration')[0].id).toBe('reg-reports-overview');
    expect(getReportsAnalyticsSteps('triage')[0].id).toBe('doctor-reports-overview');
    expect(getReportsAnalyticsSteps('doctor')[0].id).toBe('doctor-reports-overview');
    expect(getReportsAnalyticsSteps('treatment')[0].id).toBe('nurse-reports-overview');
    expect(getReportsAnalyticsSteps('nurse')[0].id).toBe('nurse-reports-overview');
  });
});
