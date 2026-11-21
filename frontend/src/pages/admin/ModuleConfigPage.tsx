import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import {
  clinicConfigApi,
  ClinicConfigConflictError,
  ClinicConfigValidationError,
} from '../../api/clinicConfigApi';
import { useClinicModuleConfig } from '../../hooks/useClinicModuleConfig';
import { SECTION_SURFACES, SURFACE_LABELS } from '../../shared/forms/configuredFieldPolicy';
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
      { key: 'animal_status', label: 'Animal Ownership', description: 'Owned, Stray, or Unknown (Mobile Intake and Web Form 1)' },
      { key: 'animal_captured', label: 'Animal Captured / Restrained', description: 'Whether the animal was captured or restrained (Mobile Intake and Web Form 1)' },
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
  const [activeTab, setActiveTab] = useState<'modules' | 'form1' | 'form2' | 'form3'>('modules');

  // Accordion expansion state
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'patient_registration_enabled',
    'bite_intake_section_enabled',
    'fees_and_payment',
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

  const formatSectionStatsText = (stats: { required: number; optional: number; hidden: number }) => {
    const parts: string[] = [];
    if (stats.required > 0) parts.push(`${stats.required} required`);
    if (stats.optional > 0) parts.push(`${stats.optional} optional`);
    if (stats.hidden > 0) parts.push(`${stats.hidden} hidden`);
    return parts.join(' · ') || 'No fields';
  };

  const renderFieldRuleControl = (field: FieldMeta, currentRule: FieldRuleValue, hasFieldError: boolean) => {
    if (field.locked) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.7rem',
            borderRadius: '6px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Required (Locked)
        </span>
      );
    }

    const options: Array<{ value: FieldRuleValue; label: string; activeBg: string; activeColor: string; activeBorder: string }> = [
      { value: 'required', label: 'Required', activeBg: '#ecfdf5', activeColor: '#047857', activeBorder: '#10b981' },
      { value: 'optional', label: 'Optional', activeBg: '#eff6ff', activeColor: '#1d4ed8', activeBorder: '#60a5fa' },
      { value: 'hidden', label: 'Hidden', activeBg: '#f1f5f9', activeColor: '#475569', activeBorder: '#94a3b8' },
    ];

    return (
      <div
        role="radiogroup"
        aria-label={`Rule for ${field.label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f8fafc',
          border: `1px solid ${hasFieldError ? '#ef4444' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '2px',
          gap: '2px',
          flexShrink: 0,
        }}
      >
        {options.map((opt) => {
          const isActive = currentRule === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={!canEdit}
              onClick={() => handleFieldRuleChange(field.key, opt.value)}
              style={{
                padding: '0.28rem 0.65rem',
                borderRadius: '6px',
                border: isActive ? `1px solid ${opt.activeBorder}` : '1px solid transparent',
                background: isActive ? opt.activeBg : 'transparent',
                color: isActive ? opt.activeColor : '#64748b',
                fontSize: '0.75rem',
                fontWeight: isActive ? 700 : 500,
                cursor: canEdit ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Box sx={{ width: '100%', pb: hasChanges && canEdit ? 8 : 2 }}>
      {/* ── Page Header ── */}
      <Box
        data-walkthrough="module-config-header"
        sx={{
          mb: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography
              component="h1"
              sx={{
                fontSize: '22px',
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: '-0.5px',
                color: 'var(--text-h, #111827)',
                mb: 0.5,
              }}
            >
              Module Configuration
            </Typography>

            {!canEdit && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '0.18rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Icon name="info" size={13} color="#92400e" />
                Read-Only
              </span>
            )}
          </Box>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleGuardedNavigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Module Configuration</span>
          </div>
        </Box>

        {/* Header Actions */}
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            data-walkthrough="module-config-history-btn"
            variant="outlined"
            size="small"
            onClick={openHistory}
            startIcon={<Icon name="activity" size={16} color="#475569" />}
            sx={{
              textTransform: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              borderColor: '#d7e3da',
              height: 38,
              px: 1.75,
              borderRadius: 1.5,
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
            }}
          >
            {savedBaseline ? `Audit History (Rev #${savedBaseline.revision})` : 'Audit History'}
          </Button>

          {canEdit && (
            <Button
              data-walkthrough="module-config-save-btn"
              variant={hasChanges && !stationPolicyError ? 'contained' : 'outlined'}
              size="small"
              startIcon={<SaveIcon sx={{ fontSize: 17 }} />}
              onClick={() => handleSave()}
              disabled={saving || !hasChanges || Boolean(stationPolicyError)}
              disableElevation
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                px: 2,
                height: 38,
                borderRadius: 1.5,
                ...(hasChanges && !stationPolicyError
                  ? {
                      bgcolor: '#10b981',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#059669' },
                    }
                  : {
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                    }),
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </Box>
      </Box>

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
          {/* ── Borderless Navigation Tabs ── */}
          <Box sx={{ borderBottom: '1px solid var(--border-glow, #e2e8f0)', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 42,
                '& .MuiTabs-indicator': {
                  backgroundColor: '#10b981',
                  height: 2.5,
                  borderRadius: '2px 2px 0 0',
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: '#64748b',
                  minHeight: 42,
                  px: 2,
                  '&.Mui-selected': {
                    color: '#059669',
                    fontWeight: 700,
                  },
                },
              }}
            >
              <Tab value="modules" label="Modules & Flow" />
              <Tab
                value="form1"
                label={draft.stations.registration_module_enabled ? 'Form 1: Registration' : 'Form 1: Registration (Off)'}
              />
              <Tab
                value="form2"
                label={draft.stations.triage_module_enabled ? 'Form 2: Triage' : 'Form 2: Triage (Off)'}
              />
              <Tab
                value="form3"
                label={draft.stations.treatment_module_enabled ? 'Form 3: Treatment' : 'Form 3: Treatment (Off)'}
              />
            </Tabs>
          </Box>

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

          {/* ── TAB 1: MODULES & FLOW ── */}
          {activeTab === 'modules' && (
            <Paper
              elevation={0}
              sx={{
                border: '1px solid var(--border-glow, #e0eae3)',
                borderRadius: 2,
                p: 3,
                bgcolor: 'var(--card-bg-solid, #fff)',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CLINIC WORKFLOW MODULES
              </Typography>
              <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 2.5 }} />

              <div
                data-walkthrough="module-config-stations-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
                        background: isEnabled ? '#ffffff' : '#f8fafc',
                        borderRadius: '10px',
                        border: `1px solid ${isEnabled ? '#a7f3d0' : '#e2e8f0'}`,
                        borderTop: `3px solid ${isEnabled ? '#10b981' : '#cbd5e1'}`,
                        padding: '1.15rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        transition: 'border-color 0.2s, background 0.2s',
                        opacity: canEdit ? 1 : 0.9,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{label}</div>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
                            {desc}
                          </p>
                        </div>

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
                            width: 42,
                            height: 24,
                            borderRadius: 12,
                            background: isEnabled ? color : '#cbd5e1',
                            border: 'none',
                            cursor: canEdit ? 'pointer' : 'not-allowed',
                            position: 'relative',
                            transition: 'background 0.2s',
                            outline: 'none',
                            padding: 0,
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 3,
                              left: isEnabled ? 21 : 3,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
                              transition: 'left 0.2s',
                              display: 'block',
                            }}
                          />
                        </button>
                      </div>

                      <p style={{ margin: '0.25rem 0 0 0', paddingTop: '0.55rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: isEnabled ? '#047857' : '#64748b', lineHeight: 1.45 }}>
                        {isEnabled ? whenOn : whenOff}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Active Patient Flow */}
              <div
                data-walkthrough="module-config-flow-diagram"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    Patient Flow {hasChanges ? '(Draft Preview)' : '(Active)'}:
                  </span>
                  {[
                    { label: 'Registration', enabled: draft.stations.registration_module_enabled },
                    { label: 'Triage', enabled: draft.stations.triage_module_enabled },
                    { label: 'Treatment', enabled: draft.stations.treatment_module_enabled },
                  ].map((step, idx) => (
                    <span key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {idx > 0 && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>→</span>}
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: step.enabled ? '#059669' : '#94a3b8',
                          textDecoration: step.enabled ? 'none' : 'line-through',
                          opacity: step.enabled ? 1 : 0.55,
                        }}
                      >
                        {step.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </Paper>
          )}

          {/* ── TAB 2: FORM 1 — REGISTRATION ── */}
          {activeTab === 'form1' && (
            <Paper
              data-walkthrough="module-config-registration-group"
              elevation={0}
              sx={{
                border: '1px solid var(--border-glow, #e0eae3)',
                borderRadius: 2,
                p: 3,
                bgcolor: 'var(--card-bg-solid, #fff)',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FORM 1 — PATIENT REGISTRATION SECTIONS &amp; FIELDS
              </Typography>
              <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 2.5 }} />

              {!draft.stations.registration_module_enabled ? (
                <Box sx={{ p: 3, borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                  The Registration Module is currently disabled. Enable it under <strong>Modules &amp; Flow</strong> to configure Form 1 sections.
                </Box>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {CANONICAL_SECTIONS.filter((s) => s.moduleKey === 'registration_module_enabled').map((section) =>
                    renderSectionCard(section)
                  )}
                  {renderFeesAndPaymentCard()}
                </div>
              )}
            </Paper>
          )}

          {/* ── TAB 3: FORM 2 — TRIAGE ── */}
          {activeTab === 'form2' && (
            <Paper
              data-walkthrough="module-config-triage-group"
              elevation={0}
              sx={{
                border: '1px solid var(--border-glow, #e0eae3)',
                borderRadius: 2,
                p: 3,
                bgcolor: 'var(--card-bg-solid, #fff)',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FORM 2 — TRIAGE &amp; CLINICAL ASSESSMENT
              </Typography>
              <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 2.5 }} />

              {!draft.stations.triage_module_enabled ? (
                <Box sx={{ p: 3, borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                  The Triage Module is currently disabled. Enable it under <strong>Modules &amp; Flow</strong> to configure Form 2 fields.
                </Box>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {CANONICAL_SECTIONS.filter((s) => s.moduleKey === 'triage_module_enabled').map((section) =>
                    renderSectionCard(section)
                  )}
                </div>
              )}
            </Paper>
          )}

          {/* ── TAB 4: FORM 3 — TREATMENT ── */}
          {activeTab === 'form3' && (
            <Paper
              data-walkthrough="module-config-treatment-group"
              elevation={0}
              sx={{
                border: '1px solid var(--border-glow, #e0eae3)',
                borderRadius: 2,
                p: 3,
                bgcolor: 'var(--card-bg-solid, #fff)',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FORM 3 — TREATMENT &amp; VACCINATION
              </Typography>
              <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 2.5 }} />

              {!draft.stations.treatment_module_enabled ? (
                <Box sx={{ p: 3, borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                  The Treatment Module is currently disabled. Enable it under <strong>Modules &amp; Flow</strong> to configure Form 3 fields.
                </Box>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {CANONICAL_SECTIONS.filter((s) => s.moduleKey === 'treatment_module_enabled').map((section) =>
                    renderSectionCard(section)
                  )}
                </div>
              )}
            </Paper>
          )}

          {/* ── Sticky Save Bar (appears only when there are unsaved changes) ── */}
          {hasChanges && canEdit && (
            <Paper
              elevation={4}
              sx={{
                position: 'sticky',
                bottom: 16,
                zIndex: 30,
                mt: 3,
                px: 2.5,
                py: 1.5,
                borderRadius: 2,
                border: '1px solid #a7f3d0',
                bgcolor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#111827' }}>
                  Unsaved configuration changes
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Button
                  data-walkthrough="module-config-reset-btn"
                  variant="outlined"
                  size="small"
                  onClick={handleReset}
                  disabled={saving}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: '#475569',
                    borderColor: '#cbd5e1',
                    px: 2,
                    py: 0.75,
                    borderRadius: 1.5,
                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                  }}
                >
                  Discard
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSave()}
                  disabled={saving || Boolean(stationPolicyError)}
                  disableElevation
                  sx={{
                    bgcolor: '#10b981',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    px: 2.5,
                    py: 0.75,
                    borderRadius: 1.5,
                    '&:hover': { bgcolor: '#059669' },
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Paper>
          )}
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
    </Box>
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
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.3rem' }} aria-label="Affected surfaces">
                {(SECTION_SURFACES[section.id as keyof typeof SECTION_SURFACES] ?? []).map((surface) => (
                  <span
                    key={surface}
                    style={{ fontSize: '0.62rem', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, padding: '1px 6px' }}
                  >
                    {SURFACE_LABELS[surface]}
                  </span>
                ))}
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
            {/* Stats summary */}
            <div
              style={{
                fontSize: '0.72rem',
                color: '#64748b',
                borderRight: '1px solid #e2e8f0',
                paddingRight: '0.65rem',
                whiteSpace: 'nowrap',
              }}
            >
              {formatSectionStatsText(stats)}
            </div>

            {/* Accessible Switch Button — Stop propagation to prevent accordion toggling */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                  minWidth: '48px',
                }}
              >
                {isSectionEnabled ? 'Enabled' : 'Disabled'}
              </span>
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

                      {renderFieldRuleControl(field, currentRule, hasFieldError)}
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

  // Helper to render the Fees and Payment section card under Registration
  function renderFeesAndPaymentCard() {
    const isExpanded = expandedSections.includes('fees_and_payment');
    const rigRule = draft.fieldRules.rig_fee ?? 'hidden';
    const antiRabiesRule = draft.fieldRules.anti_rabies_fee ?? 'hidden';
    const additionalRule = draft.fieldRules.additional_fees ?? 'hidden';

    const allHidden = rigRule === 'hidden' && antiRabiesRule === 'hidden' && additionalRule === 'hidden';
    const feeFields: FieldMeta[] = [
      {
        key: 'rig_fee',
        label: 'RIG Fee',
        description: 'Rabies Immune Globulin fee recorded at registration',
      },
      {
        key: 'anti_rabies_fee',
        label: 'Anti-Rabies Vaccine Fee',
        description: 'Anti-rabies vaccine dose fee recorded at registration',
      },
      {
        key: 'additional_fees',
        label: 'Additional Fees',
        description: 'Repeatable additional fee items (Anti-tetanus, ATS, other fees)',
      },
    ];

    const hasAnyError = feeFields.some((f) => validationErrors[`field_rules.${f.key}`] !== undefined);

    return (
      <div
        key="fees_and_payment"
        data-walkthrough="module-config-fees-section"
        style={{
          border: `1.5px solid ${hasAnyError ? '#f87171' : !allHidden ? '#38bdf8' : '#e2e8f0'}`,
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s',
        }}
      >
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
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls="section-content-fees_and_payment"
            onClick={() => toggleAccordion('fees_and_payment')}
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
              name="settings"
              size={18}
              color={!allHidden ? '#0284c7' : '#94a3b8'}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: !allHidden ? '#1e293b' : '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Fees and Payment
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
                Registration fee items (RIG, Anti-Rabies, Additional Fees)
              </div>
            </div>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
              marginLeft: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: allHidden ? '#94a3b8' : '#0284c7',
                background: allHidden ? '#f1f5f9' : '#e0f2fe',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                userSelect: 'none',
              }}
            >
              {allHidden ? 'All Hidden (Section Hidden)' : 'Active at Registration'}
            </span>

            <button
              type="button"
              aria-label={isExpanded ? 'Collapse Fees and Payment' : 'Expand Fees and Payment'}
              onClick={() => toggleAccordion('fees_and_payment')}
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

        {isExpanded && (
          <div
            id="section-content-fees_and_payment"
            style={{
              padding: '0.75rem 1rem 1rem 1rem',
              borderTop: '1px solid #f8fafc',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {feeFields.map((field) => {
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

                    {renderFieldRuleControl(field, currentRule, hasFieldError)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
}
