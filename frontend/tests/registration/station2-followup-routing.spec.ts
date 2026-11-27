import { test, expect } from '@playwright/test';

function formatManilaOffsetDays(offsetDays: number): string {
  const dt = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
}

async function setupApiMocks(page: any, patientsByTab: Record<string, any[]>, checkInRecorder: string[]) {
  await page.route('**/api/auth/me', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 10,
          name: 'Station 2 Nurse',
          email: 'nurse@abtc.local',
          role: 'treatment',
          clinic_id: 1,
          is_nursing: true,
          roles: [{ slug: 'follow_up_nurse' }],
        },
        clinic: { id: 1, name: 'Test ABTC Clinic' },
      }),
    });
  });

  await page.route('**/api/clinic-module-config**', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        config: {
          registration_module_enabled: true,
          triage_module_enabled: true,
          treatment_module_enabled: true,
        },
      }),
    });
  });

  await page.route('**/api/nurse/patients**', async (route: any) => {
    const url = new URL(route.request().url());
    const tab = url.searchParams.get('tab') || 'due_today';
    const rows = patientsByTab[tab] ?? patientsByTab.due_today ?? [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: rows,
        total: rows.length,
        due_today_count: (patientsByTab.due_today ?? []).length,
        online_count: (patientsByTab.online ?? []).length,
        upcoming_count: (patientsByTab.upcoming ?? []).length,
        overdue_count: (patientsByTab.overdue ?? []).length,
      }),
    });
  });

  await page.route('**/api/appointments/**/check-in', async (route: any) => {
    const pathname = new URL(route.request().url()).pathname;
    checkInRecorder.push(pathname);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Patient checked in successfully to Station 2 · Follow-up Doses (Queue #1)',
        queue: { queue_id: 77, queue_number: 1, visit_type: 'follow_up', status: 'waiting' },
      }),
    });
  });
}

test.describe('Station 2 Follow-up Routing & Consultation Isolation', () => {
  test('mixed consultation + due-today Day 3 displays Day 3 and posts to appointment-specific check-in endpoint', async ({ page }) => {
    const today = formatManilaOffsetDays(0);
    const futureDay7 = formatManilaOffsetDays(6);
    const checkInCalls: string[] = [];

    const mixedDuePatient = {
      patient_id: 42,
      patient_number: 'P-2026-0042',
      first_name: 'Maria',
      last_name: 'Santos',
      date_of_birth: '1994-05-12',
      gender: 'female',
      age: 32,
      registration_source: 'mobile',
      created_at: today,
      status: 'active',
      latest_treatment_record: { dose_number: 0, treatment_date: formatManilaOffsetDays(-3) },
      appointments: [
        {
          appointment_id: 901,
          bite_id: null,
          appointment_type: 'consultation',
          dose_number: null,
          booked_by_account_id: 7,
          scheduled_date: today,
          appointment_date: today,
          status: 'scheduled',
        },
        {
          appointment_id: 503,
          bite_id: 10,
          appointment_type: 'follow_up_vaccination',
          dose_number: 3,
          scheduled_date: today,
          appointment_date: today,
          status: 'scheduled',
        },
        {
          appointment_id: 507,
          bite_id: 10,
          appointment_type: 'follow_up_vaccination',
          dose_number: 7,
          scheduled_date: futureDay7,
          appointment_date: futureDay7,
          status: 'scheduled',
        },
      ],
      queues: [],
    };

    await setupApiMocks(page, { due_today: [mixedDuePatient] }, checkInCalls);
    await page.goto('/tests/registration/station2-followup-routing.html');

    const row = page.locator('#nurse-patient-42');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Day 3 (Dose 1)');
    await expect(row).not.toContainText('Initial Consultation');

    const checkInBtn = row.getByRole('button', { name: 'Check In' });
    await expect(checkInBtn).toBeVisible();
    await checkInBtn.click();

    await expect.poll(() => checkInCalls.length).toBe(1);
    expect(checkInCalls[0]).toBe('/api/appointments/503/check-in');
  });

  test('future Day 3 with concurrent today mobile consultation hides Check In and shows Scheduled chip', async ({ page }) => {
    const today = formatManilaOffsetDays(0);
    const futureDay3 = formatManilaOffsetDays(4);
    const checkInCalls: string[] = [];

    const futureFollowUpPatient = {
      patient_id: 43,
      patient_number: 'P-2026-0043',
      first_name: 'Carlos',
      last_name: 'Mendoza',
      date_of_birth: '1991-08-20',
      gender: 'male',
      age: 35,
      registration_source: 'mobile',
      created_at: today,
      status: 'active',
      latest_treatment_record: { dose_number: 0, treatment_date: formatManilaOffsetDays(-1) },
      appointments: [
        {
          appointment_id: 902,
          bite_id: null,
          appointment_type: 'consultation',
          dose_number: null,
          booked_by_account_id: 8,
          scheduled_date: today,
          appointment_date: today,
          status: 'scheduled',
        },
        {
          appointment_id: 603,
          bite_id: 10,
          appointment_type: 'follow_up_vaccination',
          dose_number: 3,
          scheduled_date: futureDay3,
          appointment_date: futureDay3,
          status: 'scheduled',
        },
      ],
      queues: [],
    };

    await setupApiMocks(page, { due_today: [futureFollowUpPatient] }, checkInCalls);
    await page.goto('/tests/registration/station2-followup-routing.html');

    const row = page.locator('#nurse-patient-43');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Day 3 (Dose 1)');
    await expect(row).toContainText('Scheduled ·');
    await expect(row.getByRole('button', { name: 'Check In' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Record Dose (Form 3)' })).toHaveCount(0);
    expect(checkInCalls).toEqual([]);
  });

  test('defensive UI guards prevent Check In for consultation-only and booster-only rows and preserve fallback routing', async ({ page }) => {
    const today = formatManilaOffsetDays(0);
    const checkInCalls: string[] = [];

    const consultationOnlyPatient = {
      patient_id: 44,
      patient_number: 'P-2026-0044',
      first_name: 'Ana',
      last_name: 'Cruz',
      date_of_birth: '1998-02-14',
      gender: 'female',
      age: 28,
      registration_source: 'mobile',
      created_at: today,
      status: 'active',
      appointments: [
        {
          appointment_id: 903,
          bite_id: null,
          appointment_type: 'consultation',
          dose_number: null,
          booked_by_account_id: 9,
          scheduled_date: today,
          appointment_date: today,
          status: 'scheduled',
        },
      ],
      queues: [],
    };

    const boosterOnlyPatient = {
      patient_id: 45,
      patient_number: 'P-2026-0045',
      first_name: 'Ben',
      last_name: 'Lim',
      date_of_birth: '1988-09-09',
      gender: 'male',
      age: 38,
      created_at: today,
      status: 'active',
      appointments: [
        {
          appointment_id: 904,
          bite_id: 12,
          appointment_type: 'booster',
          dose_number: 90,
          scheduled_date: today,
          appointment_date: today,
          status: 'scheduled',
          notes: 'Booster vaccination',
        },
      ],
      queues: [],
    };

    await setupApiMocks(page, { due_today: [consultationOnlyPatient, boosterOnlyPatient] }, checkInCalls);
    await page.goto('/tests/registration/station2-followup-routing.html');

    const consultRow = page.locator('#nurse-patient-44');
    await expect(consultRow).toBeVisible();
    await expect(consultRow).toContainText('Check in at Registration');
    await expect(consultRow.getByRole('button', { name: 'Check In' })).toHaveCount(0);

    const boosterRow = page.locator('#nurse-patient-45');
    await expect(boosterRow).toBeVisible();
    await expect(boosterRow).toContainText('Doctor assessment required');
    await expect(boosterRow.getByRole('button', { name: 'Check In' })).toHaveCount(0);

    // Verify pure helper endpoint fallback when appointment_id is missing vs present
    const endpoints = await page.evaluate(() => {
      const r = (window as any).__station2Routing;
      return {
        withId: r.resolveStation2CheckInEndpoint(42, { appointment_id: 503, dose_number: 3, appointment_type: 'follow_up_vaccination' }),
        withoutId: r.resolveStation2CheckInEndpoint(42, { dose_number: 3, appointment_type: 'follow_up_vaccination' }),
        consultationFallback: r.resolveStation2CheckInEndpoint(42, { appointment_id: 901, appointment_type: 'consultation', dose_number: null }),
      };
    });

    expect(endpoints.withId).toBe('/appointments/503/check-in');
    expect(endpoints.withoutId).toBe('/appointments/patient/42/check-in');
    expect(endpoints.consultationFallback).toBe('/appointments/patient/42/check-in');
  });
});
