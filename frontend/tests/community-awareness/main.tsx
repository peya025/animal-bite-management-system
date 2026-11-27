import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/shared/contexts/AuthContext';
import { SurveillanceInsightsPanel } from '../../src/features/community-awareness/SurveillanceInsightsPanel';
import { AdvisoryReviewPanel } from '../../src/features/community-awareness/AdvisoryReviewPanel';

const params = new URLSearchParams(window.location.search);
const view = params.get('view');

createRoot(document.getElementById('root')!).render(
  view === 'advisory' ? (
    <MemoryRouter>
      <AuthProvider>
        <AdvisoryReviewPanel />
      </AuthProvider>
    </MemoryRouter>
  ) : (
    <SurveillanceInsightsPanel />
  )
);
