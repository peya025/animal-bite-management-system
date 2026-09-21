import type { TreatmentFormData } from '../../types/consultation.types';
import { FormField } from '../FormField';

interface PatientInfoSectionProps {
  formData: TreatmentFormData;
}

export default function PatientInfoSection({ formData }: PatientInfoSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">I. Patient Information (Impormasyon ng Pasyente)</h3>
      <div className="fm-grid">
        <FormField label="Last Name (Apelyido)">
          <input
            className="fm-input"
            type="text"
            name="last_name"
            value={formData.last_name}
            readOnly
            disabled
          />
        </FormField>
        <FormField label="First Name (Pangalan)">
          <input
            className="fm-input"
            type="text"
            name="first_name"
            value={formData.first_name}
            readOnly
            disabled
          />
        </FormField>
        <FormField label="Middle Name (Gitnang Pangalan)">
          <input
            className="fm-input"
            type="text"
            name="middle_name"
            value={formData.middle_name}
            readOnly
            disabled
          />
        </FormField>
        <FormField label="Suffix (e.g. Jr., Sr., II, III)">
          <input
            className="fm-input"
            type="text"
            name="suffix"
            value={formData.suffix}
            readOnly
            disabled
          />
        </FormField>
        <FormField label="Age (Edad)">
          <input
            className="fm-input"
            type="text"
            name="age"
            value={formData.age}
            readOnly
            disabled
          />
        </FormField>
        <FormField label="Residential Address (Tirahan)">
          <input
            className="fm-input"
            type="text"
            name="address"
            value={formData.address}
            readOnly
            disabled
          />
        </FormField>
      </div>
    </div>
  );
}
