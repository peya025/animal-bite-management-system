import { useState } from 'react';
import ClinicInformation from '../../src/features/clinic-setup/pages/ClinicInformationPage';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/shared/contexts/AuthContext';
import PrintPreviewModal from '../../src/components/print/PrintPreviewModal';
import { printDocument } from '../../src/components/print/printDocument';
function Preview() {
  const { clinic, isLoading } = useAuth();
  const [setup, setSetup] = useState(new URLSearchParams(location.search).has('setup'));
  if (isLoading) return <p>Loading clinic</p>;
  if (setup) return <><button onClick={() => setSetup(false)}>Open print preview</button><ClinicInformation /></>;
  return <PrintPreviewModal title="Logo regression" clinicName={clinic?.name} printedBy="Test staff"
    onCancel={() => {}} onConfirm={() => printDocument({ title: 'Logo regression', clinicName: clinic?.name, printedBy: 'Test staff', bodyHtml: '<p>Report content</p>' })}>
    <p>Report content</p>
  </PrintPreviewModal>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><AuthProvider><Preview /></AuthProvider></BrowserRouter>);
