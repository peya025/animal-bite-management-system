import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
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

// ─── Form 1: Patient Registration (mirrors PatientInfoSection, AddressSection,
//             ContactSection, SocioeconomicSection, GovProgramsSection) ────────
const FORM1_SECTIONS: FieldSection[] = [
  {
    title: 'Patient Information',
    icon: 'users',
    description: 'Name, sex, date of birth, blood type, civil status',
    fields: [
      { key: 'last_name',           label: 'Last Name',            description: 'Patient\'s last name / apelyido (required)' },
      { key: 'first_name',          label: 'First Name',           description: 'Patient\'s first name / pangalan (required)' },
      { key: 'middle_name',         label: 'Middle Name',          description: 'Patient\'s middle name / gitnang pangalan' },
      { key: 'suffix',              label: 'Suffix',               description: 'Name suffix (Jr., Sr., II, III, etc.)' },
      { key: 'sex',                 label: 'Sex (Kasarian)',        description: 'Patient\'s biological sex: Male or Female (required)' },
      { key: 'date_of_birth',       label: 'Date of Birth',        description: 'Patient\'s date of birth (required)' },
      { key: 'blood_type',          label: 'Blood Type',           description: 'Patient blood type (A+, B+, O+, etc.)' },
      { key: 'mother_maiden_name',  label: 'Mother\'s Maiden Name', description: 'Mother\'s maiden name for identification' },
      { key: 'civil_status',        label: 'Civil Status',         description: 'Marital status (single, married, widowed, etc.)' },
      { key: 'spouse_name',         label: 'Spouse\'s Name',       description: 'Name of spouse — shown only when Civil Status is Married' },
    ],
  },
  {
    title: 'Residential Address',
    icon: 'location',
    description: 'City/Municipality, Barangay, Purok — Misamis Oriental (PSGC)',
    fields: [
      { key: 'address_municipality', label: 'City / Municipality', description: 'Municipality or city where patient resides (required)' },
      { key: 'address_barangay',     label: 'Barangay',            description: 'Barangay within the municipality (required)' },
      { key: 'address_purok',        label: 'Purok / Zone / Street', description: 'Purok, zone, or street within the barangay' },
      { key: 'province',             label: 'Province',            description: 'Province — defaults to Misamis Oriental' },
    ],
  },
  {
    title: 'Contact Information',
    icon: 'info',
    description: 'Mobile number, email, emergency contact',
    fields: [
      { key: 'contact_number',          label: 'Contact Number (Mobile)',    description: '11-digit mobile number (09XXXXXXXXX)' },
      { key: 'email',                   label: 'Email Address',              description: 'Patient email address (optional)' },
      { key: 'emergency_contact_name',  label: 'Emergency Contact Name',     description: 'Name of emergency contact person' },
      { key: 'emergency_contact_phone', label: 'Emergency Contact Phone',    description: '11-digit emergency contact number' },
    ],
  },
  {
    title: 'Socioeconomic Information',
    icon: 'info',
    description: 'Educational attainment, employment, family member position',
    fields: [
      { key: 'educational_attainment', label: 'Educational Attainment',    description: 'Highest education level completed (No Formal, Elementary, HS, College, etc.)' },
      { key: 'employment_status',      label: 'Employment Status',          description: 'Current employment situation (Employed, Unemployed, Self-Employed, etc.)' },
      { key: 'family_member',          label: 'Family Member Position',     description: 'Role in household (Father, Mother, Son, Daughter, Others)' },
    ],
  },
  {
    title: 'Government Programs',
    icon: 'shield',
    description: 'PhilHealth, 4Ps, DSWD-NHTS, Senior Citizen, PWD, Indigenous, Others',
    fields: [
      { key: 'philhealth_member',             label: 'PhilHealth Membership',         description: 'Is patient a PhilHealth member? (Yes/No toggle)' },
      { key: 'philhealth_status',             label: 'PhilHealth Status Type',         description: 'Member or Dependent (shown when PhilHealth selected)' },
      { key: 'philhealth_no',                 label: 'PhilHealth No.',                 description: 'PhilHealth membership number (12 digits, format XX-XXXXXXXXX-X)' },
      { key: 'philhealth_category',           label: 'PhilHealth Category',            description: 'FE-Private, FE-Government, IE, Others' },
      { key: 'fourps_member',                 label: '4Ps Membership',                 description: 'Pantawid Pamilya (4Ps) beneficiary (shown when 4Ps selected)' },
      { key: 'fourps_category',               label: '4Ps Membership Category',        description: 'Beneficiary or Member of Beneficiary' },
      { key: 'registered_fourps_beneficiary', label: 'Registered 4Ps Beneficiary',    description: 'Mother or Father registered beneficiary (shown for Member of Beneficiary)' },
      { key: 'fourps_relationship',           label: '4Ps Relationship to Beneficiary', description: 'Daughter or Son (shown for Member of Beneficiary)' },
      { key: 'dswd_nhts',                     label: 'DSWD NHTS Enrollment',           description: 'Enrolled under DSWD National Household Targeting System (Yes/No)' },
      { key: 'senior_citizen_id',             label: 'Senior Citizen ID No.',          description: 'Senior Citizen ID number (shown when Senior Citizen selected)' },
      { key: 'pwd_id',                        label: 'PWD ID No.',                     description: 'PWD ID number (format XX-XXXX-XXXXXXXXXX-XXXXX, shown when PWD selected)' },
      { key: 'indigenous_tribe',              label: 'Tribe / Ethnicity',              description: 'Indigenous People tribe or ethnicity (shown when IP selected)' },
      { key: 'other_membership_no',           label: 'Other Membership ID',            description: 'ID or certificate number for other government membership' },
    ],
  },
];

// ─── Form 2: Doctor Triage Assessment (mirrors GeneralTreatmentForm.tsx) ─────
const FORM2_SECTIONS: FieldSection[] = [
  {
    title: 'CHU/RHU Personnel Only',
    icon: 'info',
    description: 'Mode of transaction, referral details, pertinent history',
    fields: [
      { key: 'mode_of_transaction',  label: 'Mode of Transaction',           description: 'Walk-In, Visited (Home/Field), or Referral from another facility' },
      { key: 'referred_from',        label: 'Referred From',                 description: 'Facility or hospital that referred the patient (referral only)' },
      { key: 'referred_to',          label: 'Referred To',                   description: 'Receiving facility — defaults to Tagoloan RHU / ABTC (referral only)' },
      { key: 'pertinent_history',    label: 'Pertinent History of Illness',  description: 'Multi-select checklist + free-text history of illness and findings (referral only)' },
      { key: 'reason_for_referral',  label: 'Reason for Referral',           description: 'Reason for sending patient to another facility (referral only)' },
      { key: 'actions_taken',        label: 'Actions Taken Before Referral', description: 'Wound care, medications, or procedures done prior to referral' },
    ],
  },
  {
    title: 'Consultation Details',
    icon: 'activity',
    description: 'Date/time of consultation and patient vitals',
    fields: [
      { key: 'date_of_consultation', label: 'Date of Consultation', description: 'Date the patient was assessed by the doctor' },
      { key: 'consultation_time',    label: 'Consultation Time',    description: 'Time of consultation (AM/PM)' },
      { key: 'blood_pressure',       label: 'Blood Pressure',       description: 'Patient blood pressure at time of consultation (e.g. 120/80)' },
      { key: 'temperature',          label: 'Temperature (°C)',     description: 'Body temperature in Celsius (e.g. 36.5)' },
      { key: 'height',               label: 'Height (cm)',          description: 'Patient height in centimeters' },
      { key: 'weight',               label: 'Weight (kg)',          description: 'Patient weight in kilograms' },
    ],
  },
  {
    title: 'Provider Details',
    icon: 'users',
    description: 'Attending provider and referral source',
    fields: [
      { key: 'name_of_attending_provider', label: 'Name of Attending Provider', description: 'Doctor or health worker who conducted the consultation' },
      { key: 'referred_by',               label: 'Referred By',                 description: 'Health facility or doctor who referred the patient' },
    ],
  },
  {
    title: 'Nature of Visit',
    icon: 'warning',
    description: 'Type of visit: New Consultation, New Admission, or Follow-Up (required)',
    fields: [
      { key: 'nature_of_visit', label: 'Nature of Visit', description: 'New Consultation / New Case, New Admission, or Follow-Up Visit (required field)' },
    ],
  },
  {
    title: 'Type of Consultation',
    icon: 'info',
    description: 'Consultation purpose checkboxes (required — at least one)',
    fields: [
      { key: 'consultation_type_general',          label: 'General',             description: 'General health consultation' },
      { key: 'consultation_type_family_planning',  label: 'Family Planning',     description: 'Family planning services' },
      { key: 'consultation_type_prenatal',         label: 'Prenatal',            description: 'Prenatal check-up' },
      { key: 'consultation_type_postpartum',       label: 'Postpartum',          description: 'Postpartum follow-up' },
      { key: 'consultation_type_dental_care',      label: 'Dental Care',         description: 'Dental care consultation' },
      { key: 'consultation_type_tuberculosis',     label: 'Tuberculosis',        description: 'TB-related consultation' },
      { key: 'consultation_type_child_care',       label: 'Child Care',          description: 'Child care / well-child visit' },
      { key: 'consultation_type_child_immunization', label: 'Child Immunization', description: 'Child immunization visit' },
      { key: 'consultation_type_child_nutrition',  label: 'Child Nutrition',     description: 'Child nutrition and growth monitoring' },
      { key: 'consultation_type_sick_children',    label: 'Sick Children',       description: 'Sick child consultation' },
      { key: 'consultation_type_injury',           label: 'Injury',              description: 'Injury or wound — primary consultation type for animal bite cases' },
      { key: 'consultation_type_firecracker',      label: 'Firecracker Injury',  description: 'Firecracker-related injury' },
      { key: 'consultation_type_adult_immunization', label: 'Adult Immunization', description: 'Adult immunization (including rabies PEP)' },
    ],
  },
  {
    title: 'Clinical Notes',
    icon: 'activity',
    description: 'Chief complaints, diagnosis, medication/treatment, prescribed vaccine',
    fields: [
      { key: 'chief_complaints',       label: 'Chief Complaints',          description: 'Main reason for visit — animal bite complaints, symptoms (required)' },
      { key: 'diagnosis',              label: 'Diagnosis',                  description: 'Doctor\'s diagnosis — auto-fills from checklist or free-text (WHO exposure categories)' },
      { key: 'medication_treatment',   label: 'Medication / Treatment',     description: 'Medications and treatments ordered (auto-fill from checklist or manual entry)' },
      { key: 'prescribed_vaccine_type', label: 'Prescribed Vaccine Type',  description: 'Doctor\'s structured PEP vaccine order — drives the nurse Form 3 vaccine selection' },
      { key: 'laboratory_findings',    label: 'Laboratory Findings',        description: 'Lab results or diagnostic findings' },
      { key: 'performed_lab_test',     label: 'Performed Laboratory Test',  description: 'Specific lab tests conducted during or after consultation' },
    ],
  },
];

// ─── Form 3: Nurse Vaccination Card (mirrors VaccinationRecordForm.tsx) ───────
const FORM3_SECTIONS: FieldSection[] = [
  {
    title: 'Vaccination Card Header',
    icon: 'info',
    description: 'Registry/hospital numbers, PhilHealth, patient identifiers',
    fields: [
      { key: 'registry_no',     label: 'Registry No.',     description: 'ABTC registry / case number assigned to the vaccination card' },
      { key: 'hospital_no',     label: 'Hospital No.',     description: 'Hospital or RHU reference number (if applicable)' },
      { key: 'referred_by',     label: 'Referred By',      description: 'Name or facility that referred the patient for treatment' },
      { key: 'philhealth_pin',  label: 'PhilHealth PIN',   description: 'Patient PhilHealth Identification Number (12 digits) for billing' },
      { key: 'philhealth_type', label: 'PhilHealth Type',  description: 'PhilHealth membership type: Member or Dependent' },
    ],
  },
  {
    title: 'Bite Exposure Details',
    icon: 'warning',
    description: 'Exposure category, dates, place, mode, body part, and animal type',
    fields: [
      { key: 'exposure_category',        label: 'Exposure Category',       description: 'WHO Classification: Category I (no risk), II (moderate), or III (severe — requires RIG)' },
      { key: 'date_of_exposure',         label: 'Date of Exposure',        description: 'Date the bite or exposure occurred' },
      { key: 'date_treatment_started',   label: 'Date Treatment Started',  description: 'Date vaccination / PEP was initiated' },
      { key: 'place_of_exposure',        label: 'Place of Exposure',       description: 'Location where the bite or exposure occurred' },
      { key: 'mode_of_exposure',         label: 'Mode of Exposure',        description: 'How exposure occurred: Nibbling (uncovered/wounded skin), Scratch/Abrasion, Transdermal Bite, or Handling/Ingestion' },
      { key: 'body_part_affected',       label: 'Body Part Affected',      description: 'Anatomical area: Head/Neck (high-risk), Other Parts, or N/A (ingestion)' },
      { key: 'body_part_affected_text',  label: 'Body Part — Free Text',   description: 'Detailed free-text description of the exact anatomical bite site' },
      { key: 'animal_type',              label: 'Animal Type',             description: 'Biting animal: Dog, Cat, or Other (with free-text for Others)' },
      { key: 'past_history_bite',        label: 'Past History of Bite',    description: 'Has patient been previously bitten? (Yes/No)' },
      { key: 'pep_completed',            label: 'Previous PEP Completed',  description: 'Did patient complete a previous rabies PEP regimen? (Yes/No — determines booster vs. primary regimen)' },
    ],
  },
  {
    title: 'Vaccination Dose Record (Dose Table)',
    icon: 'medical',
    description: 'Per-dose columns: Route, Date, Vaccine Type, Given By, Signature — for Day 0, Day 3, Day 7, Booster 1, Booster 2',
    fields: [
      { key: 'route',          label: 'Administration Route',   description: 'ID (Intradermal — 0.1 mL, 2 sites) or IM (Intramuscular — full vial dose)' },
      { key: 'vaccine_brand',  label: 'Vaccine Brand / Type',   description: 'Vaccine brand or generic name used for the dose (auto-filled from FIFO batch)' },
      { key: 'batch_no',       label: 'Batch Number',           description: 'Vaccine batch/lot number — auto-linked from inventory FIFO selection' },
      { key: 'vaccine_generic', label: 'Vaccine Generic Name',  description: 'Generic pharmaceutical name of the vaccine (e.g. Verorab, Rabipur)' },
      { key: 'injection_site', label: 'Injection Site',         description: 'Specific body site of injection (e.g. right deltoid, left deltoid)' },
      { key: 'dosage_ml',      label: 'Dosage (mL)',            description: 'Dose volume in milliliters (e.g. 0.1 mL for ID, 1.0 mL for IM)' },
      { key: 'given_by',       label: 'Given By (Nurse Name)',  description: 'Name of the nurse or health worker who administered the dose' },
      { key: 'signature',      label: 'Signature / Initials',   description: 'Nurse\'s initials or signature confirming dose administration' },
    ],
  },
  {
    title: 'Additional Medications',
    icon: 'medical',
    description: 'ERIG / RIG (Gamma Globulin), Tetanus Toxoid (TT), Anti-Tetanus Serum (ATS)',
    fields: [
      { key: 'tt_status',        label: 'Tetanus Toxoid (TT)',          description: 'Tetanus Toxoid administration status and history' },
      { key: 'medication_given', label: 'Additional Medications Given', description: 'ERIG (Equine RIG), HRIG (Human RIG), TT, or ATS administered alongside vaccine' },
      { key: 'adverse_reaction', label: 'Adverse Reaction',            description: 'Any adverse reactions observed after vaccine or medication administration' },
      { key: 'cost_recovery',    label: 'Cost Recovery',               description: 'Billing and cost recovery information (PhilHealth, out-of-pocket, etc.)' },
    ],
  },
];

// Kept for backward-compat with getSectionStats / expandedSections logic
const FIELD_SECTIONS: FieldSection[] = [...FORM1_SECTIONS, ...FORM2_SECTIONS, ...FORM3_SECTIONS];

export default function ModuleConfigPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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

  // ── Tier 9: Google SSO configuration state ────────────────────────────
  const [ssoEnabled,    setSsoEnabled]    = useState(false);
  const [ssoRoles,      setSsoRoles]      = useState<string[]>(['admin', 'registration', 'triage', 'treatment']);
  const [ssoDomain,     setSsoDomain]     = useState('');

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
      // Tier 9 — SSO settings
      setSsoEnabled(data.google_sso_enabled ?? false);
      setSsoRoles(data.google_sso_roles ?? ['admin', 'registration', 'triage', 'treatment']);
      setSsoDomain(data.google_sso_domain ?? '');
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
        // Tier 9 — SSO
        google_sso_enabled: ssoEnabled,
        google_sso_roles:   ssoRoles,
        google_sso_domain:  ssoDomain.trim() || null,
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
    const required = section.fields.filter((f) => fieldRules[f.key] === 'required').length;
    const optional = section.fields.filter((f) => fieldRules[f.key] === 'optional').length;
    const hidden = section.fields.filter((f) => fieldRules[f.key] === 'hidden').length;
    return { required, optional, hidden, total: section.fields.length };
  };

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="sd-dash-header">
        <div>
          <h1>Module Configuration</h1>
          <p>Configure clinic modules and form field requirements across all modules</p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <button
              onClick={() => navigate(ROUTES.CLINIC_SETUP.ROOT)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#6b7280', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Clinic Setup</button>
            <span>›</span>
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
                color: '#3b82f6',
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
                color: '#f59e0b',
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
              { label: 'Registration', enabled: registrationEnabled, color: '#3b82f6' },
              { label: 'Triage', enabled: triageEnabled, color: '#10b981' },
              { label: 'Treatment', enabled: treatmentEnabled, color: '#f59e0b' },
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

          {/* ── Tier 9: Authentication & Single Sign-On Section Card ── */}
          <div style={{ marginTop: '1.5rem', background: isDark ? '#111827' : '#fff', border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}`, borderRadius: '14px', overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>Authentication & Single Sign-On</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', marginTop: 2 }}>Google OAuth 2.0 for clinical staff access</div>
                </div>
              </div>
              {/* Master toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ssoEnabled ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                  {ssoEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="checkbox"
                    checked={ssoEnabled}
                    onChange={e => setSsoEnabled(e.target.checked)}
                    style={{ width: 38, height: 22, appearance: 'none', background: ssoEnabled ? '#10b981' : 'rgba(255,255,255,0.3)', borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s' }}
                  />
                  <span style={{ position: 'absolute', top: 2, left: ssoEnabled ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: ssoEnabled ? 1 : 0.5, pointerEvents: ssoEnabled ? 'auto' : 'none' }}>
              {/* Allowed roles */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isDark ? '#ffffff' : '#334155', marginBottom: '0.5rem' }}>Allowed Staff Roles for Google Sign-In</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(['admin','registration','triage','treatment'] as const).map(role => {
                    const labels: Record<string,string> = { admin:'Administrator', registration:'Registration / Front Desk', triage:'Triage / Doctor', treatment:'Treatment Nurse' };
                    const checked = ssoRoles.includes(role);
                    return (
                      <label key={role} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.3rem 0.75rem',
                        border: `1.5px solid ${checked ? '#6366f1' : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                        borderRadius: 8, cursor: 'pointer',
                        background: checked ? (isDark ? 'rgba(99,102,241,0.18)' : '#f0f0ff') : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                        fontSize: '0.8rem',
                        fontWeight: checked ? 600 : 400,
                        color: checked ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#94a3b8' : '#64748b'),
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => setSsoRoles(prev => checked ? prev.filter(r => r !== role) : [...prev, role])} style={{ accentColor: '#6366f1' }} />
                        {labels[role]}
                      </label>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8', marginTop: '0.4rem' }}>Only selected roles can use Google Sign-In. Unselected roles must use email & password.</p>
              </div>

              {/* Domain restriction */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isDark ? '#ffffff' : '#334155', marginBottom: '0.4rem' }}>
                  Restrict to Official Health Domain <span style={{ fontWeight: 400, color: isDark ? '#64748b' : '#94a3b8' }}>(optional)</span>
                </div>
                <input
                  type="text"
                  value={ssoDomain}
                  onChange={e => setSsoDomain(e.target.value)}
                  placeholder="e.g. doh.gov.ph or rhu.tagoloan.gov.ph"
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem',
                    border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#cbd5e1'}`,
                    borderRadius: 8, fontSize: '0.8125rem', outline: 'none',
                    boxSizing: 'border-box',
                    background: isDark ? '#1f2937' : '#fff',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                  }}
                />
                <p style={{ fontSize: '0.72rem', color: isDark ? '#64748b' : '#94a3b8', marginTop: '0.4rem' }}>
                  Leave blank to allow any email domain. When set, only Google accounts ending in @{ssoDomain || 'your-domain.com'} are accepted.
                </p>
              </div>

              {/* Setup instructions */}
              <div style={{
                background: isDark ? 'rgba(99,102,241,0.1)' : '#f8f8ff',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.35)' : '#c7d2fe'}`,
                borderRadius: 8, padding: '0.75rem 1rem',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#a5b4fc' : '#4338ca', marginBottom: '0.4rem' }}>📋 Setup Checklist</div>
                <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#4338ca', lineHeight: 1.7 }}>
                  <li style={{ color: isDark ? '#cbd5e1' : undefined }}>Go to Google Cloud Console → APIs &amp; Services → Credentials</li>
                  <li style={{ color: isDark ? '#cbd5e1' : undefined }}>Create an OAuth 2.0 Web Application Client ID</li>
                  <li style={{ color: isDark ? '#cbd5e1' : undefined }}>Add <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>http://localhost:5173</code> to Authorized JavaScript Origins</li>
                  <li style={{ color: isDark ? '#cbd5e1' : undefined }}>Set <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>GOOGLE_CLIENT_ID</code> in <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>backend/.env</code> and <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>VITE_GOOGLE_CLIENT_ID</code> in <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>frontend/.env</code></li>
                  <li style={{ color: isDark ? '#cbd5e1' : undefined }}>Run <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>php artisan migrate</code> to create the <code style={{ background: isDark ? '#374151' : undefined, color: isDark ? '#f1f5f9' : undefined, padding: '1px 5px', borderRadius: 4 }}>google_id</code> columns</li>
                </ol>
              </div>
            </div>
          </div>

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

