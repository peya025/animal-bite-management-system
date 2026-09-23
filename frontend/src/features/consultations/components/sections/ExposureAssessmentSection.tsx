import type { NewBiteData, PatientReportedIntake } from '../../types/consultation.types';

interface Props {
  patientReportedIntake: PatientReportedIntake | null;
  data: NewBiteData;
  disabled: boolean;
  required: boolean;
  confirmed: boolean;
  onChange: (data: NewBiteData) => void;
  onConfirm: (confirmed: boolean) => void;
}

const exposureLabels: Record<string, string> = {
  nibbling_uncovered_skin: 'Saliva / licking on intact skin',
  nibbling_broken_skin: 'Saliva / licking on broken skin',
  scratch_abrasion: 'Scratch / abrasion',
  transdermal_bite: 'Transdermal bite',
  handling_ingestion_raw_meat: 'Handling / ingestion of raw animal tissue',
};

const exposureTypeFromMode = (mode: string): NewBiteData['new_exposure_type'] => {
  if (mode === 'scratch_abrasion') return 'scratch';
  if (mode === 'nibbling_uncovered_skin') return 'lick';
  if (mode === 'transdermal_bite') return 'bite';
  if (mode) return 'other';
  return '';
};

const display = (value: unknown) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return 'Not reported';
  return String(value).replaceAll('_', ' ');
};

export default function ExposureAssessmentSection({
  patientReportedIntake,
  data,
  disabled,
  required,
  confirmed,
  onChange,
  onConfirm,
}: Props) {
  if (!required && !patientReportedIntake) return null;

  const update = <K extends keyof NewBiteData>(key: K, value: NewBiteData[K]) => {
    onChange({ ...data, [key]: value });
    if (confirmed) onConfirm(false);
  };

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">Patient Report and Clinician-Confirmed Exposure</h3>

      {patientReportedIntake && (
        <div style={{ padding: 16, border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff', marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
            Patient-Reported Mobile Intake
          </div>
          <p style={{ margin: '0 0 12px', color: '#475569', fontSize: 12 }}>
            This information has not been clinically verified. Compare it with the physical assessment below.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 18px', fontSize: 12.5 }}>
            <div><strong>Incident:</strong> {display(patientReportedIntake.bite_date)} {display(patientReportedIntake.incident_time) !== 'Not reported' ? `at ${display(patientReportedIntake.incident_time)}` : ''}</div>
            <div><strong>Place:</strong> {display(patientReportedIntake.bite_place)}</div>
            <div><strong>Reported exposure:</strong> {(patientReportedIntake.exposure_type && (exposureLabels as Record<string, string>)[patientReportedIntake.exposure_type]) || display(patientReportedIntake.exposure_type)}</div>
            <div><strong>Body site:</strong> {display(patientReportedIntake.wound_location || patientReportedIntake.body_part_exposed)} ({display(patientReportedIntake.laterality)})</div>
            <div><strong>Animal:</strong> {display(patientReportedIntake.animal_type)} — {display(patientReportedIntake.animal_status)}</div>
            <div><strong>Available for observation:</strong> {display(patientReportedIntake.animal_available)}</div>
            <div><strong>Reported animal condition:</strong> {display(patientReportedIntake.animal_condition_reported)}</div>
            <div><strong>Wound washed:</strong> {display(patientReportedIntake.site_washed)} — {display(patientReportedIntake.wash_method)}</div>
            <div><strong>Prior rabies vaccination:</strong> {display(patientReportedIntake.prior_rabies_vaccination)}</div>
            <div style={{ gridColumn: '1 / -1' }}><strong>Patient narrative:</strong> {display(patientReportedIntake.patient_description)}</div>
          </div>
        </div>
      )}

      <div style={{ padding: 16, border: '1px solid #a7f3d0', borderRadius: 10, background: 'var(--card-bg-solid, #fff)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
          Clinician-Confirmed Exposure Assessment
        </div>
        <p style={{ margin: '0 0 14px', color: 'var(--text-secondary, #64748b)', fontSize: 12 }}>
          Complete this section from the Doctor's assessment. It becomes the authoritative incident record used by Form 3.
        </p>

        <div className="fm-grid">
          <label className="fm-field">
            <span className="fm-label">Incident date <span>*</span></span>
            <input className="fm-input" type="date" value={data.new_bite_date} disabled={disabled}
              onChange={(event) => update('new_bite_date', event.target.value)} />
          </label>

          <label className="fm-field">
            <span className="fm-label">Confirmed incident place</span>
            <input className="fm-input" value={data.new_bite_place} disabled={disabled}
              onChange={(event) => update('new_bite_place', event.target.value)} />
          </label>

          <label className="fm-field">
            <span className="fm-label">Confirmed exposure mechanism <span>*</span></span>
            <select className="fm-select" value={data.new_exposure_mode} disabled={disabled}
              onChange={(event) => {
                const mode = event.target.value as NewBiteData['new_exposure_mode'];
                onChange({ ...data, new_exposure_mode: mode, new_exposure_type: exposureTypeFromMode(mode) });
                if (confirmed) onConfirm(false);
              }}>
              <option value="">Select confirmed mechanism</option>
              {Object.entries(exposureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="fm-field">
            <span className="fm-label">WHO exposure category <span>*</span></span>
            <select className="fm-select" value={data.new_severity} disabled={disabled}
              onChange={(event) => update('new_severity', event.target.value as NewBiteData['new_severity'])}>
              <option value="">Select after clinical assessment</option>
              <option value="minor">Category I</option>
              <option value="moderate">Category II</option>
              <option value="severe">Category III</option>
            </select>
          </label>

          <label className="fm-field">
            <span className="fm-label">Animal species <span>*</span></span>
            <input className="fm-input" value={data.new_animal_type} disabled={disabled}
              onChange={(event) => update('new_animal_type', event.target.value)} />
          </label>

          <label className="fm-field">
            <span className="fm-label">Animal ownership <span>*</span></span>
            <select className="fm-select" value={data.new_animal_status} disabled={disabled}
              onChange={(event) => update('new_animal_status', event.target.value as NewBiteData['new_animal_status'])}>
              <option value="">Select ownership</option>
              <option value="owned">Owned</option>
              <option value="stray">Stray</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <label className="fm-field">
            <span className="fm-label">Animal available for observation</span>
            <select className="fm-select" value={data.new_animal_available === null ? '' : String(data.new_animal_available)} disabled={disabled}
              onChange={(event) => update('new_animal_available', event.target.value === '' ? null : event.target.value === 'true')}>
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="fm-field">
            <span className="fm-label">Wound washed <span>*</span></span>
            <select className="fm-select" value={data.new_site_washed === null ? '' : String(data.new_site_washed)} disabled={disabled}
              onChange={(event) => update('new_site_washed', event.target.value === '' ? null : event.target.value === 'true')}>
              <option value="">Select</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="fm-field">
            <span className="fm-label">Confirmed anatomical site <span>*</span></span>
            <input className="fm-input" value={data.new_body_part} disabled={disabled}
              placeholder="e.g. left hand, right lower leg"
              onChange={(event) => update('new_body_part', event.target.value)} />
          </label>

          <label className="fm-field">
            <span className="fm-label">Laterality</span>
            <select className="fm-select" value={data.new_laterality} disabled={disabled}
              onChange={(event) => update('new_laterality', event.target.value as NewBiteData['new_laterality'])}>
              <option value="">Select</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
              <option value="multiple">Multiple sites</option>
              <option value="not_applicable">Not applicable</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <label className="fm-field fm-grid--full">
            <span className="fm-label">Clinical wound findings</span>
            <textarea className="fm-textarea" value={data.new_wound_description} disabled={disabled}
              onChange={(event) => update('new_wound_description', event.target.value)} />
          </label>
        </div>

        {required && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--text-h, #1f2937)' }}>
            <input type="checkbox" checked={confirmed} disabled={disabled} onChange={(event) => onConfirm(event.target.checked)} style={{ width: 18, height: 18 }} />
            I reviewed the patient-reported intake, physically assessed the patient, and confirm the clinical exposure information above.
          </label>
        )}
      </div>
    </div>
  );
}
