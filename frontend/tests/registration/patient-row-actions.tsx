import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import PatientRowActions from '../../src/features/patients/components/PatientRowActions';
import type { Patient } from '../../src/features/patients/types';

const basePatient: Patient = {
  id: 1,
  patient_id: 1,
  patient_number: 'P-2026-0001',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  date_of_birth: '1990-01-01',
  gender: 'male',
  address: 'Tagoloan',
  created_at: '2026-11-20',
};

function Harness() {
  const [checkInCalls, setCheckInCalls] = useState(0);
  const [reassessCalls, setReassessCalls] = useState(0);
  const [inviteCalls, setInviteCalls] = useState(0);
  const [loadingAction, setLoadingAction] = useState<'checkin' | 'reassess' | 'invite' | null>(null);

  const handleDoubleCheckIn = () => {
    if (loadingAction === 'checkin') return;
    setLoadingAction('checkin');
    setCheckInCalls((c) => c + 1);
  };

  return (
    <AppThemeProvider>
      <CssBaseline />
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Case 1: Reassess + Send Invite + View */}
        <div id="case-1">
          <h3>Case 1: Reassess + Send Invite</h3>
          <PatientRowActions
            patient={basePatient}
            actions={{
              primary: 'reassess',
              check_in_blocked_reason: 'REASSESSMENT_REQUIRED',
              invite: 'send',
              invite_disabled_reason: null,
              view: true,
            }}
            onCheckIn={() => setCheckInCalls((c) => c + 1)}
            onReassess={() => setReassessCalls((c) => c + 1)}
            onInvite={() => setInviteCalls((c) => c + 1)}
            onView={() => {}}
          />
        </div>

        {/* Case 2: Check In + Resend Invite + View */}
        <div id="case-2">
          <h3>Case 2: Check In + Resend Invite</h3>
          <PatientRowActions
            patient={basePatient}
            actions={{
              primary: 'checkin',
              check_in_blocked_reason: null,
              invite: 'resend',
              invite_disabled_reason: null,
              view: true,
            }}
            onCheckIn={() => setCheckInCalls((c) => c + 1)}
            onReassess={() => setReassessCalls((c) => c + 1)}
            onInvite={() => setInviteCalls((c) => c + 1)}
            onView={() => {}}
          />
        </div>

        {/* Case 3: Empty Primary + Disabled Invite (NO_CONTACT) + View */}
        <div id="case-3">
          <h3>Case 3: Disabled Invite (NO_CONTACT)</h3>
          <PatientRowActions
            patient={basePatient}
            actions={{
              primary: null,
              check_in_blocked_reason: null,
              invite: 'send',
              invite_disabled_reason: 'NO_CONTACT',
              view: true,
            }}
            onCheckIn={() => {}}
            onReassess={() => {}}
            onInvite={() => {}}
            onView={() => {}}
          />
        </div>

        {/* Case 4: Neither primary nor invite (View only) */}
        <div id="case-4">
          <h3>Case 4: Neither (Only View)</h3>
          <PatientRowActions
            patient={basePatient}
            actions={{
              primary: null,
              check_in_blocked_reason: null,
              invite: null,
              invite_disabled_reason: null,
              view: true,
            }}
            onCheckIn={() => {}}
            onReassess={() => {}}
            onInvite={() => {}}
            onView={() => {}}
          />
        </div>

        {/* Case 5: Double-click testing */}
        <div id="case-5">
          <h3>Case 5: Double Click Protection</h3>
          <div data-testid="checkin-call-count">{checkInCalls}</div>
          <PatientRowActions
            patient={basePatient}
            actions={{
              primary: 'checkin',
              check_in_blocked_reason: null,
              invite: null,
              invite_disabled_reason: null,
              view: true,
            }}
            onCheckIn={handleDoubleCheckIn}
            onReassess={() => {}}
            onInvite={() => {}}
            onView={() => {}}
            loadingAction={loadingAction}
          />
        </div>
      </Box>
    </AppThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
