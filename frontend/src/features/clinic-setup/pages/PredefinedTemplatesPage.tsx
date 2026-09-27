import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Switch, Typography } from '@mui/material';
import {
  AccountBalanceOutlined,
  AssignmentIndOutlined,
  EventNoteOutlined,
  LocalHospitalOutlined,
  MedicalInformationOutlined,
  MonitorHeartOutlined,
  PaymentsOutlined,
  RestartAltOutlined,
  SaveOutlined,
  TuneOutlined,
  VaccinesOutlined,
} from '@mui/icons-material';
import { ROUTES } from '../../../shared/config/routes';

type PresetKey = 'public' | 'private';
type VisitKey = 'new' | 'return';
type CoverageMode = 'shared' | 'separate';
type OptionalSections = { socioeconomic: boolean; government: boolean };
type PreviewStep = {
  key: string;
  title: string;
  screen: string;
  fields: string[];
  action: string;
  next: string;
  icon: ReactNode;
  planned?: boolean;
  note?: string;
};
type Workflow = {
  title: string;
  description: string;
  icon: ReactNode;
  visits: Record<VisitKey, PreviewStep[]>;
};

const workflows: Record<PresetKey, Workflow> = {
  public: {
    title: 'Public ABTC',
    description: 'Current clinic path from registration through assessment, treatment, and follow-up.',
    icon: <AccountBalanceOutlined />,
    visits: {
      new: [
        {
          key: 'registration', title: 'Registration', screen: 'Patient registration and bite intake',
          fields: ['Patient details', 'Contact and address', 'Exposure date and place', 'Animal and wound details', 'Prior vaccination'],
          action: 'Find or register the patient and record the new exposure.',
          next: 'The new case enters the assessment queue.', icon: <AssignmentIndOutlined />,
        },
        {
          key: 'assessment', title: 'Doctor assessment', screen: 'Consultation and treatment plan (Form 2)',
          fields: ['History and vital signs', 'Wound and animal assessment', 'Exposure category', 'Diagnosis', 'Treatment decision'],
          action: 'Document the assessment and approve a treatment plan.',
          next: 'Treatment ordered goes to the treatment queue. No vaccine or referral closes this path with a documented decision.',
          icon: <MedicalInformationOutlined />,
        },
        {
          key: 'treatment', title: 'Nurse treatment', screen: 'Vaccination record (Form 3)',
          fields: ['Prescribed dose', 'Vaccine, route, and batch', 'RIG or tetanus if ordered', 'Date and vaccinator'],
          action: 'Record what was administered against the approved plan.',
          next: 'The dose record leads to the next appointment or visit completion.', icon: <VaccinesOutlined />,
        },
        {
          key: 'followup', title: 'Follow-up', screen: 'Next appointment',
          fields: ['Dose given', 'Next due date', 'Return instructions'],
          action: 'Give the patient the next date and keep the episode available for return visits.',
          next: 'At the next visit, check in under the same bite episode.', icon: <EventNoteOutlined />,
        },
      ],
      return: [
        {
          key: 'checkin', title: 'Check-in', screen: 'Returning patient and appointment',
          fields: ['Existing patient', 'Bite episode', 'Scheduled appointment', 'Dose due'],
          action: 'Find the existing episode and check in the scheduled visit.',
          next: 'Continue to the treatment worklist with the existing plan.', icon: <AssignmentIndOutlined />,
        },
        {
          key: 'treatment', title: 'Nurse treatment', screen: 'Vaccination record (Form 3)',
          fields: ['Approved plan and last dose', 'Dose due', 'Changed symptoms or exposure', 'Vaccine, route, and batch', 'Date and vaccinator'],
          action: 'Check the due dose and record what was administered on the existing episode.',
          next: 'Update the next appointment or mark the prescribed course complete.', icon: <VaccinesOutlined />,
          note: 'A changed clinical situation needs reassessment before an injection.',
        },
        {
          key: 'followup', title: 'Next visit', screen: 'Follow-up schedule',
          fields: ['Updated dose history', 'Next due date', 'Return instructions'],
          action: 'Confirm the next date if the treatment plan has another dose.',
          next: 'The same patient and episode remain available for future visits.', icon: <EventNoteOutlined />,
        },
      ],
    },
  },
  private: {
    title: 'Private ABC',
    description: 'Proposed shorter path using the same clinical records, with manual payment added.',
    icon: <LocalHospitalOutlined />,
    visits: {
      new: [
        {
          key: 'registration', title: 'Registration', screen: 'Patient registration and bite intake',
          fields: ['Patient details', 'Contact and address', 'Exposure date and place', 'Animal and wound details', 'Prior vaccination'],
          action: 'Find or register the patient and record the new exposure.',
          next: 'Continue to vitals and assessment.', icon: <AssignmentIndOutlined />,
        },
        {
          key: 'assessment', title: 'Vitals & assessment', screen: 'Clinical assessment and treatment plan',
          fields: ['History note', 'Blood pressure and temperature', 'Wound and animal assessment', 'Exposure category', 'Treatment decision'],
          action: 'Record vitals and document the treatment decision.',
          next: 'Treatment ordered continues to payment handling. No vaccine or referral closes this path with a documented decision.',
          icon: <MonitorHeartOutlined />,
          note: 'The paper card also has pulse, oxygen saturation, and respiratory rate; these need separate stored fields.',
        },
        {
          key: 'payment', title: 'Payment', screen: 'Manual payment entry',
          fields: ['Charge amount', 'Amount received', 'Payment method', 'Receipt or reference', 'Payment status'],
          action: 'Record a manual charge and its payment status.',
          next: 'The visit continues to injection when the clinical plan permits it.', icon: <PaymentsOutlined />, planned: true,
          note: 'Payment records and this routing step are not implemented yet. The existing cost recovery note is not a receipt.',
        },
        {
          key: 'injection', title: 'Injection & next visit', screen: 'Vaccination and follow-up',
          fields: ['Prescribed dose', 'Vaccine, route, and batch', 'RIG or tetanus if ordered', 'Date and vaccinator', 'Next appointment'],
          action: 'Record the administered treatment and give the next visit date.',
          next: 'The same bite episode remains available for return doses.', icon: <VaccinesOutlined />,
        },
      ],
      return: [
        {
          key: 'checkin', title: 'Find patient', screen: 'Returning patient check-in',
          fields: ['Existing patient', 'Bite episode', 'Scheduled appointment', 'Dose due'],
          action: 'Open the existing episode rather than registering another bite case.',
          next: 'Review the due dose and any changed clinical details.', icon: <AssignmentIndOutlined />,
        },
        {
          key: 'assessment', title: 'Review plan', screen: 'Vitals and due-dose review',
          fields: ['Approved plan', 'Last dose', 'Dose due', 'Changed symptoms or exposure'],
          action: 'Confirm the plan or document a needed reassessment.',
          next: 'An eligible dose continues to payment handling.', icon: <MonitorHeartOutlined />,
        },
        {
          key: 'payment', title: 'Payment', screen: 'Manual payment entry',
          fields: ['Visit charge', 'Amount received', 'Payment method', 'Receipt or reference', 'Payment status'],
          action: 'Record the return-visit payment separately from the dose.',
          next: 'The visit continues to injection when the clinical plan permits it.', icon: <PaymentsOutlined />, planned: true,
          note: 'Payment records and this routing step are not implemented yet.',
        },
        {
          key: 'injection', title: 'Dose & next visit', screen: 'Vaccination and follow-up',
          fields: ['Due dose', 'Vaccine, route, and batch', 'Date and vaccinator', 'Next appointment'],
          action: 'Record the dose on the existing episode and confirm the next date.',
          next: 'Finish the visit or continue the prescribed schedule.', icon: <VaccinesOutlined />,
        },
      ],
    },
  },
};

const panelSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  boxShadow: 'none',
};

const deskByStep: Record<string, { owner: string; shared: string; requirement: string }> = {
  registration: { owner: 'Registration staff', shared: 'Admin desk', requirement: 'Patient and bite intake' },
  checkin: { owner: 'Registration staff', shared: 'Admin desk', requirement: 'Find the existing episode' },
  assessment: { owner: 'Doctor / clinical assessor', shared: 'Admin coordinates', requirement: 'Qualified clinical assessment required' },
  treatment: { owner: 'Treatment nurse / vaccinator', shared: 'Admin coordinates', requirement: 'Authorized vaccinator required' },
  injection: { owner: 'Treatment nurse / vaccinator', shared: 'Admin coordinates', requirement: 'Authorized vaccinator required' },
  payment: { owner: 'Cashier', shared: 'Admin desk', requirement: 'Payment screen planned' },
  followup: { owner: 'Front desk / treatment staff', shared: 'Admin desk', requirement: 'Confirm the next appointment' },
};

const sectionDefaults: Record<PresetKey, OptionalSections> = {
  public: { socioeconomic: true, government: true },
  private: { socioeconomic: false, government: false },
};

const optionalSectionRows: { key: keyof OptionalSections; title: string; detail: string }[] = [
  { key: 'socioeconomic', title: 'Socioeconomic information', detail: 'Education, employment, family role' },
  { key: 'government', title: 'Government programs', detail: 'PhilHealth, 4Ps, DSWD, senior citizen, PWD' },
];

export default function PredefinedTemplatesPage() {
  const [preset, setPreset] = useState<PresetKey>('public');
  const [visit, setVisit] = useState<VisitKey>('new');
  const [stepIndex, setStepIndex] = useState(0);
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('shared');
  const [fieldSections, setFieldSections] = useState<Record<PresetKey, OptionalSections>>({
    public: { ...sectionDefaults.public },
    private: { ...sectionDefaults.private },
  });
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [appliedInPreview, setAppliedInPreview] = useState<{ preset: PresetKey; coverageMode: CoverageMode; sections: OptionalSections } | null>(null);
  const workflow = workflows[preset];
  const steps = workflow.visits[visit];
  const step = steps[stepIndex];
  const selectedSections = fieldSections[preset];
  const previewHasChanges = appliedInPreview && (
    appliedInPreview.preset !== preset
    || appliedInPreview.coverageMode !== coverageMode
    || appliedInPreview.sections.socioeconomic !== selectedSections.socioeconomic
    || appliedInPreview.sections.government !== selectedSections.government
  );
  const visibleFields = step.key === 'registration'
    ? [...step.fields,
      ...(selectedSections.socioeconomic ? ['Socioeconomic information'] : []),
      ...(selectedSections.government ? ['Government programs and PhilHealth'] : []),
    ]
    : step.fields;
  const optionalSectionsSummary = optionalSectionRows.filter(item => selectedSections[item.key]).map(item => item.title).join(' + ') || 'Neither optional section';

  const selectPreset = (next: PresetKey) => {
    setPreset(next);
    setStepIndex(0);
  };
  const selectVisit = (next: VisitKey) => {
    setVisit(next);
    setStepIndex(0);
  };
  const applyPreview = () => {
    setAppliedInPreview({ preset, coverageMode, sections: { ...selectedSections } });
    setConfirmApplyOpen(false);
  };
  const changeSection = (key: keyof OptionalSections, checked: boolean) => {
    setFieldSections(current => ({ ...current, [preset]: { ...current[preset], [key]: checked } }));
  };
  const resetSections = () => {
    setFieldSections(current => ({ ...current, [preset]: { ...sectionDefaults[preset] } }));
  };

  return <Box sx={{ px: { xs: 1, sm: 3 }, pb: 5, maxWidth: 1320, mx: 'auto' }}>
    <Box sx={{ mb: 2.5 }}>
      <Typography component="h1" sx={{ fontSize: 24, fontWeight: 700 }}>Predefined Templates</Typography>
      <Typography variant="caption" color="text.secondary">
        <Box component={RouterLink} to={ROUTES.DASHBOARD} sx={{ color: 'primary.main', textDecoration: 'none' }}>Dashboard</Box>
        {' › Clinic Setup › Predefined Templates'}
      </Typography>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
      {(['public', 'private'] as const).map(key => {
        const item = workflows[key];
        const active = key === preset;
        return <ButtonBase key={key} component="button" type="button" aria-pressed={active} onClick={() => selectPreset(key)} sx={{
          ...panelSx, display: 'flex', alignItems: 'flex-start', textAlign: 'left', width: '100%', p: 2, gap: 1.5,
          borderColor: active ? 'success.main' : 'divider', bgcolor: active ? 'action.selected' : 'background.paper',
          '&:hover': { borderColor: 'success.main' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'success.main', outlineOffset: 2 },
        }}>
          <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.5, bgcolor: 'action.hover', color: 'success.main' }}>{item.icon}</Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>{item.title}</Typography>
              <Chip label={key === 'public' ? 'Live workflow' : 'Proposed'} size="small" color={key === 'public' ? 'success' : 'default'} variant="outlined" sx={{ height: 22 }} />
              {appliedInPreview?.preset === key && <Chip label="Saved preview choice" size="small" color="info" sx={{ height: 22 }} />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>
          </Box>
        </ButtonBase>;
      })}
    </Box>

    <Paper component="section" aria-labelledby="workflow-title" elevation={0} sx={{ ...panelSx, p: { xs: 1.75, sm: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography id="workflow-title" component="h2" sx={{ fontSize: 17, fontWeight: 700 }}>{workflow.title} workflow</Typography>
          <Typography variant="body2" color="text.secondary">Choose a visit type, then select a step.</Typography>
        </Box>
        <Chip label="Preview only" size="small" variant="outlined" />
      </Box>

      {appliedInPreview && <Alert severity={previewHasChanges ? 'info' : 'success'} role="status" sx={{ mb: 2 }}>
        {previewHasChanges ? 'You are reviewing changes. ' : ''}Saved on this page: {workflows[appliedInPreview.preset].title} with {appliedInPreview.coverageMode === 'shared' ? 'one admin desk' : 'separate desks'}. The live clinic workflow remains Public ABTC. This choice clears when you leave or reload this page.
      </Alert>}

      <Box role="group" aria-label="Visit type" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
        {([['new', 'New bite visit'], ['return', 'Return dose visit']] as const).map(([key, label]) => <ButtonBase
          key={key} component="button" type="button" aria-pressed={visit === key} onClick={() => selectVisit(key)} sx={{
            px: 1.75, py: 0.85, border: '1px solid', borderColor: visit === key ? 'success.main' : 'divider',
            borderRadius: 1.5, bgcolor: visit === key ? 'action.selected' : 'background.paper',
            color: visit === key ? 'success.main' : 'text.secondary', fontSize: 13, fontWeight: 700,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'success.main', outlineOffset: 2 },
          }}>{label}</ButtonBase>)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1, mb: 2 }}>
        {steps.map((item, index) => <ButtonBase key={item.key} component="button" type="button" aria-current={stepIndex === index ? 'step' : undefined} onClick={() => setStepIndex(index)} sx={{
          display: 'flex', alignItems: 'flex-start', textAlign: 'left', gap: 1, width: '100%', minHeight: 76,
          p: 1.25, border: '1px solid', borderColor: stepIndex === index ? 'success.main' : 'divider',
          borderRadius: 1.5, bgcolor: stepIndex === index ? 'action.selected' : 'background.paper',
          '&:hover': { borderColor: 'success.main' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'success.main', outlineOffset: 2 },
        }}>
          <Box sx={{ color: stepIndex === index ? 'success.main' : 'text.secondary', flexShrink: 0 }}>{item.icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Step {index + 1}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>{item.title}</Typography>
            {item.planned && <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>Planned</Typography>}
          </Box>
        </ButtonBase>)}
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1.75, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Typography component="h3" sx={{ fontSize: 15, fontWeight: 700 }}>{step.screen}</Typography>
          <Chip label={`${stepIndex + 1} of ${steps.length}`} size="small" variant="outlined" />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Information on this screen</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
          {visibleFields.map(field => <Box key={field} sx={{ px: 1.25, py: 1, borderRadius: 1.25, bgcolor: 'action.hover', minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{field}</Typography>
          </Box>)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5, mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Main action</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.action}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">What happens next</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.next}</Typography>
          </Box>
        </Box>
        {step.note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{step.note}</Typography>}
      </Box>

    </Paper>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(0, 1fr)' }, gap: 2, mt: 2, alignItems: 'start' }}>
      <Paper component="section" aria-labelledby="staff-preview-title" elevation={0} sx={{ ...panelSx, p: { xs: 1.75, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Box>
            <Typography id="staff-preview-title" component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>Staff coverage</Typography>
            <Typography variant="body2" color="text.secondary">Preview who would handle each desk.</Typography>
          </Box>
          <Chip label="No staff assigned" size="small" variant="outlined" />
        </Box>

        <Box role="group" aria-label="Staff coverage example" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          {([['shared', 'One admin desk'], ['separate', 'Separate desks']] as const).map(([key, label]) => <ButtonBase
            key={key} component="button" type="button" aria-pressed={coverageMode === key} onClick={() => setCoverageMode(key)} sx={{
              px: 1.5, py: 0.85, border: '1px solid', borderColor: coverageMode === key ? 'success.main' : 'divider',
              borderRadius: 1.5, bgcolor: coverageMode === key ? 'action.selected' : 'background.paper',
              color: coverageMode === key ? 'success.main' : 'text.secondary', fontSize: 13, fontWeight: 700,
              '&:focus-visible': { outline: '2px solid', outlineColor: 'success.main', outlineOffset: 2 },
            }}>{label}</ButtonBase>)}
        </Box>

        <Box sx={{ display: 'grid', gap: 0.75 }}>
          {steps.map((item) => {
            const desk = deskByStep[item.key];
            return <Box key={item.key} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1.1fr)' }, gap: 0.5, px: 1.25, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
              <Box>
                <Typography variant="body2">{coverageMode === 'shared' ? desk.shared : desk.owner}</Typography>
                <Typography variant="caption" color={item.planned ? 'warning.main' : 'text.secondary'}>{desk.requirement}</Typography>
              </Box>
            </Box>;
          })}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          This is desk coverage only. User Management sets account roles. Staff Assignments records a preferred module; it does not grant clinical access or route patients.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          A qualified assessor and authorized vaccinator are still needed, even when one admin coordinates the visit.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
          <Button component={RouterLink} to={ROUTES.CLINIC_SETUP.STAFF_ASSIGNMENTS} variant="text" size="small" sx={{ px: 0 }}>
            Open Staff Assignments
          </Button>
          <Button component={RouterLink} to={ROUTES.USERS.LIST} variant="text" size="small" sx={{ px: 0 }}>
            Open User Management
          </Button>
        </Box>
      </Paper>

      <Paper component="section" aria-labelledby="sections-preview-title" elevation={0} sx={{ ...panelSx, p: { xs: 1.75, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          <Box>
            <Typography id="sections-preview-title" component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>Form sections</Typography>
            <Typography variant="body2" color="text.secondary">Choose the optional fields shown during registration.</Typography>
          </Box>
          <Chip label="Preview settings" size="small" variant="outlined" />
        </Box>

        <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover', mb: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Always included</Typography>
          <Typography variant="body2">Patient, contact and address · Bite exposure · Clinical assessment · Vaccination and follow-up</Typography>
        </Box>

        <Box sx={{ display: 'grid', gap: 0.75 }}>
          {optionalSectionRows.map(item => <Box component="label" key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.75, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, cursor: 'pointer' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
            </Box>
            <Switch checked={selectedSections[item.key]} onChange={event => changeSection(item.key, event.target.checked)} color="success" />
          </Box>)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Changes appear in the Registration step preview.</Typography>
          <Button variant="text" size="small" startIcon={<RestartAltOutlined />} onClick={resetSections}
            disabled={selectedSections.socioeconomic === sectionDefaults[preset].socioeconomic && selectedSections.government === sectionDefaults[preset].government}>
            Reset defaults
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          These switches mirror optional Module Configuration sections. They do not change that page's settings or remove existing patient data.
        </Typography>
        {preset === 'private' && !selectedSections.government && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          PhilHealth membership fields are inside Government programs. Include that section if the clinic needs those details for coverage.
        </Typography>}
        <Button component={RouterLink} to={ROUTES.CLINIC_SETUP.MODULES} variant="text" size="small" startIcon={<TuneOutlined />} sx={{ mt: 1, px: 0 }}>
          Advanced field settings
        </Button>
      </Paper>
    </Box>

    {preset === 'private' && <Paper component="section" aria-labelledby="payment-preview-title" elevation={0} sx={{ ...panelSx, p: { xs: 1.75, sm: 2 }, mt: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.5, bgcolor: 'warning.light', color: 'warning.dark' }}><PaymentsOutlined /></Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography id="payment-preview-title" component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>Payment is a separate step</Typography>
          <Chip label="Planned" size="small" color="warning" variant="outlined" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          The private path places manual payment after assessment and before injection. It needs a charge, amount paid, payment method, status, and receipt or reference. The current Cost Recovery field is only a note; a module switch cannot create billing.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          A future clinical exception would allow indicated urgent care while payment is pending, with the reason recorded.
        </Typography>
      </Box>
    </Paper>}

    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mt: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Preview choice</Typography>
        <Typography variant="body2" color="text.secondary">{workflow.title} · {coverageMode === 'shared' ? 'One admin desk' : 'Separate desks'} · Optional: {optionalSectionsSummary} · No live changes</Typography>
      </Box>
      <Button variant="contained" color="success" startIcon={<SaveOutlined />} disabled={Boolean(appliedInPreview && !previewHasChanges)} onClick={() => setConfirmApplyOpen(true)}>
        {appliedInPreview && !previewHasChanges ? 'Saved in preview' : 'Save & apply preview'}
      </Button>
    </Box>

    <Dialog open={confirmApplyOpen} onClose={() => setConfirmApplyOpen(false)} aria-labelledby="apply-template-title" maxWidth="sm" fullWidth>
      <DialogTitle id="apply-template-title">Apply {workflow.title} in preview?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          This saves the template, desk coverage, and optional section choices while this page is open. It does not update the clinic workflow, patient queues, staff accounts, or Module Configuration.
        </Typography>
        <Alert severity="info">Live workflow: Public ABTC · Preview: {workflow.title} · Coverage: {coverageMode === 'shared' ? 'One admin desk' : 'Separate desks'} · Optional: {optionalSectionsSummary}</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setConfirmApplyOpen(false)}>Cancel</Button>
        <Button onClick={applyPreview} variant="contained" color="success">Apply in preview</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
