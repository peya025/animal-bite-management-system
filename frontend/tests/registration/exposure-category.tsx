import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/shared/contexts/AuthContext';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import GeneralTreatmentForm from '../../src/features/consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../src/features/vaccinations/components/VaccinationRecordForm';
import '../../src/styles/global.css';

const entry = { queue_id: 1, bite_id: 1, visit_type: 'vaccination', patient: {
  patient_id: 1, first_name: 'Test', last_name: 'Patient', age: 30, gender: 'male', address: 'Tagoloan',
} };
const noop = () => {};
createRoot(document.getElementById('root')!).render(
  <BrowserRouter><AuthProvider><AppThemeProvider>
    <section data-testid="form2"><GeneralTreatmentForm open entry={entry} onClose={noop} onSave={noop} inline /></section>
    <section data-testid="form3"><VaccinationRecordForm open entry={entry} onClose={noop} onSave={noop} inline /></section>
  </AppThemeProvider></AuthProvider></BrowserRouter>,
);
