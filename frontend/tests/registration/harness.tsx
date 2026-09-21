import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import '../../src/styles/global.css';
import AddPatientModal from '../../src/features/patients/components/AddPatientModal';

function Harness() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return <AppThemeProvider><CssBaseline />
    <button onClick={() => setOpen(true)}>Open registration</button>
    {saved && <p>Test record saved</p>}
    {open && <AddPatientModal role="admin" onClose={() => setOpen(false)}
      onSuccess={() => { setSaved(true); setOpen(false); }} />}
  </AppThemeProvider>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
