import { useState, useEffect, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  ArrowForwardOutlined,
  AssignmentIndOutlined,
  CheckCircleOutlined,
  EventNoteOutlined,
  MedicalInformationOutlined,
  MonitorHeartOutlined,
  RestartAltOutlined,
  Save as SaveIcon,
  TuneOutlined,
  VaccinesOutlined,
} from '@mui/icons-material';
import { ROUTES } from '../../../shared/config/routes';
import { clinicConfigApi } from '../../../api/clinicConfigApi';
import { useClinicModuleConfig } from '../../../hooks/useClinicModuleConfig';
import type { ClinicModuleConfig, FieldRuleValue } from '../../../types';
import { DEFAULT_CANONICAL_FIELD_RULES } from '../../../types';
import Loader from '../../../components/Loader';

type PresetKey = 'public' | 'private';
type VisitKey = 'new' | 'return';
type OptionalSections = { socioeconomic: boolean; government: boolean; fees: boolean };

type PreviewStep = {
  key: string;
  title: string;
  shortDesc: string;
  fields: string[];
  flowSummary: string;
  icon: ReactNode;
  planned?: boolean;
};

type TemplateDefinition = {
  title: string;
  subtitle: string;
  visits: Record<VisitKey, PreviewStep[]>;
};

const TEMPLATES: Record<PresetKey, TemplateDefinition> = {
  public: {
    title: 'Public ABTC',
    subtitle:
      'Standard DOH public health workflow. Core clinical forms stay active; toggle optional Form 1 sections below and click Apply Template to save.',
    visits: {
      new: [
        {
          key: 'registration',
          title: 'Registration',
          shortDesc: 'Patient & bite intake',
          fields: [
            'Patient details',
            'Contact & address',
            'Exposure date & place',
            'Animal & wound details',
            'Prior vaccination',
          ],
          flowSummary: 'Find or register the patient and record the exposure → enters the assessment queue.',
          icon: <AssignmentIndOutlined fontSize="small" />,
        },
        {
          key: 'assessment',
          title: 'Doctor Assessment',
          shortDesc: 'Form 2 consultation & category',
          fields: [
            'History & vital signs',
            'Wound & animal assessment',
            'Exposure category (I / II / III)',
            'Diagnosis & treatment decision',
          ],
          flowSummary: 'Document the clinical assessment and approve a treatment plan → moves to nurse treatment.',
          icon: <MedicalInformationOutlined fontSize="small" />,
        },
        {
          key: 'treatment',
          title: 'Nurse Treatment',
          shortDesc: 'Form 3 vaccination & batch',
          fields: [
            'Prescribed dose',
            'Vaccine, route & batch',
            'RIG or tetanus (if ordered)',
            'Date & vaccinator',
          ],
          flowSummary: 'Administer and record the dose against the approved plan → leads to next appointment.',
          icon: <VaccinesOutlined fontSize="small" />,
        },
        {
          key: 'followup',
          title: 'Follow-up',
          shortDesc: 'Next dose schedule',
          fields: ['Dose given', 'Next due date', 'Return instructions'],
          flowSummary: 'Confirm the next appointment date → patient checks in under the same bite episode.',
          icon: <EventNoteOutlined fontSize="small" />,
        },
      ],
      return: [
        {
          key: 'checkin',
          title: 'Check-in',
          shortDesc: 'Find existing bite episode',
          fields: ['Existing patient', 'Bite episode', 'Scheduled appointment', 'Dose due'],
          flowSummary: 'Locate the existing bite episode and check in the scheduled visit → goes to treatment.',
          icon: <AssignmentIndOutlined fontSize="small" />,
        },
        {
          key: 'treatment',
          title: 'Nurse Treatment',
          shortDesc: 'Record follow-up dose',
          fields: ['Approved plan & last dose', 'Dose due', 'Vaccine, route & batch', 'Date & vaccinator'],
          flowSummary: 'Verify due dose (reassess if symptoms changed) and record administration → update schedule.',
          icon: <VaccinesOutlined fontSize="small" />,
        },
        {
          key: 'followup',
          title: 'Next Visit',
          shortDesc: 'Confirm remaining doses',
          fields: ['Updated dose history', 'Next due date', 'Return instructions'],
          flowSummary: 'Confirm the next due date or mark the prescribed vaccination course complete.',
          icon: <EventNoteOutlined fontSize="small" />,
        },
      ],
    },
  },
  private: {
    title: 'Basic Template',
    subtitle:
      'Streamlined clinical essentials for faster intake — hides Socioeconomic & Government Programs and turns on Registration Fees on Form 1.',
    visits: {
      new: [
        {
          key: 'registration',
          title: 'Registration & Fees',
          shortDesc: 'Core intake & Form 1 fees',
          fields: [
            'Patient details',
            'Contact & address',
            'Exposure date & place',
            'Animal & wound details',
            'Prior vaccination',
          ],
          flowSummary: 'Register patient, record exposure details, and log applicable Form 1 fees → enters assessment queue.',
          icon: <AssignmentIndOutlined fontSize="small" />,
        },
        {
          key: 'assessment',
          title: 'Doctor Assessment',
          shortDesc: 'Form 2 vitals & category',
          fields: [
            'History & vital signs',
            'Wound & animal assessment',
            'Exposure category (I / II / III)',
            'Treatment decision',
          ],
          flowSummary: 'Record vitals, assign WHO exposure category, and approve the treatment plan → moves to nurse treatment.',
          icon: <MonitorHeartOutlined fontSize="small" />,
        },
        {
          key: 'treatment',
          title: 'Nurse Treatment',
          shortDesc: 'Form 3 dose & batch',
          fields: [
            'Prescribed dose',
            'Vaccine, route & batch',
            'RIG or tetanus (if ordered)',
            'Date & vaccinator',
          ],
          flowSummary: 'Administer and record the prescribed vaccine dose against the approved plan → leads to follow-up.',
          icon: <VaccinesOutlined fontSize="small" />,
        },
        {
          key: 'followup',
          title: 'Follow-up',
          shortDesc: 'Next dose schedule',
          fields: ['Dose given', 'Next due date', 'Return instructions'],
          flowSummary: 'Confirm the next appointment date → returning visits check in under the same bite episode.',
          icon: <EventNoteOutlined fontSize="small" />,
        },
      ],
      return: [
        {
          key: 'checkin',
          title: 'Check-in',
          shortDesc: 'Find existing bite episode',
          fields: ['Existing patient', 'Bite episode', 'Scheduled appointment', 'Dose due'],
          flowSummary: 'Open the existing episode rather than creating a new bite case → goes to treatment.',
          icon: <AssignmentIndOutlined fontSize="small" />,
        },
        {
          key: 'treatment',
          title: 'Nurse Treatment',
          shortDesc: 'Record follow-up dose',
          fields: ['Approved plan & last dose', 'Dose due', 'Vaccine, route & batch', 'Date & vaccinator'],
          flowSummary: 'Verify due dose (reassess if symptoms changed) and record administration → update schedule.',
          icon: <VaccinesOutlined fontSize="small" />,
        },
        {
          key: 'followup',
          title: 'Next Visit',
          shortDesc: 'Confirm remaining doses',
          fields: ['Updated dose history', 'Next due date', 'Return instructions'],
          flowSummary: 'Confirm the next appointment date or mark the prescribed vaccination course complete.',
          icon: <EventNoteOutlined fontSize="small" />,
        },
      ],
    },
  },
};

const SECTION_DEFAULTS: Record<PresetKey, OptionalSections> = {
  public: { socioeconomic: true, government: true, fees: false },
  private: { socioeconomic: false, government: false, fees: true },
};

const OPTIONAL_SECTION_ROWS: { key: keyof OptionalSections; title: string; detail: string; chipLabel: string }[] = [
  {
    key: 'socioeconomic',
    title: 'Socioeconomic Information',
    detail: 'Educational Attainment, Employment Status, Family Member Position',
    chipLabel: 'Socioeconomic info',
  },
  {
    key: 'government',
    title: 'Government Programs',
    detail: 'PhilHealth, 4Ps, DSWD, Senior Citizen, PWD memberships',
    chipLabel: 'Government programs & PhilHealth',
  },
  {
    key: 'fees',
    title: 'Registration Fees & Payment',
    detail: 'RIG Fee, Anti-Rabies Vaccine Fee, and Additional Fees on Form 1',
    chipLabel: 'Registration fees',
  },
];

const CORE_FORMS = [
  { form: 'Form 1', title: 'Patient & Bite Intake', detail: 'Identity, address & exposure details' },
  { form: 'Form 2', title: 'Doctor Assessment', detail: 'Vitals, WHO category & treatment plan' },
  { form: 'Form 3', title: 'Vaccination & Follow-up', detail: 'Dose administration, batch & next visit' },
];

const extractLiveSections = (cfg: ClinicModuleConfig): OptionalSections => {
  const rules = cfg.field_rules || DEFAULT_CANONICAL_FIELD_RULES;
  const feesEnabled =
    (rules.rig_fee ?? 'hidden') !== 'hidden' ||
    (rules.anti_rabies_fee ?? 'hidden') !== 'hidden' ||
    (rules.additional_fees ?? 'hidden') !== 'hidden';
  return {
    socioeconomic: Boolean(cfg.socioeconomic_section_enabled),
    government: Boolean(cfg.gov_programs_section_enabled),
    fees: feesEnabled,
  };
};

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' },
};

export default function PredefinedTemplatesPage() {
  const navigate = useNavigate();
  const { invalidateConfig } = useClinicModuleConfig();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveConfig, setLiveConfig] = useState<ClinicModuleConfig | null>(null);
  const [preset, setPreset] = useState<PresetKey>('public');
  const [visit, setVisit] = useState<VisitKey>('new');
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedSections, setSelectedSections] = useState<OptionalSections>({ ...SECTION_DEFAULTS.public });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadLiveConfig = async () => {
    try {
      setLoading(true);
      const cfg = await clinicConfigApi.getModuleConfig();
      setLiveConfig(cfg);
      const liveSecs = extractLiveSections(cfg);
      setSelectedSections(liveSecs);
      if (!liveSecs.socioeconomic && !liveSecs.government) {
        setPreset('private');
      } else {
        setPreset('public');
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to load current clinic configuration.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveConfig();
  }, []);

  const liveSections = liveConfig ? extractLiveSections(liveConfig) : null;
  const hasLiveChanges = Boolean(
    liveSections && (
      selectedSections.socioeconomic !== liveSections.socioeconomic ||
      selectedSections.government !== liveSections.government ||
      selectedSections.fees !== liveSections.fees
    )
  );

  const liveMatchesPreset = (key: PresetKey) => {
    if (!liveSections) return false;
    const def = SECTION_DEFAULTS[key];
    return (
      liveSections.socioeconomic === def.socioeconomic &&
      liveSections.government === def.government &&
      liveSections.fees === def.fees
    );
  };

  const template = TEMPLATES[preset];
  const steps = template.visits[visit];
  const step = steps[stepIndex] || steps[0];

  const handleSelectPreset = (next: PresetKey) => {
    setPreset(next);
    setStepIndex(0);
    setSelectedSections({ ...SECTION_DEFAULTS[next] });
  };

  const handleSelectVisit = (next: VisitKey) => {
    setVisit(next);
    setStepIndex(0);
  };

  const handleToggleSection = (key: keyof OptionalSections) => {
    setSelectedSections((cur) => ({ ...cur, [key]: !cur[key] }));
  };

  const handleResetToLive = () => {
    if (liveSections) {
      setSelectedSections({ ...liveSections });
      setStepIndex(0);
      if (!liveSections.socioeconomic && !liveSections.government) {
        setPreset('private');
      } else {
        setPreset('public');
      }
    }
  };

  const handleApplyTemplate = async () => {
    if (!liveConfig) return;
    try {
      setSaving(true);
      const currentRules = {
        ...DEFAULT_CANONICAL_FIELD_RULES,
        ...(liveConfig.field_rules || {}),
      };

      const nextFeeRule = (existing: FieldRuleValue | undefined): FieldRuleValue =>
        selectedSections.fees ? (existing === 'required' ? 'required' : 'optional') : 'hidden';

      const nextRules = {
        ...currentRules,
        rig_fee: nextFeeRule(currentRules.rig_fee),
        anti_rabies_fee: nextFeeRule(currentRules.anti_rabies_fee),
        additional_fees: nextFeeRule(currentRules.additional_fees),
        exposure_category: 'required' as const,
      };

      const updated = await clinicConfigApi.updateModuleConfig({
        revision: liveConfig.revision,
        triage_module_enabled: true,
        registration_module_enabled: true,
        treatment_module_enabled: true,
        patient_registration_enabled: true,
        address_section_enabled: true,
        socioeconomic_section_enabled: selectedSections.socioeconomic,
        gov_programs_section_enabled: selectedSections.government,
        bite_intake_section_enabled: true,
        triage_section_enabled: true,
        treatment_section_enabled: true,
        field_rules: nextRules,
      });

      setLiveConfig(updated);
      setSelectedSections(extractLiveSections(updated));
      invalidateConfig();
      setConfirmOpen(false);
      setSnackbar({
        open: true,
        message: `${template.title} applied to live clinic configuration (Revision #${updated.revision}).`,
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to apply template. Please try again.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !liveConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: hasLiveChanges ? 10 : 4 }}>
      {/* Page Header */}
      <Box
        data-walkthrough="templates-header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2.5,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: 'var(--text-primary, #111827)', letterSpacing: '-0.02em', mb: 0.25 }}
          >
            Predefined Templates
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.85rem' }}>
            <Box
              component="span"
              onClick={() => navigate('/dashboard')}
              sx={{ color: '#2563eb', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              Dashboard
            </Box>
            <Box component="span" sx={{ color: '#9ca3af' }}>›</Box>
            <Box component="span" sx={{ color: '#6b7280' }}>Clinic Setup</Box>
            <Box component="span" sx={{ color: '#9ca3af' }}>›</Box>
            <Box component="span" sx={{ color: '#6b7280' }}>Predefined Templates</Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            component={RouterLink}
            to={ROUTES.CLINIC_SETUP.MODULES}
            variant="outlined"
            startIcon={<TuneOutlined fontSize="small" />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: 1.5,
              borderColor: 'var(--border-glow, #e2e8f0)',
              color: 'var(--text-primary, #374151)',
              bgcolor: 'var(--card-bg-solid, #ffffff)',
              px: 2,
              py: 0.85,
              '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.04)' },
            }}
          >
            Module Settings
          </Button>

          <Button
            data-walkthrough="templates-save-preview-btn"
            variant="contained"
            startIcon={<SaveIcon fontSize="small" />}
            disabled={!hasLiveChanges || saving}
            onClick={() => setConfirmOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: 1.5,
              px: 2.25,
              py: 0.85,
              bgcolor: '#10b981',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#059669', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' },
              '&.Mui-disabled': { bgcolor: '#f3f4f6', color: '#9ca3af' },
            }}
          >
            {saving ? 'Applying...' : 'Apply Template'}
          </Button>
        </Box>
      </Box>

      {/* Borderless Template Tabs (Matches Clinic Info / Operating Schedule / Module Config) */}
      <Box
        data-walkthrough="templates-presets-grid"
        sx={{ borderBottom: '1px solid var(--border-glow, #e5e7eb)', mb: 3 }}
      >
        <Tabs
          value={preset}
          onChange={(_, val: PresetKey) => handleSelectPreset(val)}
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': {
              backgroundColor: '#10b981',
              height: 2.5,
              borderRadius: '2px 2px 0 0',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#6b7280',
              minHeight: 44,
              px: 2.5,
              '&.Mui-selected': { color: '#059669', fontWeight: 700 },
              '&:hover': { color: '#111827' },
            },
          }}
        >
          {(['public', 'private'] as PresetKey[]).map((key) => {
            const isLive = liveMatchesPreset(key);
            return (
              <Tab
                key={key}
                value={key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{TEMPLATES[key].title}</span>
                    {isLive && (
                      <Chip
                        icon={<CheckCircleOutlined sx={{ fontSize: '14px !important', color: '#059669 !important' }} />}
                        label="Active"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(16, 185, 129, 0.12)',
                          color: '#047857',
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Main Content Card */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid var(--border-glow, #e5e7eb)',
          borderRadius: 2,
          p: { xs: 2.5, md: 3.5 },
          bgcolor: 'var(--card-bg-solid, #ffffff)',
          display: 'grid',
          gap: 4,
        }}
      >
        {/* SECTION 1: TEMPLATE SETTINGS (What this template actually controls) */}
        <Box data-walkthrough="templates-fields-config">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              mb: 1.5,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#059669',
                  textTransform: 'uppercase',
                  mb: 0.75,
                }}
              >
                {template.title} — Form 1 Optional Sections
              </Typography>
              <Box sx={{ width: 40, height: 2.5, bgcolor: '#10b981', borderRadius: 1 }} />
            </Box>

            {hasLiveChanges && (
              <Button
                size="small"
                startIcon={<RestartAltOutlined fontSize="small" />}
                onClick={handleResetToLive}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  '&:hover': { color: '#111827', bgcolor: 'rgba(0,0,0,0.04)' },
                }}
              >
                Reset to live
              </Button>
            )}
          </Box>

          <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-secondary, #4b5563)', mb: 2.5 }}>
            {template.subtitle}
          </Typography>

          {/* 3 Clean Full-Width Toggle Rows (Matches Module Configuration) */}
          <Box sx={{ display: 'grid', gap: 1.25, mb: 2.5 }}>
            {OPTIONAL_SECTION_ROWS.map((row) => {
              const checked = selectedSections[row.key];
              const isPresetDefault = SECTION_DEFAULTS[preset][row.key];
              const differsFromLive = liveSections ? liveSections[row.key] !== checked : false;
              return (
                <Box
                  key={row.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    px: 2.25,
                    py: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: checked ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glow, #e5e7eb)',
                    bgcolor: checked ? 'rgba(16, 185, 129, 0.03)' : 'var(--card-bg-solid, #ffffff)',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary, #111827)' }}>
                        {row.title}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#6b7280',
                          bgcolor: '#f3f4f6',
                          px: 0.85,
                          py: 0.2,
                          borderRadius: 1,
                        }}
                      >
                        {template.title} default: {isPresetDefault ? 'On' : 'Off'}
                      </Typography>
                      {differsFromLive && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: checked ? '#047857' : '#b45309',
                            bgcolor: checked ? 'rgba(16, 185, 129, 0.12)' : '#fef3c7',
                            px: 0.85,
                            py: 0.2,
                            borderRadius: 1,
                          }}
                        >
                          {checked ? 'Will enable' : 'Will hide'}
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)', mt: 0.25 }}>
                      {row.detail}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: checked ? '#059669' : '#9ca3af',
                        minWidth: 54,
                        textAlign: 'right',
                      }}
                    >
                      {checked ? 'Enabled' : 'Hidden'}
                    </Typography>
                    <Switch
                      checked={checked}
                      onChange={() => handleToggleSection(row.key)}
                      sx={switchSx}
                      slotProps={{ input: { 'aria-label': `Toggle ${row.title}` } }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Compact Core Forms Strip */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 1.5,
              p: 1.75,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '1px solid var(--border-glow, #e5e7eb)',
            }}
          >
            {CORE_FORMS.map((item) => (
              <Box key={item.form} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Chip
                  label={item.form}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    bgcolor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary, #111827)' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }} noWrap>
                    {item.detail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* SECTION 2: COMPACT PATIENT JOURNEY PREVIEW */}
        <Box
          data-walkthrough="templates-workflow-preview"
          sx={{ pt: 3, borderTop: '1px solid var(--border-glow, #e5e7eb)' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              mb: 2.25,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#059669',
                  textTransform: 'uppercase',
                  mb: 0.75,
                }}
              >
                Patient Journey Preview
              </Typography>
              <Box sx={{ width: 40, height: 2.5, bgcolor: '#10b981', borderRadius: 1 }} />
            </Box>

            <Box
              sx={{
                display: 'inline-flex',
                p: 0.35,
                borderRadius: 1.5,
                bgcolor: '#f3f4f6',
                border: '1px solid #e5e7eb',
              }}
            >
              {(
                [
                  ['new', 'New Bite Visit'],
                  ['return', 'Return Dose Visit'],
                ] as const
              ).map(([key, label]) => {
                const active = visit === key;
                return (
                  <ButtonBase
                    key={key}
                    onClick={() => handleSelectVisit(key)}
                    sx={{
                      px: 1.5,
                      py: 0.55,
                      borderRadius: 1.25,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      bgcolor: active ? '#ffffff' : 'transparent',
                      color: active ? '#047857' : '#6b7280',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>

          {/* Compact Horizontal Stepper */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: `repeat(${steps.length}, 1fr)` },
              gap: 1.25,
              mb: 2,
            }}
          >
            {steps.map((item, idx) => {
              const active = idx === stepIndex;
              return (
                <ButtonBase
                  key={item.key}
                  onClick={() => setStepIndex(idx)}
                  sx={{
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: 1.25,
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: active ? '#10b981' : 'var(--border-glow, #e5e7eb)',
                    bgcolor: active ? 'rgba(16, 185, 129, 0.06)' : '#ffffff',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: active ? '#10b981' : '#9ca3af' },
                  }}
                >
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: active ? '#10b981' : '#f3f4f6',
                      color: active ? '#ffffff' : '#6b7280',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          color: active ? '#059669' : '#6b7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        Step {idx + 1}
                      </Typography>
                      {item.planned && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: '#b45309',
                            bgcolor: '#fef3c7',
                            px: 0.6,
                            borderRadius: 0.75,
                          }}
                        >
                          Planned
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary, #111827)' }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }} noWrap>
                      {item.shortDesc}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>

          {/* Compact Selected Step Detail Bar */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '1px solid var(--border-glow, #e5e7eb)',
              display: 'grid',
              gap: 1.25,
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', mr: 0.5 }}>
                Recorded here:
              </Typography>
              {step.fields.map((field) => (
                <Chip
                  key={field}
                  label={field}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    bgcolor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                  }}
                />
              ))}
              {step.key === 'registration' &&
                OPTIONAL_SECTION_ROWS.filter((r) => selectedSections[r.key]).map((r) => (
                  <Chip
                    key={r.key}
                    label={r.chipLabel}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      color: '#047857',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                    }}
                  />
                ))}
            </Box>

            <Typography sx={{ fontSize: '0.83rem', color: '#4b5563' }}>
              <Box component="span" sx={{ fontWeight: 700, color: '#111827' }}>
                Flow:
              </Box>{' '}
              {step.flowSummary}
            </Typography>
          </Box>
        </Box>

        {/* Subtle Footer Navigation Links */}
        <Box
          sx={{
            pt: 2,
            borderTop: '1px solid var(--border-glow, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Need field-level Required / Optional / Hidden rules or staff desk roles?
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
            <Box
              component={RouterLink}
              to={ROUTES.CLINIC_SETUP.MODULES}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: '#059669',
                fontWeight: 600,
                fontSize: '0.82rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Module Configuration <ArrowForwardOutlined sx={{ fontSize: 15 }} />
            </Box>
            <Box
              component={RouterLink}
              to={ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: '#059669',
                fontWeight: 600,
                fontSize: '0.82rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Staff Assignments <ArrowForwardOutlined sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Sticky Bottom Save Bar */}
      {hasLiveChanges && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: { xs: 0, md: 240 },
            right: 0,
            zIndex: 1100,
            bgcolor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid #e5e7eb',
            px: { xs: 2, md: 4 },
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827' }}>
              {!liveMatchesPreset(preset) &&
              selectedSections.socioeconomic === SECTION_DEFAULTS[preset].socioeconomic &&
              selectedSections.government === SECTION_DEFAULTS[preset].government &&
              selectedSections.fees === SECTION_DEFAULTS[preset].fees ? (
                <>
                  Ready to switch clinic to <strong>{template.title}</strong>.
                </>
              ) : (
                <>
                  You have unsaved template changes for <strong>{template.title}</strong>.
                </>
              )}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleResetToLive}
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                borderColor: '#d1d5db',
                color: '#374151',
                px: 2,
                '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
              }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon fontSize="small" />}
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                px: 2.5,
                bgcolor: '#10b981',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {saving ? 'Applying...' : 'Apply Template'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Confirm Live Apply Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1 }}>
          Apply {template.title} to live clinic?
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: 1 }}>
          <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-secondary, #4b5563)' }}>
            This updates your live Module Configuration immediately. Existing patient records are never deleted.
          </Typography>
          <Box
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '1px solid #e5e7eb',
              display: 'grid',
              gap: 1,
            }}
          >
            {OPTIONAL_SECTION_ROWS.map((row) => (
              <Box key={row.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.84rem', fontWeight: 600, color: '#111827' }}>
                  {row.title}
                </Typography>
                <Chip
                  size="small"
                  label={selectedSections[row.key] ? 'Enabled' : 'Hidden'}
                  sx={{
                    height: 22,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    bgcolor: selectedSections[row.key] ? 'rgba(16, 185, 129, 0.12)' : '#f3f4f6',
                    color: selectedSections[row.key] ? '#047857' : '#6b7280',
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyTemplate}
            disabled={saving}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 1.5,
              bgcolor: '#10b981',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            {saving ? 'Applying...' : 'Confirm & Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
