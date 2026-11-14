import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import {
  clinicConfigApi,
  ClinicConfigConflictError,
  ClinicConfigValidationError,
} from '../../api/clinicConfigApi';
import { useClinicModuleConfig } from '../../hooks/useClinicModuleConfig';
import { ROUTES } from '../../shared/config/routes';
import { Icon } from '../../shared/components/ui/Icon';
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog';
import type {
  ClinicModuleConfig,
  ClinicStationModules,
  ClinicModuleSections,
  FieldRules,
  FieldRuleValue,
  ClinicStationKey,
  ClinicSectionKey,
  ClinicModuleConfigHistoryItem,
} from '../../types';
import {
  DEFAULT_CANONICAL_FIELD_RULES,
  DEFAULT_CANONICAL_SECTIONS,
  DEFAULT_CANONICAL_MODULES,
} from '../../types';

interface FieldMeta {
  key: keyof FieldRules;
  label: string;
  description: string;
  locked?: boolean;
  lockedValue?: FieldRuleValue;
  lockedReason?: string;
}

interface SectionMeta {
  id: ClinicSectionKey;
  title: string;
  moduleKey: ClinicStationKey;
  icon: string;
  description: string;
  fields: FieldMeta[];
}

// 7 Canonical Sections mapping to the 41 Canonical Field Rules
const CANONICAL_SECTIONS: SectionMeta[] = [
  // Form 1: Registration Module (5 sections)
  {
    id: 'patient_registration_enabled',
    title: 'Patient Demographics',
    moduleKey: 'registration_module_enabled',
    icon: 'users',
    description: 'Patient identity, name, demographics, and relationship fields',
    fields: [
      { key: 'blood_type', label: 'Blood Type', description: 'Patient blood type (A, B, AB, O)' },
      { key: 'mother_maiden_name', label: "Mother's Maiden Name", description: 'Full maiden name of patient’s mother' },
      { key: 'civil_status', label: 'Civil Status', description: 'Single, Married, Widowed, Separated' },
      { key: 'spouse_name', label: "Spouse's Name", description: 'Shown conditionally when civil status is Married' },
    ],
  },
  {
    id: 'address_section_enabled',
    title: 'Address Information',
    moduleKey: 'registration_module_enabled',
    icon: 'location',
    description: 'Residential address components used to construct full address',
    fields: [
      { key: 'address_municipality', label: 'City / Municipality', description: 'City or municipality dropdown/input' },
      { key: 'address_barangay', label: 'Barangay', description: 'Barangay selection' },
      { key: 'address_purok', label: 'Purok / Zone / Street', description: 'Specific purok, street, or zone detail' },
      { key: 'province', label: 'Province', description: 'Province name' },
    ],
  },
  {
    id: 'socioeconomic_section_enabled',
    title: 'Socioeconomic Information',
    moduleKey: 'registration_module_enabled',
    icon: 'info',
    description: 'Education, employment, and household position',
    fields: [
      { key: 'educational_attainment', label: 'Educational Attainment', description: 'Highest educational level attained' },
      { key: 'employment_status', label: 'Employment Status', description: 'Employment and livelihood status' },
      { key: 'family_member', label: 'Family Member Position', description: 'Household position or role' },
    ],
  },
  {
    id: 'gov_programs_section_enabled',
    title: 'Government Assistance Programs',
    moduleKey: 'registration_module_enabled',
    icon: 'security',
    description: 'PhilHealth, 4Ps, DSWD NHTS memberships',
    fields: [
      { key: 'philhealth_member', label: 'PhilHealth Membership', description: 'Indicates PhilHealth enrollment' },
      { key: 'philhealth_status', label: 'PhilHealth Status Type', description: 'Member or Dependent' },
      { key: 'philhealth_no', label: 'PhilHealth Identification No. (PIN)', description: '12-digit PhilHealth number' },
      { key: 'philhealth_category', label: 'PhilHealth Category', description: 'Formal, Indigent, Sponsored, Senior' },
      { key: 'fourps_member', label: '4Ps Pantawid Pamilya Member', description: '4Ps beneficiary status' },
      { key: 'dswd_nhts', label: 'DSWD NHTS-PR Listed', description: 'National Household Targeting System member' },
    ],
  },
  {
    id: 'bite_intake_section_enabled',
    title: 'Bite Incident Intake',
    moduleKey: 'registration_module_enabled',
    icon: 'warning',
    description: 'Circumstances of animal exposure, date, place, animal description',
    fields: [
      { key: 'bite_date', label: 'Date of Bite / Exposure', description: 'Date the exposure incident occurred' },
      { key: 'bite_place', label: 'Place of Incident', description: 'Barangay or address where bitten' },
      { key: 'site_washed', label: 'Site Washed with Soap and Water', description: 'Immediate pre-hospital first-aid washing' },
      { key: 'exposure_type', label: 'Type of Exposure', description: 'Bite, Scratch, or Non-bite contact' },
      { key: 'animal_type', label: 'Animal Type', description: 'Dog, Cat, or Other animal' },
      { key: 'animal_status', label: 'Animal Status', description: 'Alive, Dead, Killed, or Lost' },
      { key: 'animal_captured', label: 'Animal Captured / Quarantined', description: 'Available for 14-day observation' },
      { key: 'wound_location', label: 'Wound Anatomical Location', description: 'Anatomical site on body' },
      { key: 'patient_description', label: 'Patient Remarks / Description', description: 'Additional incident notes' },
    ],
  },

  // Form 2: Triage Module (1 section)
  {
    id: 'triage_section_enabled',
    title: 'Triage & Clinical Assessment',
    moduleKey: 'triage_module_enabled',
    icon: 'activity',
    description: 'Clinical evaluation, Category assignment, animal observation notes',
    fields: [
      {
        key: 'exposure_category',
        label: 'Exposure Category (Category I, II, III)',
        description: 'WHO/DOH Rabies Exposure Category. Required essential clinical safeguard.',
        locked: true,
        lockedValue: 'required',
        lockedReason: 'Essential Clinical Safeguard (LF1 Invariant)',
      },
      { key: 'bite_site', label: 'Clinical Bite Site Verification', description: 'Verified anatomical location of bite' },
      { key: 'animal_observation_status', label: 'Animal Observation Status', description: 'Current status during 14-day quarantine' },
      { key: 'treatment_given', label: 'Treatment Given at Triage', description: 'Local wound treatment or initial antiseptic' },
    ],
  },

  // Form 3: Treatment Module (1 section)
  {
    id: 'treatment_section_enabled',
    title: 'Treatment & Vaccination',
    moduleKey: 'treatment_module_enabled',
    icon: 'vaccinations',
    description: 'Vaccine brand, route, dosage, batch, and adverse reaction tracking',
    fields: [
      { key: 'protocol_type', label: 'Vaccination Protocol', description: 'Essen (IM), Zagreb (IM/ID), or Updated Thai Red Cross' },
      { key: 'route', label: 'Administration Route', description: 'Intradermal (ID) or Intramuscular (IM)' },
      { key: 'injection_site', label: 'Injection Site', description: 'Deltoid or Anterolateral Thigh' },
      { key: 'dosage_ml', label: 'Dosage (mL)', description: 'Dosage volume per dose' },
      { key: 'vaccine_brand', label: 'Vaccine Brand Name', description: 'Commercial brand name of vaccine' },
      { key: 'vaccine_generic', label: 'Vaccine Generic Name', description: 'Purified Vero Cell Rabies Vaccine / PCECV' },
      { key: 'batch_no', label: 'Batch / Lot Number', description: 'Stock batch number for traceability' },
      { key: 'tt_status', label: 'Tetanus Toxoid (TT) Status', description: 'Tetanus immunization assessment' },
      { key: 'medication_given', label: 'Additional Medications', description: 'Antibiotics, ERIG, or ATS prescribed' },
      { key: 'adverse_reaction', label: 'Adverse Reaction', description: 'Signs of adverse events following immunization' },
      { key: 'cost_recovery', label: 'Cost Recovery / Billing Type', description: 'Free / PhilHealth subsidized / Paid' },
    ],
  },
];

const STATION_MODULES_CONFIG: Array<{
  key: ClinicStationKey;
  label: string;
  desc: string;
  icon: string;
  color: string;
  whenOn: string;
  whenOff: string;
}> = [
  {
    key: 'registration_module_enabled',
    label: 'Registration Module',
    desc: 'Front desk intake, patient registration, walk-in queue ticketing',
    icon: '📋',
    color: '#10b981',
    whenOn: 'Patients check in at registration before entering triage or queue.',
    whenOff: 'Registration desk disabled. Direct registration queue creation is disabled.',
  },
  {
    key: 'triage_module_enabled',
    label: 'Triage Module',
    desc: 'Doctor assessment, Form 2, WHO Category I/II/III evaluation',
    icon: '🩺',
    color: '#10b981',
    whenOn: 'Standard workflow: Registration → Triage → Treatment',
    whenOff: 'Triage desk is disabled. Registration must also be disabled (only Treatment-only mode 001 is supported).',
  },
  {
    key: 'treatment_module_enabled',
    label: 'Treatment Module',
    desc: 'Nurse vaccination, Form 3, stock deduction, follow-up doses',
    icon: '💉',
    color: '#10b981',
    whenOn: 'Nurses can record vaccinations, administer doses, and deduct stock.',
    whenOff: 'Treatment desk disabled. Vaccine administration forms are unavailable.',
  },
];

interface DraftState {
  stations: ClinicStationModules;
  sections: ClinicModuleSections;
  fieldRules: FieldRules;
}

export default function ModuleConfigPage() {
  const navigate = useNavigate();
  const { invalidateConfig } = useClinicModuleConfig();

  // Baseline and draft state
  const [savedBaseline, setSavedBaseline] = useState<ClinicModuleConfig | null>(null);
  const [draft, setDraft] = useState<DraftState>({
    stations: { ...DEFAULT_CANONICAL_MODULES },
    sections: { ...DEFAULT_CANONICAL_SECTIONS },
    fieldRules: { ...DEFAULT_CANONICAL_FIELD_RULES },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Accordion expansion state
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'patient_registration_enabled',
    'bite_intake_section_enabled',
  ]);

  // Conflict state (HTTP 409)
  const [conflictData, setConflictData] = useState<ClinicConfigConflictError | null>(null);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState<ClinicModuleConfigHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Leave page guard
  const [showLeaveConfirmDialog, setShowLeaveConfirmDialog] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  const canEdit = savedBaseline?.can_edit ?? true;

  // Load configuration
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setValidationErrors({});
    setConflictData(null);

    try {
      const data = await clinicConfigApi.getModuleConfig();
      setSavedBaseline(data);

      setDraft({
        stations: {
          triage_module_enabled: data.triage_module_enabled ?? true,
          registration_module_enabled: data.registration_module_enabled ?? true,
          treatment_module_enabled: data.treatment_module_enabled ?? true,
        },
        sections: {
          patient_registration_enabled: data.patient_registration_enabled ?? true,
          address_section_enabled: data.address_section_enabled ?? true,
          socioeconomic_section_enabled: data.socioeconomic_section_enabled ?? true,
          gov_programs_section_enabled: data.gov_programs_section_enabled ?? true,
          bite_intake_section_enabled: data.bite_intake_section_enabled ?? true,
          triage_section_enabled: data.triage_section_enabled ?? true,
          treatment_section_enabled: data.treatment_section_enabled ?? true,
        },
        fieldRules: {
          ...DEFAULT_CANONICAL_FIELD_RULES,
          ...data.field_rules,
          exposure_category: 'required', // Permanently locked invariant
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load module configuration from server.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Check dirty state against saved baseline
  const hasChanges = useMemo((): boolean => {
    if (!savedBaseline) return false;

    // 1. Station changes
    const stationsChanged =
      draft.stations.triage_module_enabled !== (savedBaseline.triage_module_enabled ?? true) ||
      draft.stations.registration_module_enabled !== (savedBaseline.registration_module_enabled ?? true) ||
      draft.stations.treatment_module_enabled !== (savedBaseline.treatment_module_enabled ?? true);

    if (stationsChanged) return true;

    // 2. Canonical Section changes
    const sections: ClinicSectionKey[] = [
      'patient_registration_enabled',
      'address_section_enabled',
      'socioeconomic_section_enabled',
      'gov_programs_section_enabled',
      'bite_intake_section_enabled',
      'triage_section_enabled',
      'treatment_section_enabled',
    ];

    for (const sec of sections) {
      const baselineVal = savedBaseline[sec] ?? true;
      if (draft.sections[sec] !== baselineVal) {
        return true;
      }
    }

    // 3. Field Rule changes (all 41 canonical keys)
    for (const key of Object.keys(DEFAULT_CANONICAL_FIELD_RULES) as Array<keyof FieldRules>) {
      const baselineRule = savedBaseline.field_rules?.[key] ?? DEFAULT_CANONICAL_FIELD_RULES[key];
      const draftRule = draft.fieldRules[key] ?? DEFAULT_CANONICAL_FIELD_RULES[key];
      if (draftRule !== baselineRule) {
        return true;
      }
    }

    return false;
  }, [savedBaseline, draft]);

  const stationPolicyError = useMemo((): string | null => {
    const { registration_module_enabled, triage_module_enabled, treatment_module_enabled } = draft.stations;
    if (!registration_module_enabled && !triage_module_enabled && !treatment_module_enabled) {
      return 'At least one station module (Registration, Triage, or Treatment) must remain enabled.';
    }
    if (registration_module_enabled && !triage_module_enabled) {
      return 'Triage Module cannot be disabled while Registration Module is enabled because walk-in intakes enter the triage queue directly.';
    }
    return null;
  }, [draft.stations]);

  // Warn on browser unload if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved configuration changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Reset to last saved baseline
  const handleReset = () => {
    if (!savedBaseline) return;
    setSaveError(null);
    setValidationErrors({});
    setConflictData(null);

    setDraft({
      stations: {
        triage_module_enabled: savedBaseline.triage_module_enabled ?? true,
        registration_module_enabled: savedBaseline.registration_module_enabled ?? true,
        treatment_module_enabled: savedBaseline.treatment_module_enabled ?? true,
      },
      sections: {
        patient_registration_enabled: savedBaseline.patient_registration_enabled ?? true,
        address_section_enabled: savedBaseline.address_section_enabled ?? true,
        socioeconomic_section_enabled: savedBaseline.socioeconomic_section_enabled ?? true,
        gov_programs_section_enabled: savedBaseline.gov_programs_section_enabled ?? true,
        bite_intake_section_enabled: savedBaseline.bite_intake_section_enabled ?? true,
        triage_section_enabled: savedBaseline.triage_section_enabled ?? true,
        treatment_section_enabled: savedBaseline.treatment_section_enabled ?? true,
      },
      fieldRules: {
        ...DEFAULT_CANONICAL_FIELD_RULES,
        ...savedBaseline.field_rules,
        exposure_category: 'required',
      },
    });
  };

  // Save changes
  const handleSave = async (overrideRevision?: number) => {
    if (!savedBaseline || saving) return;

    if (stationPolicyError) {
      setSaveError(stationPolicyError);
      setValidationErrors({ triage_module_enabled: [stationPolicyError] });
      return;
    }

    setSaving(true);
    setSaveError(null);
    setValidationErrors({});
    setConflictData(null);

    const revisionToSubmit = overrideRevision ?? savedBaseline.revision;

    try {
      const updatedConfig = await clinicConfigApi.updateModuleConfig({
        revision: revisionToSubmit,
        ...draft.stations,
        ...draft.sections,
        field_rules: {
          ...draft.fieldRules,
          exposure_category: 'required', // Permanently locked invariant
        },
      });

      // Synchronize saved baseline and update provider cache
      setSavedBaseline(updatedConfig);
      setDraft({
        stations: {
          triage_module_enabled: updatedConfig.triage_module_enabled,
          registration_module_enabled: updatedConfig.registration_module_enabled,
          treatment_module_enabled: updatedConfig.treatment_module_enabled,
        },
        sections: {
          patient_registration_enabled: updatedConfig.patient_registration_enabled,
          address_section_enabled: updatedConfig.address_section_enabled,
          socioeconomic_section_enabled: updatedConfig.socioeconomic_section_enabled,
          gov_programs_section_enabled: updatedConfig.gov_programs_section_enabled,
          bite_intake_section_enabled: updatedConfig.bite_intake_section_enabled,
          triage_section_enabled: updatedConfig.triage_section_enabled,
          treatment_section_enabled: updatedConfig.treatment_section_enabled,
        },
        fieldRules: {
          ...updatedConfig.field_rules,
          exposure_category: 'required',
        },
      });

      setShowSuccessModal(true);
      invalidateConfig();
    } catch (err: any) {
      if (err instanceof ClinicConfigConflictError) {
        // 409 Conflict: Retain user's draft and show reconcile modal
        setConflictData(err);
      } else if (err instanceof ClinicConfigValidationError) {
        // 422 Validation Error: Addressable field errors
        setValidationErrors(err.errors);
        setSaveError(err.message);
      } else {
        // Network or server error: retain draft
        const msg = err.response?.data?.message || err.message || 'Save failed. Draft changes have been retained.';
        setSaveError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Station toggle handler
  const handleStationToggle = (stationKey: ClinicStationKey) => {
    if (!canEdit) return;
    setDraft((prev) => ({
      ...prev,
      stations: {
        ...prev.stations,
        [stationKey]: !prev.stations[stationKey],
      },
    }));
  };

  // Section toggle handler
  const handleSectionToggle = (sectionKey: ClinicSectionKey) => {
    if (!canEdit) return;
    setDraft((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: !prev.sections[sectionKey],
      },
    }));
  };

  // Field rule change handler
  const handleFieldRuleChange = (fieldKey: keyof FieldRules, value: FieldRuleValue) => {
    if (!canEdit || fieldKey === 'exposure_category') return;
    setDraft((prev) => ({
      ...prev,
      fieldRules: {
        ...prev.fieldRules,
        [fieldKey]: value,
      },
    }));
  };

  // Accordion toggle handler
  const toggleAccordion = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  // Guard navigation
  const handleGuardedNavigate = (path: string) => {
    if (hasChanges) {
      setPendingNavigationPath(path);
      setShowLeaveConfirmDialog(true);
    } else {
      navigate(path);
    }
  };

  // Open history modal
  const openHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const items = await clinicConfigApi.getModuleConfigHistory();
      setHistoryItems(items);
    } catch (err: any) {
      setHistoryError(err.response?.data?.message || err.message || 'Failed to load configuration history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getFieldRuleBadge = (value: FieldRuleValue) => {
    const badges = {
      required: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', text: 'Required' },
      optional: { bg: '#e8f5ed', color: '#047857', border: '#d7ebdf', text: 'Optional' },
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
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {badge.text}
      </span>
    );
  };

  const getSectionStats = (section: SectionMeta) => {
    const required = section.fields.filter(
      (f) => (draft.fieldRules[f.key] ?? DEFAULT_CANONICAL_FIELD_RULES[f.key]) === 'required'
    ).length;
    const optional = section.fields.filter(
      (f) => (draft.fieldRules[f.key] ?? DEFAULT_CANONICAL_FIELD_RULES[f.key]) === 'optional'
    ).length;
    const hidden = section.fields.filter(
      (f) => (draft.fieldRules[f.key] ?? DEFAULT_CANONICAL_FIELD_RULES[f.key]) === 'hidden'
    ).length;
    return { required, optional, hidden, total: section.fields.length };
  };

  return (
    <div style={{ width: '100%', margin: 0, padding: 0, maxWidth: '1440px', boxSizing: 'border-box' }}>
      {/* ── Page Header ── */}
      <div
        data-walkthrough="module-config-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '20px', sm: '24px' },
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'var(--text-h, #111827)',
              }}
            >
              Clinic Module Configuration
            </Typography>

            {/* Read-Only badge if not editable */}
            {!canEdit && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Icon name="info" size={14} color="#92400e" />
                Read-Only (Developer / Staff View)
              </span>
            )}

            {savedBaseline && (
              <span
                data-walkthrough="module-config-revision-badge"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                }}
              >
                Revision #{savedBaseline.revision}
              </span>
            )}
          </div>

          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              fontSize: '13px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => handleGuardedNavigate(ROUTES.DASHBOARD)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#2563eb',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Module Configuration</span>
          </div>
        </div>

        {/* History action button */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            data-walkthrough="module-config-history-btn"
            onClick={openHistory}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <Icon name="activity" size={16} color="#64748b" />
            Audit History
          </button>
        </div>
      </div>

      {/* ── Initial Load Error State with Functioning Retry Action ── */}
      {loadError && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Icon name="warning" size={24} color="#dc2626" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#991b1b' }}>
                Failed to Load Authoritative Clinic Configuration
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#7f1d1d', marginTop: '0.25rem' }}>
                {loadError}
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#b91c1c' }}>
                Unverified default values are not presented as saved state. Please check your connectivity and retry.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={loadConfig}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              Retry Fetch
            </button>
          </div>
        </div>
      )}

      {/* ── Save Error Banner (Retaining Drafts) ── */}
      {saveError && (
        <div
          role="alert"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            color: '#be123c',
          }}
        >
          <Icon name="warning" size={20} color="#e11d48" />
          <div style={{ flex: 1, fontSize: '0.8125rem' }}>
            <strong>Configuration Save Failed:</strong> {saveError}
            <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#9f1239' }}>
              Your local draft changes have been preserved in the form. You can retry saving or reset changes.
            </div>
          </div>
        </div>
      )}

      {/* ── Validation Error Summary (HTTP 422) ── */}
      {Object.keys(validationErrors).length > 0 && (
        <div
          role="alert"
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem',
            color: '#c2410c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>
            <Icon name="warning" size={18} color="#ea580c" />
            Please correct the following configuration errors:
          </div>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0, fontSize: '0.8125rem' }}>
            {Object.entries(validationErrors).map(([fieldKey, errList]) => (
              <li key={fieldKey} style={{ marginBottom: '0.2rem' }}>
                <strong>{fieldKey}:</strong> {errList.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Loading Spinner State ── */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '350px',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading clinic module configuration...</p>
        </div>
      ) : loadError ? null : (
        <>
          {/* ── Station Modules Row: Registration → Triage → Treatment ── */}
          <div
            data-walkthrough="module-config-stations-row"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            {STATION_MODULES_CONFIG.map(({ key, label, desc, color, whenOn, whenOff }) => {
              const isEnabled = draft.stations[key];
              return (
                <div
                  key={key}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: `1.5px solid ${isEnabled ? color + '44' : '#e2e8f0'}`,
                    boxShadow: isEnabled ? `0 2px 8px ${color}18` : '0 1px 3px rgba(0,0,0,0.04)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: canEdit ? 1 : 0.9,
                  }}
                >
                  {/* Card Header & Switch */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{label}</span>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                        {desc}
                      </p>
                    </div>

                    {/* Accessible Switch Button */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`Toggle ${label}`}
                      disabled={!canEdit}
                      onClick={() => handleStationToggle(key)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleStationToggle(key);
                        }
                      }}
                      style={{
                        flexShrink: 0,
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        background: isEnabled ? color : '#cbd5e1',
                        border: 'none',
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        position: 'relative',
                        transition: 'background 0.2s',
                        outline: 'none',
                        boxShadow: isEnabled ? `0 0 0 3px ${color}33` : 'none',
                        padding: 0,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 3,
                          left: isEnabled ? 23 : 3,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                          transition: 'left 0.2s',
                          display: 'block',
                        }}
                      />
                    </button>
                  </div>

                  {/* Status row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.65rem',
                      background: isEnabled ? color + '0d' : '#f8fafc',
                      borderRadius: '8px',
                      border: `1px solid ${isEnabled ? color + '30' : '#e2e8f0'}`,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isEnabled ? color : '#94a3b8',
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isEnabled ? color : '#64748b' }}>
                      {isEnabled ? `${label.split(' ')[0]} Enabled` : `${label.split(' ')[0]} Disabled`}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45 }}>
                    {isEnabled ? whenOn : whenOff}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Active Patient Flow Diagram (Identifies Draft vs Saved State) ── */}
          <div
            data-walkthrough="module-config-flow-diagram"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                Patient Flow {hasChanges ? '(Draft Preview)' : '(Saved Active Flow)'}:
              </span>
              {[
                { label: 'Registration', enabled: draft.stations.registration_module_enabled, color: '#10b981' },
                { label: 'Triage', enabled: draft.stations.triage_module_enabled, color: '#10b981' },
                { label: 'Treatment', enabled: draft.stations.treatment_module_enabled, color: '#10b981' },
              ].map((step, idx) => (
                <span key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {idx > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>→</span>}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: step.enabled ? step.color : '#94a3b8',
                      textDecoration: step.enabled ? 'none' : 'line-through',
                      opacity: step.enabled ? 1 : 0.5,
                    }}
                  >
                    {step.label}
                  </span>
                </span>
              ))}
            </div>

            {hasChanges && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#d97706',
                  background: '#fef3c7',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                }}
              >
                ● Unsaved draft changes
              </span>
            )}
          </div>

          {stationPolicyError && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                color: '#991b1b',
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            >
              <strong>Invalid Station Workflow Combination:</strong> {stationPolicyError}
            </div>
          )}

          {/* ── Form Field Rules Accordion Groups ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Group 1: Registration Form Sections */}
            {draft.stations.registration_module_enabled && (
              <div
                data-walkthrough="module-config-registration-group"
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    paddingBottom: '0.875rem',
                    borderBottom: '1px solid #e0f2fe',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      Form 1 — Patient Registration Sections & Fields
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      Configure visibility and requirement rules for demographics, address, socioeconomic, and bite intake.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1rem',
                    alignItems: 'start',
                  }}
                >
                  {CANONICAL_SECTIONS.filter((s) => s.moduleKey === 'registration_module_enabled').map((section) =>
                    renderSectionCard(section)
                  )}
                </div>
              </div>
            )}

            {/* Group 2: Triage Form Sections */}
            {draft.stations.triage_module_enabled && (
              <div
                data-walkthrough="module-config-triage-group"
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #bbf7d0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    paddingBottom: '0.875rem',
                    borderBottom: '1px solid #dcfce7',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      Form 2 — Triage & Clinical Assessment Sections & Fields
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      WHO Category evaluation, bite site inspection, and animal observation during doctor assessment.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1rem',
                    alignItems: 'start',
                  }}
                >
                  {CANONICAL_SECTIONS.filter((s) => s.moduleKey === 'triage_module_enabled').map((section) =>
                    renderSectionCard(section)
                  )}
                </div>
              </div>
            )}

            {/* Group 3: Treatment Form Sections */}
            {draft.stations.treatment_module_enabled && (
              <div
                data-walkthrough="module-config-treatment-group"
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #fed7aa',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    paddingBottom: '0.875rem',
                    borderBottom: '1px solid #ffedd5',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      Form 3 — Treatment & Vaccination Sections & Fields
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                      Vaccine brand, route, dosage, batch tracking, and post-vaccination monitoring.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1rem',
                    alignItems: 'start',
                  }}
                >
                  {CANONICAL_SECTIONS.filter((s) => s.moduleKey === 'treatment_module_enabled').map((section) =>
                    renderSectionCard(section)
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Action Buttons (Save & Reset) ── */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {hasChanges && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b', marginRight: 'auto' }}>
                You have unsaved changes in your draft.
              </span>
            )}

            <button
              type="button"
              data-walkthrough="module-config-reset-btn"
              onClick={handleReset}
              disabled={saving || !hasChanges || !canEdit}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155',
                cursor: saving || !hasChanges || !canEdit ? 'not-allowed' : 'pointer',
                opacity: saving || !hasChanges || !canEdit ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              Reset Changes
            </button>

            <button
              type="button"
              data-walkthrough="module-config-save-btn"
              onClick={() => handleSave()}
              disabled={saving || !hasChanges || !canEdit || Boolean(stationPolicyError)}
              style={{
                background: hasChanges && canEdit && !stationPolicyError ? '#10b981' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: saving || !hasChanges || !canEdit || Boolean(stationPolicyError) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.15s',
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
                  Saving Configuration...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} color="#ffffff" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <ConfirmationDialog
          variant="success"
          title="Configuration Saved Successfully"
          message="Clinic module configurations, sections, and field validation rules have been committed to the server and cached for all form workflows."
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setShowSuccessModal(false)}
        />
      )}

      {/* ── Leave Page Guard Confirmation Dialog ── */}
      {showLeaveConfirmDialog && (
        <ConfirmationDialog
          variant="warning"
          title="Unsaved Changes Detected"
          message="You have unsaved changes in your module configuration draft. If you leave now, these changes will be discarded."
          confirmLabel="Discard & Leave"
          cancelLabel="Stay on Page"
          onConfirm={() => {
            setShowLeaveConfirmDialog(false);
            if (pendingNavigationPath) {
              navigate(pendingNavigationPath);
            }
          }}
          onCancel={() => {
            setShowLeaveConfirmDialog(false);
            setPendingNavigationPath(null);
          }}
        />
      )}

      {/* ── Revision Conflict Modal (HTTP 409) ── */}
      {conflictData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  background: '#fee2e2',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="warning" size={24} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  Configuration Revision Conflict
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                  Another administrator has modified and saved settings.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.875rem',
                fontSize: '0.8125rem',
                color: '#334155',
                marginBottom: '1.25rem',
                lineHeight: 1.5,
              }}
            >
              <div>
                <strong>Server Current Revision:</strong> #{conflictData.currentRevision}
              </div>
              <div>
                <strong>Your Draft Revision:</strong> #{conflictData.suppliedRevision}
              </div>
              <div style={{ marginTop: '0.5rem', color: '#64748b' }}>
                Your draft has not been discarded. You may choose to overwrite with your draft using the latest revision
                counter, or discard your draft to load the current server version.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setConflictData(null);
                  loadConfig();
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Discard Draft & Load Server Version
              </button>
              <button
                type="button"
                onClick={() => {
                  const newRev = conflictData.currentRevision;
                  setConflictData(null);
                  handleSave(newRev);
                }}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Adopt & Overwrite with My Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Configuration Audit History Modal ── */}
      {showHistoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                  Module Configuration Change History
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                  Audited configuration update events recorded for your clinic
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0.25rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Loading change history...
                </div>
              ) : historyError ? (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px' }}>
                  {historyError}
                </div>
              ) : historyItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No configuration change records found for this clinic.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        background: '#f8fafc',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                            {item.description || item.action}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                            By {item.user?.name ?? 'System'} ({item.user?.role ?? 'Staff'}) ·{' '}
                            {item.user?.email ?? ''}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: '#64748b',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                          }}
                        >
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Diff Preview */}
                      {(item.old_values || item.new_values) && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            fontSize: '0.75rem',
                            background: '#ffffff',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            padding: '0.5rem 0.75rem',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                            Changed Attributes:
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              color: '#334155',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {JSON.stringify({ old: item.old_values, new: item.new_values }, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render an individual section card
  function renderSectionCard(section: SectionMeta) {
    const isExpanded = expandedSections.includes(section.id);
    const isSectionEnabled = draft.sections[section.id];
    const stats = getSectionStats(section);
    const hasSectionError = validationErrors[section.id] !== undefined;

    return (
      <div
        key={section.id}
        style={{
          border: `1.5px solid ${hasSectionError ? '#f87171' : isSectionEnabled ? '#e2e8f0' : '#f1f5f9'}`,
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s',
        }}
      >
        {/* Accordion header button: ONLY expands/collapses accordion */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            background: isExpanded ? '#f8fafc' : '#ffffff',
            borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none',
            boxSizing: 'border-box',
          }}
        >
          {/* Clickable area for accordion expansion */}
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={`section-content-${section.id}`}
            onClick={() => toggleAccordion(section.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <Icon
              name={section.icon as any}
              size={18}
              color={isSectionEnabled ? '#0284c7' : '#94a3b8'}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isSectionEnabled ? '#1e293b' : '#94a3b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  marginTop: '0.15rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {section.description}
              </div>
            </div>
          </button>

          {/* Section Action Controls: Switch & Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
              marginLeft: '0.75rem',
            }}
          >
            {/* Accessible Switch Button — Stop propagation to prevent accordion toggling */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                role="switch"
                aria-checked={isSectionEnabled}
                aria-label={`Enable section ${section.title}`}
                disabled={!canEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSectionToggle(section.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSectionToggle(section.id);
                  }
                }}
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 11,
                  background: isSectionEnabled ? '#10b981' : '#cbd5e1',
                  border: 'none',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                  position: 'relative',
                  transition: 'background 0.2s',
                  outline: 'none',
                  padding: 0,
                  boxShadow: isSectionEnabled ? '0 0 0 2px #10b98133' : 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: isSectionEnabled ? 18 : 2,
                    width: 18,
                    height: 18,
                    background: '#ffffff',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    display: 'block',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                  }}
                />
              </button>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: isSectionEnabled ? '#10b981' : '#94a3b8',
                  userSelect: 'none',
                  minWidth: '46px',
                }}
              >
                {isSectionEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {/* Stats summary */}
            <div
              style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
                borderLeft: '1px solid #e2e8f0',
                paddingLeft: '0.5rem',
              }}
            >
              {stats.required}R · {stats.optional}O · {stats.hidden}H
            </div>

            {/* Accordion expand indicator */}
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
              onClick={() => toggleAccordion(section.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2.5"
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        {isExpanded && (
          <div
            id={`section-content-${section.id}`}
            style={{
              padding: '0.75rem 1rem 1rem 1rem',
              borderTop: '1px solid #f8fafc',
            }}
          >
            {!isSectionEnabled ? (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#64748b',
                  fontSize: '0.78rem',
                }}
              >
                <Icon name="info" size={16} color="#94a3b8" />
                This section is <strong>Disabled</strong>. Field rules below will be inactive in patient forms while disabled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {section.fields.map((field) => {
                  const currentRule = draft.fieldRules[field.key] ?? DEFAULT_CANONICAL_FIELD_RULES[field.key];
                  const fieldErrorKey = `field_rules.${field.key}`;
                  const hasFieldError = validationErrors[fieldErrorKey] !== undefined;

                  return (
                    <div
                      key={field.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.75rem',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: `1px solid ${hasFieldError ? '#f87171' : '#f1f5f9'}`,
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <label htmlFor={`field-select-${field.key}`}>{field.label}</label>
                          {field.locked && (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              Locked Safeguard
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                          {field.description}
                        </div>
                        {hasFieldError && (
                          <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.2rem' }}>
                            {validationErrors[fieldErrorKey].join(', ')}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div>{getFieldRuleBadge(currentRule)}</div>

                        {field.locked ? (
                          <select
                            id={`field-select-${field.key}`}
                            disabled
                            value="required"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8125rem',
                              color: '#64748b',
                              cursor: 'not-allowed',
                            }}
                          >
                            <option value="required">Required (Locked)</option>
                          </select>
                        ) : (
                          <select
                            id={`field-select-${field.key}`}
                            aria-label={`Rule for ${field.label}`}
                            disabled={!canEdit}
                            value={currentRule}
                            onChange={(e) =>
                              handleFieldRuleChange(field.key, e.target.value as FieldRuleValue)
                            }
                            style={{
                              background: '#ffffff',
                              border: `1px solid ${hasFieldError ? '#ef4444' : '#cbd5e1'}`,
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8125rem',
                              color: '#1e293b',
                              cursor: canEdit ? 'pointer' : 'not-allowed',
                              outline: 'none',
                            }}
                          >
                            <option value="required">Required</option>
                            <option value="optional">Optional</option>
                            <option value="hidden">Hidden</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
