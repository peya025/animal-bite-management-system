import {
  ANIMAL_SPECIES_OPTIONS,
  BODY_PART_GROUP_OPTIONS,
  EXPOSURE_MODE_OPTIONS,
} from '../../../../shared/constants/biteIntakeContract';
import type { PatientReportedIntake } from '../../types/consultation.types';

interface Props {
  patientReportedIntake: PatientReportedIntake | null;
}

const exposureLabels: Record<string, string> = Object.fromEntries(
  EXPOSURE_MODE_OPTIONS.map((option) => [option.value, option.label]),
);
const bodyPartLabels: Record<string, string> = Object.fromEntries(
  BODY_PART_GROUP_OPTIONS.map((option) => [option.value, option.label]),
);
const animalLabels: Record<string, string> = Object.fromEntries(
  ANIMAL_SPECIES_OPTIONS.map((option) => [option.value, option.label]),
);

const display = (value: unknown) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return 'Not reported';
  return String(value).replaceAll('_', ' ');
};

export default function ExposureAssessmentSection({
  patientReportedIntake,
}: Props) {
  if (!patientReportedIntake) return null;

  const reportedMode =
    patientReportedIntake?.reported_mode_of_exposure ||
    patientReportedIntake?.exposure_type ||
    '';
  const reportedBodyGroup =
    patientReportedIntake?.body_part_group ||
    patientReportedIntake?.body_part_exposed ||
    '';
  const reportedSpecies =
    patientReportedIntake?.animal_species ||
    patientReportedIntake?.animal_type ||
    '';

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">Patient-Reported Mobile Intake</h3>

      <div style={{ padding: 16, border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
            Patient-Reported Mobile Intake
          </div>
          <p style={{ margin: '0 0 12px', color: '#475569', fontSize: 12 }}>
            Patient-reported information only. The nurse verifies the exposure details and category in Form 3.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 18px', fontSize: 12.5 }}>
            <div>
              <strong>Incident:</strong>{' '}
              {display(patientReportedIntake.date_of_exposure || patientReportedIntake.bite_date)}{' '}
              {display(patientReportedIntake.time_of_exposure || patientReportedIntake.incident_time) !== 'Not reported'
                ? `at ${display(patientReportedIntake.time_of_exposure || patientReportedIntake.incident_time)}`
                : ''}
            </div>
            <div><strong>Place:</strong> {display(patientReportedIntake.place_of_exposure || patientReportedIntake.bite_place)}</div>
            <div><strong>Reported exposure:</strong> {exposureLabels[reportedMode] || display(reportedMode)}</div>
            <div>
              <strong>Body site:</strong>{' '}
              {bodyPartLabels[reportedBodyGroup] || display(reportedBodyGroup)}
              {' - '}
              {display(patientReportedIntake.body_part_detail || patientReportedIntake.wound_location)}
              {' '}({display(patientReportedIntake.laterality)})
            </div>
            <div>
              <strong>Animal:</strong>{' '}
              {animalLabels[reportedSpecies] || display(reportedSpecies)}
              {patientReportedIntake.animal_species_other ? ` - ${patientReportedIntake.animal_species_other}` : ''}
              {' - '}
              {display(patientReportedIntake.animal_ownership || patientReportedIntake.animal_status)}
            </div>
            <div><strong>Available for observation:</strong> {display(patientReportedIntake.animal_available)}</div>
            <div><strong>Reported animal condition:</strong> {display(patientReportedIntake.animal_condition_reported)}</div>
            <div><strong>Wound washed:</strong> {display(patientReportedIntake.site_washed)} - {display(patientReportedIntake.wash_method)}</div>
            <div><strong>Past bite history:</strong> {display(patientReportedIntake.past_bite_history)} {patientReportedIntake.past_bite_dates ? `(${patientReportedIntake.past_bite_dates})` : ''}</div>
            <div><strong>Prior PEP:</strong> {display(patientReportedIntake.prior_pep_status || patientReportedIntake.prior_rabies_vaccination)}</div>
            <div><strong>Prior care/referral:</strong> {display(patientReportedIntake.care_received || patientReportedIntake.referral_source)}</div>
            <div style={{ gridColumn: '1 / -1' }}><strong>Patient narrative:</strong> {display(patientReportedIntake.incident_narrative || patientReportedIntake.patient_description)}</div>
          </div>
      </div>
    </div>
  );
}
