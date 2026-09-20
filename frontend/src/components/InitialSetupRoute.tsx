import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../shared/services/api';
import ProtectedRoute from './ProtectedRoute';
import SetupWizard from '../features/clinic-setup/pages/SetupWizardPage';

type SetupState = 'loading' | 'available' | 'restricted' | 'error';

export default function InitialSetupRoute() {
  const [state, setState] = useState<SetupState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function checkSetup() {
      try {
        const response = await fetch(`${API_BASE_URL}/setup/check-needed`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 404 || response.status === 403) {
          setState('restricted');
          return;
        }
        if (!response.ok) throw new Error('Setup check failed');
        const data = await response.json();
        if (typeof data.needs_setup !== 'boolean') throw new Error('Invalid setup status');
        setState(data.needs_setup ? 'available' : 'restricted');
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    }
    void checkSetup();
    return () => controller.abort();
  }, [attempt]);

  if (state === 'loading') return <p role="status">Checking setup...</p>;
  if (state === 'error') {
    return (
      <div role="alert">
        <p>Unable to check setup. Please check your connection and try again.</p>
        <button onClick={() => { setState('loading'); setAttempt(value => value + 1); }}>Retry</button>
      </div>
    );
  }
  if (state === 'available') return <SetupWizard />;
  return <ProtectedRoute allowedRoles={['admin', 'developer']}><SetupWizard /></ProtectedRoute>;
}