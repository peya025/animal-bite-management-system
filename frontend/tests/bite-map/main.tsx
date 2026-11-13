import React from 'react';
import { createRoot } from 'react-dom/client';
import BiteMap from '../../src/features/bite-cases/components/BiteMap/BiteMap';
const cases = [{ bite_id: 101, case_number: 'BC-101', patient_name: 'Selected Patient', bite_date: '2026-11-01', latitude: 8.53, longitude: 124.75, severity: 'minor', status: 'active', animal_type: 'Dog', barangay: 'Test', municipality: 'Tagoloan' }];
createRoot(document.getElementById('root')!).render(<div style={{ height: 650 }}><BiteMap cases={cases as any} /></div>);
