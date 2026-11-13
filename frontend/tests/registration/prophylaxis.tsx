import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProphylaxisOrderSection from '../../src/features/consultations/components/sections/ProphylaxisOrderSection';
import ProphylaxisAdministrationSection from '../../src/features/vaccinations/components/ProphylaxisAdministrationSection';
import { ConsultationDialog } from '../../src/features/consultations/styles/ConsultationDialog.styles';
import { EMPTY_PROPHYLAXIS_ORDERS } from '../../src/shared/types/prophylaxis';
import type { ProphylaxisAdministration, ProphylaxisStock } from '../../src/shared/types/prophylaxis';
import '../../src/styles/global.css';

function Harness() {
  const stock: ProphylaxisStock = {
    tetanus: [{ inventory_id: 1, vaccine_type: 'tetanus', batch_number: 'TET-001', current_quantity: 5, expiration_date: '2027-12-31' }],
    TT: [{ inventory_id: 2, vaccine_type: 'Tetanus Toxoid (TT)', batch_number: 'TT-001', current_quantity: 3, expiration_date: '2027-12-31' }],
    ATS: [{ inventory_id: 3, vaccine_type: 'Anti-Tetanus Serum (ATS)', batch_number: 'ATS-001', current_quantity: 2, expiration_date: '2027-12-31' }],
    ERIG: [{ inventory_id: 4, vaccine_type: 'Equine Rabies Immunoglobulin (ERIG)', batch_number: 'ERIG-001', current_quantity: 4, expiration_date: '2027-12-31' }],
  };
  const [orders, setOrders] = useState(EMPTY_PROPHYLAXIS_ORDERS);
  const [administrations, setAdministrations] = useState<ProphylaxisAdministration[]>([]);
  const [recorded, setRecorded] = useState(false);
  return (
    <ConsultationDialog style={{ maxWidth: 1050, margin: '24px auto', padding: 24 }}>
      <ProphylaxisOrderSection
        value={orders}
        stock={stock}
        tetanusBrands={['tetanus', 'TT']}
        onChange={setOrders}
        disabled={recorded}
      />
      <ProphylaxisAdministrationSection
        orders={orders}
        value={administrations}
        onChange={setAdministrations}
        stock={stock}
        records={recorded ? [{ treatment_id: 1, medication_given: orders.tetanus_vaccine || 'tetanus', treatment_date: '2026-09-30', dose_iu: '', batch_no: 'TET-001' }] : []}
        disabled={false}
        today="2026-09-30"
      />
      <button onClick={() => { setRecorded(true); setAdministrations([]); }}>Simulate saved administration</button>
      <output aria-label="Administration count">{administrations.length}</output>
    </ConsultationDialog>
  );
}
createRoot(document.getElementById('root')!).render(<Harness />);
