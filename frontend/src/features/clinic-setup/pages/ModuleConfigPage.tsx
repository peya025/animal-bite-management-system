import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import { clinicConfigApi } from '../../../services/clinicConfigApi';
import { ROUTES } from '../../../shared/config/routes';
import { Icon } from '../../../shared/components/ui/Icon';
import type { ClinicModuleConfig, FieldRuleValue } from '../../../types';
import '../../developer/styles/DeveloperDatabaseExplorer.css';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

interface FieldConfig {
  key: keyof ClinicModuleConfig['field_rules'];
  label: string;
  description: string;
}

interface FieldSection {
  title: string;
  icon: string;
  description: string;
  fields: FieldConfig[];
}

// The field lists follow the editable controls in the current Form 1, Form 2, and Form 3 components.
const FORM1_SECTIONS: FieldSection[] = [
  {
    title: 'Patient Information',
    icon: 'users',
    description: 'Fields entered in the Patient Information section of Form 1',
    fields: [
      { key: 'last_name', label: 'Last Name', description: 'Patient surname; required in the current form' },
      { key: 'first_name', label: 'First Name', description: 'Patient given name; required in the current form' },
      { key: 'middle_name', label: 'Middle Name', description: 'Patient middle name' },
      { key: 'suffix', label: 'Suffix', description: 'Name suffix, if any' },
      { key: 'sex', label: 'Sex (Kasarian)', description: 'Female or male; required in the current form' },
      { key: 'date_of_birth', label: 'Date of Birth', description: 'Patient birth date; required in the current form' },
      { key: 'blood_type', label: 'Blood Type', description: 'Patient blood type' },
      { key: 'mother_maiden_name', label: "Mother's Maiden Name", description: 'Mother maiden name' },
      { key: 'civil_status', label: 'Civil Status', description: 'Patient civil status' },
      { key: 'spouse_name', label: "Spouse's Name", description: 'Shown only when Civil Status is Married' },
      { key: 'queue_priority_group', label: 'Queue Category', description: 'Shown when registration can create a queue ticket' },
      { key: 'queue_priority_level', label: 'Priority', description: 'Shown for a non-normal queue category' },
    ],
  },
  {
    title: 'Residential Address',
    icon: 'location',
    description: 'Address inputs in Form 1; the full address is generated from these values',
    fields: [
      { key: 'address_municipality', label: 'City / Municipality', description: 'Dropdown or manual entry' },
      { key: 'address_barangay', label: 'Barangay', description: 'Dropdown or manual entry after municipality' },
      { key: 'address_purok', label: 'Purok / Zone / Street', description: 'Optional detail within the barangay' },
    ],
  },
  {
    title: 'Contact Information',
    icon: 'info',
    description: 'Contact inputs in Form 1',
    fields: [
      { key: 'contact_number', label: 'Contact Number (Mobile)', description: 'Patient mobile number' },
      { key: 'email', label: 'Email Address', description: 'Patient email address' },
      { key: 'emergency_contact_name', label: 'Emergency Contact Name', description: 'Emergency contact person' },
      { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', description: 'Emergency contact number' },
    ],
  },
  {
    title: 'Socioeconomic Information',
    icon: 'info',
    description: 'Three selections in the Socioeconomic Information section of Form 1',
    fields: [
      { key: 'educational_attainment', label: 'Educational Attainment', description: 'Highest education level or student status' },
      { key: 'employment_status', label: 'Employment Status', description: 'Employment selection' },
      { key: 'family_member', label: 'Family Member Position', description: 'Position in the household' },
    ],
  },
  {
    title: 'Government Programs',
    icon: 'shield',
    description: 'Membership question, program selection, and conditional details in Form 1',
    fields: [
      { key: 'has_membership', label: 'Any Government Program / Other Membership?', description: 'Yes or No; controls whether membership rows appear' },
      { key: 'other_memberships', label: 'Membership', description: 'Select PhilHealth, 4Ps, DSWD NHTS, Senior Citizen, PWD, Indigenous Member, or Others' },
      { key: 'philhealth_status', label: 'Status Type', description: 'Member or Dependent when PhilHealth is selected' },
      { key: 'philhealth_no', label: 'PhilHealth No.', description: 'Shown when PhilHealth is selected' },
      { key: 'philhealth_category', label: 'Category', description: 'PhilHealth category' },
      { key: 'fourps_category', label: '4Ps Membership Category', description: 'Beneficiary or Member of Beneficiary' },
      { key: 'registered_fourps_beneficiary', label: 'Registered 4Ps Beneficiary', description: 'Shown for Member of Beneficiary' },
      { key: 'fourps_relationship', label: 'Relationship to Registered 4Ps Beneficiary', description: 'Shown for Member of Beneficiary' },
      { key: 'senior_citizen_id', label: 'Senior Citizen ID No.', description: 'Shown when Senior Citizen is selected' },
      { key: 'pwd_id', label: 'PWD ID No.', description: 'Shown when PWD is selected' },
      { key: 'indigenous_tribe', label: 'Tribe / Ethnicity', description: 'Shown when Indigenous Member is selected' },
      { key: 'other_membership_custom_name', label: 'Specify Membership Name', description: 'Shown when Others is selected' },
      { key: 'other_membership_custom_id', label: 'Membership ID / Certificate No.', description: 'Shown when Others is selected' },
    ],
  },
];

const FORM2_SECTIONS: FieldSection[] = [
  {
    title: 'CHU/RHU Personnel Only',
    icon: 'info',
    description: 'Transaction mode and referral fields; Referred To is fixed and read-only',
    fields: [
      { key: 'mode_of_transaction', label: 'Mode of Transaction', description: 'Walk-in, visited, or referral' },
      { key: 'referred_from', label: 'Referred From', description: 'Shown for referral transactions' },
      { key: 'pertinent_history', label: 'Pertinent History of Illness', description: 'Checklist and notes for referral transactions' },
      { key: 'reason_for_referral', label: 'Reason for Referral', description: 'Shown for referral transactions' },
      { key: 'actions_taken', label: 'Action/s Taken', description: 'Actions before referral' },
    ],
  },
  {
    title: 'Consultation Details',
    icon: 'activity',
    description: 'Date, time, and vitals confirmed in Form 2',
    fields: [
      { key: 'date_of_consultation', label: 'Date of Consultation', description: 'Consultation date' },
      { key: 'consultation_time', label: 'Consultation Time (AM/PM)', description: 'Consultation time' },
      { key: 'blood_pressure', label: 'Blood Pressure (mmHg)', description: 'Systolic and diastolic inputs' },
      { key: 'temperature', label: 'Temperature (C)', description: 'Body temperature' },
      { key: 'height', label: 'Height (cm)', description: 'Patient height' },
      { key: 'weight', label: 'Weight (kg)', description: 'Patient weight' },
      { key: 'name_of_attending_provider', label: 'Name of Attending Provider', description: 'Provider shown in consultation details' },
      { key: 'referred_by', label: 'Referred by', description: 'Referral source also displayed in Form 3' },
    ],
  },
  {
    title: 'Nature of Visit',
    icon: 'warning',
    description: 'Sometimes set automatically for a new or re-exposure episode',
    fields: [
      { key: 'nature_of_visit', label: 'Nature of Visit', description: 'New Consultation, New Admission, or Follow-up' },
    ],
  },
  {
    title: 'Type of Consultation',
    icon: 'info',
    description: 'Purpose of Visit is one checkbox group in Form 2',
    fields: [
      { key: 'consultation_types', label: 'Purpose of Visit', description: 'Choose one or more consultation types, including Injury and Adult Immunization' },
    ],
  },
  {
    title: 'Clinical Notes',
    icon: 'activity',
    description: 'Clinical notes entered by the doctor in Form 2',
    fields: [
      { key: 'chief_complaints', label: 'Chief Complaints', description: 'Required in the current form' },
      { key: 'diagnosis', label: 'Diagnosis', description: 'Checklist or manually entered diagnosis' },
    ],
  },
  {
    title: 'Treatment Order',
    icon: 'medical',
    description: 'Doctor decision; Medication / Treatment is filled automatically',
    fields: [
      { key: 'treatment_plan', label: 'Treatment Plan', description: 'Shown for re-exposure assessment' },
      { key: 'prescribed_vaccine_type', label: 'Prescribed PEP Vaccine', description: 'Doctor order pre-fills the Form 3 vaccine selection' },
    ],
  },
  {
    title: 'Laboratory Findings',
    icon: 'activity',
    description: 'The provider name is displayed but cannot be edited here',
    fields: [
      { key: 'performed_lab_test', label: 'Performed Laboratory Test', description: 'Laboratory test entered by the doctor' },
      { key: 'laboratory_findings', label: 'Laboratory Findings / Impression', description: 'Laboratory findings or diagnostic impression' },
    ],
  },
  {
    title: 'Clinical Addendum',
    icon: 'info',
    description: 'Available for an existing record after treatment',
    fields: [
      { key: 'addendum_note', label: 'Append Clinical Addendum Note', description: 'Progress note entered after treatment' },
    ],
  },
];

const FORM3_SECTIONS: FieldSection[] = [
  {
    title: 'Vaccination Card Header',
    icon: 'info',
    description: 'Patient, registry, hospital, and referral details are displayed; PhilHealth fields can be updated',
    fields: [
      { key: 'philhealth_pin', label: 'PhilHealth Identification Number (PIN)', description: 'Prefilled from Form 1; editable only for a PhilHealth member' },
      { key: 'philhealth_type', label: 'PhilHealth Type', description: 'Member or Dependent; available only for a PhilHealth member' },
    ],
  },
  {
    title: 'Bite Exposure Details',
    icon: 'warning',
    description: 'Nurse-verified exposure and animal details in Form 3',
    fields: [
      { key: 'exposure_category', label: 'Exposure Category', description: 'Category I, II, or III' },
      { key: 'date_of_exposure', label: 'Date of Exposure', description: 'Exposure date' },
      { key: 'date_treatment_started', label: 'Date Treatment Started', description: 'Start date of treatment' },
      { key: 'place_of_exposure', label: 'Place of Exposure', description: 'City or municipality and barangay' },
      { key: 'mode_of_exposure', label: 'Mode of Animal Exposure', description: 'Exposure mode checkboxes' },
      { key: 'body_part_affected', label: 'Body Part Affected / Exposed', description: 'Anatomical area checkboxes' },
      { key: 'body_part_affected_text', label: 'Specify Exact Location', description: 'Exact anatomical bite site' },
      { key: 'animal_type', label: 'Animal Type', description: 'Dog, Cat, or Other' },
      { key: 'animal_type_other', label: 'Specify Other Animal', description: 'Shown when Other is selected' },
      { key: 'animal_status', label: 'Animal Ownership', description: 'Owned, Stray, or Unknown' },
      { key: 'animal_available', label: 'Available for 14-day Observation?', description: 'Yes, No, or Unknown' },
      { key: 'animal_condition', label: 'Animal Condition', description: 'Apparently Healthy, Sick, Dead / Killed, or Unknown' },
      { key: 'past_history_bite', label: 'Past History of Animal Bite', description: 'Yes, No, or Unsure' },
      { key: 'past_bite_dates', label: 'Approximate Previous Bite Date(s)', description: 'Shown when there is a past bite' },
      { key: 'pep_completed', label: 'Previous PEP / Rabies Vaccination', description: 'Completed, Incomplete, None, or Unsure' },
    ],
  },
  {
    title: 'Vaccination Dose Record (Dose Table)',
    icon: 'medical',
    description: 'The system records batch, stock allocation, and vaccinator; electronic signatures are optional',
    fields: [
      { key: 'manual_re_exposure', label: 'Re-Bite / Re-Exposure?', description: 'Shown before the dose table for an eligible episode' },
      { key: 'route', label: 'Route', description: 'ID or IM for the active dose' },
      { key: 'dose_date', label: 'Date', description: 'Date the active dose is given' },
      { key: 'vaccine_type', label: 'Vaccine Type', description: 'Locked when the doctor prescribed a vaccine in Form 2' },
      { key: 'is_external', label: 'Transferred-In (External Clinic)', description: 'Marks a dose administered elsewhere' },
      { key: 'external_facility_name', label: 'External Hospital / Clinic Name', description: 'Shown for a transferred-in dose' },
    ],
  },
  {
    title: 'Additional Medications',
    icon: 'medical',
    description: 'Medication checkboxes and ICD 10 code shown below the dose table',
    fields: [
      { key: 'additional_meds', label: 'Additional Medications', description: 'ERIG, TT, and ATS checkboxes' },
      { key: 'icd_code', label: 'ICD 10 Code', description: 'Code entered beside Additional Medications' },
    ],
  },
];

// Kept for backward-compat with getSectionStats / expandedSections logic
const FIELD_SECTIONS: FieldSection[] = [...FORM1_SECTIONS, ...FORM2_SECTIONS, ...FORM3_SECTIONS];

export default function ModuleConfigPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ClinicModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['Bite Incident Intake']);

  // Form state
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [triageEnabled, setTriageEnabled] = useState(true);
  const [treatmentEnabled, setTreatmentEnabled] = useState(true);
  const [fieldRules, setFieldRules] = useState<Record<string, FieldRuleValue>>({});

  // Section enabled state — maps section title → DB key → state
  const [sectionEnabled, setSectionEnabled] = useState<Record<string, boolean>>({
    'Patient Registration':      true,
    'Address Information':       true,
    'Socioeconomic Information': true,
    'Government Programs':       true,
    'Bite Incident Intake':      true,
    'Triage & Assessment':       true,
    'Treatment & Vaccination':   true,
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await clinicConfigApi.getModuleConfig();
      setConfig(data);
      setRegistrationEnabled(data.registration_module_enabled ?? true);
      setTriageEnabled(data.triage_module_enabled);
      setTreatmentEnabled(data.treatment_module_enabled ?? true);
      setFieldRules(data.field_rules);
      setSectionEnabled({
        'Patient Registration':      data.patient_registration_enabled  ?? true,
        'Address Information':       data.address_section_enabled       ?? true,
        'Socioeconomic Information': data.socioeconomic_section_enabled ?? true,
        'Government Programs':       data.gov_programs_section_enabled  ?? true,
        'Bite Incident Intake':      data.bite_intake_section_enabled   ?? true,
        'Triage & Assessment':       data.triage_section_enabled        ?? true,
        'Treatment & Vaccination':   data.treatment_section_enabled     ?? true,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load module configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedConfig = await clinicConfigApi.updateModuleConfig({
        registration_module_enabled:   registrationEnabled,
        triage_module_enabled:         triageEnabled,
        treatment_module_enabled:      treatmentEnabled,
        patient_registration_enabled:  sectionEnabled['Patient Registration'],
        address_section_enabled:       sectionEnabled['Address Information'],
        socioeconomic_section_enabled: sectionEnabled['Socioeconomic Information'],
        gov_programs_section_enabled:  sectionEnabled['Government Programs'],
        bite_intake_section_enabled:   sectionEnabled['Bite Incident Intake'],
        triage_section_enabled:        sectionEnabled['Triage & Assessment'],
        treatment_section_enabled:     sectionEnabled['Treatment & Vaccination'],
        field_rules: fieldRules as any,
      });

      setConfig(updatedConfig);
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };


  const handleFieldRuleChange = (fieldKey: string, value: FieldRuleValue) => {
    setFieldRules((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle)
        ? prev.filter((s) => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const hasChanges = () => {
    if (!config) return false;
    if (config.triage_module_enabled !== triageEnabled) return true;
    if ((config.registration_module_enabled ?? true) !== registrationEnabled) return true;
    if ((config.treatment_module_enabled ?? true) !== treatmentEnabled) return true;

    return FIELD_SECTIONS.some((section) =>
      section.fields.some((field) => config.field_rules[field.key] !== fieldRules[field.key])
    );
  };

  const getFieldRuleBadge = (value: FieldRuleValue) => {
    const badges = {
      required: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', text: 'Required' },
      optional: { bg: '#e8f5ed', color: 'var(--primary)', border: '#d7ebdf', text: 'Optional' },
      hidden: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', text: 'Hidden' },
    };
    const badge = badges[value] || badges.optional;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          fontSize: '0.7rem',
          padding: '0.15rem 0.45rem',
          borderRadius: '0.3rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {badge.text}
      </span>
    );
  };

  const getSectionStats = (section: FieldSection) => {
    const required = section.fields.filter((f) => (fieldRules[f.key] ?? 'optional') === 'required').length;
    const optional = section.fields.filter((f) => (fieldRules[f.key] ?? 'optional') === 'optional').length;
    const hidden = section.fields.filter((f) => (fieldRules[f.key] ?? 'optional') === 'hidden').length;
    return { required, optional, hidden, total: section.fields.length };
  };

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="sd-dash-header">
        <div>
          <Typography
            component="h1"
            sx={{
              fontSize: '24px',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            Module Configuration
          </Typography>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Module Configuration</span>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#991b1b',
            fontSize: '0.8125rem',
            fontWeight: 400,
          }}
        >
          <Icon name="warning" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#e8f5ed',
            border: '1px solid #d7ebdf',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--primary)',
            fontSize: '0.8125rem',
            fontWeight: 400,
          }}
        >
          <Icon name="check" size={18} color="var(--primary)" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ color: '#6b7280', fontWeight: 400 }}>Loading configuration...</p>
        </div>
      ) : (
        <>
          {/* ── Station Modules: Registration → Triage → Treatment ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>

            {/* Registration Module */}
            {[
              {
                key: 'registration' as const,
                label: 'Registration Module',
                desc: 'Front desk patient intake, Form 1, walk-in queue ticketing',
                icon: '📋',
                enabled: registrationEnabled,
                setEnabled: setRegistrationEnabled,
                color: '#10b981',
                whenOn: 'Patients check in at the registration desk before joining the queue.',
                whenOff: 'Registration desk disabled. Walk-in queue creation is unavailable.',
              },
              {
                key: 'triage' as const,
                label: 'Triage Module',
                desc: 'Doctor assessment, Form 2, WHO category evaluation',
                icon: '🩺',
                enabled: triageEnabled,
                setEnabled: setTriageEnabled,
                color: '#10b981',
                whenOn: 'Patient flow: Registration → Triage → Treatment',
                whenOff: 'Patient flow: Registration → Treatment (triage skipped)',
              },
              {
                key: 'treatment' as const,
                label: 'Treatment Module',
                desc: 'Nurse vaccination, Form 3, stock deduction, appointment check-in',
                icon: '💉',
                enabled: treatmentEnabled,
                setEnabled: setTreatmentEnabled,
                color: '#10b981',
                whenOn: 'Nurses can record vaccinations and perform check-ins.',
                whenOff: 'Treatment desk disabled. Form 3 and vaccine recording unavailable.',
              },
            ].map(({ key, label, desc, icon: _icon, enabled, setEnabled, color, whenOn, whenOff }) => (
              <div
                key={key}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: `1.5px solid ${enabled ? color + '44' : '#e2e8f0'}`,
                  boxShadow: enabled ? `0 2px 8px ${color}18` : '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{desc}</p>
                  </div>
                  {/* Toggle switch — pure CSS, no native checkbox appearance */}
                  <div
                    role="switch"
                    aria-checked={enabled}
                    tabIndex={0}
                    onClick={() => setEnabled(!enabled)}
                    onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setEnabled(!enabled)}
                    style={{
                      flexShrink: 0,
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: enabled ? color : '#cbd5e1',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                      outline: 'none',
                      boxShadow: enabled ? `0 0 0 3px ${color}33` : 'none',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 3,
                      left: enabled ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>

                {/* Status row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: enabled ? color + '0d' : '#f8fafc',
                  borderRadius: '8px',
                  border: `1px solid ${enabled ? color + '30' : '#e2e8f0'}`,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: enabled ? color : '#94a3b8',
                  }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: enabled ? color : '#64748b' }}>
                    {enabled ? `${label.split(' ')[0]} Enabled` : `${label.split(' ')[0]} Disabled`}
                  </span>
                </div>

                {/* Flow description */}
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5 }}>
                  {enabled ? whenOn : whenOff}
                </p>
              </div>
            ))}
          </div>

          {/* Patient flow indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '0.6rem 1rem',
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
            marginBottom: '1.25rem', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Active Patient Flow:</span>
            {[
              { label: 'Registration', enabled: registrationEnabled, color: '#10b981' },
              { label: 'Triage', enabled: triageEnabled, color: '#10b981' },
              { label: 'Treatment', enabled: treatmentEnabled, color: '#10b981' },
            ].map((step, idx) => (
              <span key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {idx > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>→</span>}
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  color: step.enabled ? step.color : '#94a3b8',
                  textDecoration: step.enabled ? 'none' : 'line-through',
                  opacity: step.enabled ? 1 : 0.5,
                }}>
                  {step.label}
                </span>
              </span>
            ))}
          </div>

          {/* ── Form Field Rules — one card per module, shown only when module is enabled ── */}

          {/* Form 1: Registration Module */}
          {registrationEnabled && (() => {
            const formSections = FORM1_SECTIONS;
            const accentColor = '#3b82f6';
            return (
              <div style={{ background: 'var(--card-bg-solid,#fff)', borderRadius: '14px', border: `1px solid ${accentColor}30`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '1.5rem', marginBottom: '1.25rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBottom: '1rem', borderBottom: `1px solid ${accentColor}20`, marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Form 1 — Patient Registration</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Configure field rules for the patient intake form (demographics, address, government programs, bite intake)</div>
                  </div>
                </div>
                {/* 2-col section grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', alignItems: 'start' }}>
                  {formSections.map(section => {
                    const isExpanded = expandedSections.includes(section.title);
                    const stats = getSectionStats(section);
                    return (
                      <div key={section.title} style={{ border: '1px solid var(--border-glow-subtle,#e8ede9)', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => toggleSection(section.title)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: isExpanded ? '#f8fafb' : '#fff', border: 'none', borderBottom: isExpanded ? '1px solid #f0f4f1' : 'none', cursor: 'pointer', minHeight: '72px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <Icon name={section.icon as any} size={16} color={sectionEnabled[section.title] !== false ? accentColor : '#cbd5e1'} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: sectionEnabled[section.title] !== false ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.description}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <div
                                  role="switch"
                                  aria-checked={sectionEnabled[section.title] !== false}
                                  tabIndex={0}
                                  onClick={e => { e.stopPropagation(); setSectionEnabled(prev => ({ ...prev, [section.title]: !(prev[section.title] !== false) })); }}
                                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); setSectionEnabled(prev => ({ ...prev, [section.title]: !(prev[section.title] !== false) })); } }}
                                  style={{ width: 38, height: 22, borderRadius: 11, background: sectionEnabled[section.title] !== false ? '#10b981' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', outline: 'none', flexShrink: 0, boxShadow: sectionEnabled[section.title] !== false ? '0 0 0 2px #10b98133' : 'none' }}
                                >
                                  <div style={{ position: 'absolute', top: 2, left: sectionEnabled[section.title] !== false ? 18 : 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', pointerEvents: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                                </div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: sectionEnabled[section.title] !== false ? '#10b981' : '#94a3b8', userSelect: 'none', minWidth: '46px' }}>{sectionEnabled[section.title] !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', borderLeft: '1px solid #e8ede9', paddingLeft: '0.5rem' }}>{stats.required}R · {stats.optional}O · {stats.hidden}H</div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </button>
                        {isExpanded && sectionEnabled[section.title] !== false && (
                          <div style={{ padding: '0 1rem 1rem 1rem' }}>
                            {section.fields.map(field => (
                              <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #f0f7f2', marginBottom: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b', marginBottom: '0.15rem' }}>{field.label}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{field.description}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ marginRight: '0.5rem', minWidth: '70px' }}>{getFieldRuleBadge(fieldRules[field.key] as FieldRuleValue)}</div>
                                  <select className="db-explorer-input" value={fieldRules[field.key] || 'optional'} onChange={e => handleFieldRuleChange(String(field.key), e.target.value as FieldRuleValue)} style={{ minWidth: '120px' }}>
                                    <option value="required">Required</option>
                                    <option value="optional">Optional</option>
                                    <option value="hidden">Hidden</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && sectionEnabled[section.title] === false && (
                          <div style={{ margin: '0 1rem 1rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            This section is <strong style={{ color: '#64748b', marginLeft: 4 }}>Disabled</strong>. Toggle it on to configure its fields.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Form 2: Triage Module */}
          {triageEnabled && (() => {
            const formSections = FORM2_SECTIONS;
            const accentColor = '#10b981';
            return (
              <div style={{ background: 'var(--card-bg-solid,#fff)', borderRadius: '14px', border: `1px solid ${accentColor}30`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBottom: '1rem', borderBottom: `1px solid ${accentColor}20`, marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Form 2 — Triage & Doctor Assessment</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Configure field rules for the doctor assessment form (WHO category, bite site, animal observation)</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', alignItems: 'start' }}>
                  {formSections.map(section => {
                    const isExpanded = expandedSections.includes(section.title);
                    const stats = getSectionStats(section);
                    return (
                      <div key={section.title} style={{ border: '1px solid #e8ede9', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => toggleSection(section.title)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: isExpanded ? '#f8fafb' : '#fff', border: 'none', borderBottom: isExpanded ? '1px solid #f0f4f1' : 'none', cursor: 'pointer', minHeight: '72px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <Icon name={section.icon as any} size={16} color={sectionEnabled[section.title] !== false ? accentColor : '#cbd5e1'} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: sectionEnabled[section.title] !== false ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>{section.description}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <div
                                  role="switch"
                                  aria-checked={sectionEnabled[section.title] !== false}
                                  tabIndex={0}
                                  onClick={e => { e.stopPropagation(); setSectionEnabled(prev => ({ ...prev, [section.title]: !(prev[section.title] !== false) })); }}
                                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); setSectionEnabled(prev => ({ ...prev, [section.title]: !(prev[section.title] !== false) })); } }}
                                  style={{ width: 38, height: 22, borderRadius: 11, background: sectionEnabled[section.title] !== false ? '#10b981' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', outline: 'none', flexShrink: 0, boxShadow: sectionEnabled[section.title] !== false ? '0 0 0 2px #10b98133' : 'none' }}
                                >
                                  <div style={{ position: 'absolute', top: 2, left: sectionEnabled[section.title] !== false ? 18 : 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', pointerEvents: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                                </div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: sectionEnabled[section.title] !== false ? '#10b981' : '#94a3b8', userSelect: 'none', minWidth: '46px' }}>{sectionEnabled[section.title] !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', borderLeft: '1px solid #e8ede9', paddingLeft: '0.5rem' }}>{stats.required}R · {stats.optional}O · {stats.hidden}H</div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </button>
                        {isExpanded && sectionEnabled[section.title] !== false && (
                          <div style={{ padding: '0 1rem 1rem 1rem' }}>
                            {section.fields.map(field => (
                              <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #f0f7f2', marginBottom: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b', marginBottom: '0.15rem' }}>{field.label}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{field.description}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ marginRight: '0.5rem', minWidth: '70px' }}>{getFieldRuleBadge(fieldRules[field.key] as FieldRuleValue)}</div>
                                  <select className="db-explorer-input" value={fieldRules[field.key] || 'optional'} onChange={e => handleFieldRuleChange(String(field.key), e.target.value as FieldRuleValue)} style={{ minWidth: '120px' }}>
                                    <option value="required">Required</option>
                                    <option value="optional">Optional</option>
                                    <option value="hidden">Hidden</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && sectionEnabled[section.title] === false && (
                          <div style={{ margin: '0 1rem 1rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            This section is <strong style={{ color: '#64748b', marginLeft: 4 }}>Disabled</strong>. Toggle it on to configure its fields.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Form 3: Treatment Module */}
          {treatmentEnabled && (() => {
            const formSections = FORM3_SECTIONS;
            const accentColor = '#f59e0b';
            return (
              <div style={{ background: 'var(--card-bg-solid,#fff)', borderRadius: '14px', border: `1px solid ${accentColor}30`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBottom: '1rem', borderBottom: `1px solid ${accentColor}20`, marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Form 3 — Treatment & Vaccination</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Configure field rules for the nurse vaccination form (protocol, route, vaccine brand, batch number)</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', alignItems: 'start' }}>
                  {formSections.map(section => {
                    const isExpanded = expandedSections.includes(section.title);
                    const stats = getSectionStats(section);
                    return (
                      <div key={section.title} style={{ border: '1px solid #e8ede9', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => toggleSection(section.title)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: isExpanded ? '#f8fafb' : '#fff', border: 'none', borderBottom: isExpanded ? '1px solid #f0f4f1' : 'none', cursor: 'pointer', minHeight: '72px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <Icon name={section.icon as any} size={16} color={sectionEnabled[section.title] !== false ? accentColor : '#cbd5e1'} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: sectionEnabled[section.title] !== false ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>{section.description}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <div
                                  role="switch"
                                  aria-checked={sectionEnabled[section.title] !== false}
                                  tabIndex={0}
                                  onClick={e => { e.stopPropagation(); setSectionEnabled(prev => ({ ...prev, [section.title]: !(prev[section.title] !== false) })); }}
                                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); setSectionEnabled(prev => ({ ...prev, [section.title]: !(prev[section.title] !== false) })); } }}
                                  style={{ width: 38, height: 22, borderRadius: 11, background: sectionEnabled[section.title] !== false ? '#10b981' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', outline: 'none', flexShrink: 0, boxShadow: sectionEnabled[section.title] !== false ? '0 0 0 2px #10b98133' : 'none' }}
                                >
                                  <div style={{ position: 'absolute', top: 2, left: sectionEnabled[section.title] !== false ? 18 : 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', pointerEvents: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                                </div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: sectionEnabled[section.title] !== false ? '#10b981' : '#94a3b8', userSelect: 'none', minWidth: '46px' }}>{sectionEnabled[section.title] !== false ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', borderLeft: '1px solid #e8ede9', paddingLeft: '0.5rem' }}>{stats.required}R · {stats.optional}O · {stats.hidden}H</div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </button>
                        {isExpanded && sectionEnabled[section.title] !== false && (
                          <div style={{ padding: '0 1rem 1rem 1rem' }}>
                            {section.fields.map(field => (
                              <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #f0f7f2', marginBottom: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b', marginBottom: '0.15rem' }}>{field.label}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{field.description}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ marginRight: '0.5rem', minWidth: '70px' }}>{getFieldRuleBadge(fieldRules[field.key] as FieldRuleValue)}</div>
                                  <select className="db-explorer-input" value={fieldRules[field.key] || 'optional'} onChange={e => handleFieldRuleChange(String(field.key), e.target.value as FieldRuleValue)} style={{ minWidth: '120px' }}>
                                    <option value="required">Required</option>
                                    <option value="optional">Optional</option>
                                    <option value="hidden">Hidden</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && sectionEnabled[section.title] === false && (
                          <div style={{ margin: '0 1rem 1rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            This section is <strong style={{ color: '#64748b', marginLeft: 4 }}>Disabled</strong>. Toggle it on to configure its fields.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="db-explorer-back-btn"
              onClick={loadConfig}
              disabled={saving || !hasChanges()}
              style={{
                opacity: saving || !hasChanges() ? 0.5 : 1,
                cursor: saving || !hasChanges() ? 'not-allowed' : 'pointer',
              }}
            >
              Reset Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              style={{
                background: hasChanges() ? 'var(--primary)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: hasChanges() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} color="#ffffff" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
          {/* Success Modal */}
          {showSuccessModal && (
            <ConfirmationDialog
              variant="success"
              title="Configuration Saved"
              message="Clinic module configurations and form field rules have been updated successfully."
              confirmLabel="OK"
              hideCancel
              onConfirm={() => setShowSuccessModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

