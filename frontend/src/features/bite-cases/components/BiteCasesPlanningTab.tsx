import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddOutlined,
  ArrowDownward,
  ArrowUpward,
  BookmarkAddOutlined,
  CheckCircleOutlined,
  FileDownloadOutlined,
  FilterAltOutlined,
  HistoryOutlined,
  Inventory2Outlined,
  LocalHospitalOutlined,
  LocationOnOutlined,
  LockOutlined,
  PeopleAltOutlined,
  SpeedOutlined,
  UnfoldMore,
  ViewColumnOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { useState } from 'react';
import { AccessibleIconButton } from './AccessibleComponents';
import { BC_BORDER } from './BiteCasesSharedUi';
import type {
  DescriptiveFinding,
  DohSummary,
  LocationSortKey,
  LocationSummary,
  OptionalBarangayColumn,
  PlanningProjectionsPayload,
  PriorityLevel,
  ReportActionItem,
  ReportSnapshotHeader,
} from '../types/biteCasesSummary.types';
import {
  buildExplicitReviewReasons,
  computePriorityBreakdown,
  formatDaysAgo,
  priorityConfig,
} from '../types/biteCasesSummary.types';

interface BiteCasesPlanningTabProps {
  doh?: DohSummary;
  sortedLocations: LocationSummary[];
  loading: boolean;
  hasData: boolean;
  maxCasesAcrossLocations: number;
  totalRecorded: number;
  finalizedCount: number;
  noAdminCount: number;
  overdueEpisodesCount: number;
  outstandingDoseSlotsCount: number;
  sortKey: LocationSortKey;
  sortOrder: 'asc' | 'desc';
  optionalColumns: Record<OptionalBarangayColumn, boolean>;
  onSort: (key: LocationSortKey) => void;
  onToggleOptionalColumn: (col: OptionalBarangayColumn) => void;
  onExportLocationsCsv: () => void;
  onOpenLocationBreakdown: (loc: LocationSummary) => void;
  onDrillDownFilter: (next: { search?: string; status?: string; severity?: string }) => void;
  // Phase 6 Snapshot & Action Register props
  insights?: DescriptiveFinding[];
  snapshots?: ReportSnapshotHeader[];
  activeSnapshot?: ReportSnapshotHeader | null;
  snapshotBusy?: boolean;
  onSelectSnapshot?: (snapshotId: number | null) => void;
  onSaveSnapshot?: (status: 'draft' | 'finalized', parentSnapshotId?: number | null, notes?: string) => void;
  onFinalizeSnapshot?: (snapshotId: number) => void;
  actions?: ReportActionItem[];
  actionBusy?: boolean;
  onCreateAction?: (payload: {
    finding_key?: string;
    observed_pattern: string;
    supporting_metric?: string;
    proposed_action: string;
    owner_name?: string;
    due_date?: string;
    target_measure?: string;
    baseline_value?: string;
    resources_notes?: string;
  }) => Promise<void> | void;
  onUpdateActionStatus?: (actionId: number, status: ReportActionItem['status'], reviewOutcome?: string) => Promise<void> | void;
  planningProjections?: PlanningProjectionsPayload;
}

function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) {
    return <UnfoldMore aria-hidden="true" sx={{ fontSize: 14, opacity: 0.55 }} />;
  }
  return order === 'asc' ? (
    <ArrowUpward aria-hidden="true" sx={{ fontSize: 14 }} />
  ) : (
    <ArrowDownward aria-hidden="true" sx={{ fontSize: 14 }} />
  );
}

export function BiteCasesPlanningTab({
  doh,
  sortedLocations,
  loading,
  hasData,
  maxCasesAcrossLocations,
  noAdminCount,
  overdueEpisodesCount,
  outstandingDoseSlotsCount,
  sortKey,
  sortOrder,
  optionalColumns,
  onSort,
  onToggleOptionalColumn,
  onExportLocationsCsv,
  onOpenLocationBreakdown,
  insights = [],
  snapshots = [],
  activeSnapshot = null,
  snapshotBusy = false,
  onSelectSnapshot,
  onSaveSnapshot,
  onFinalizeSnapshot,
  actions = [],
  actionBusy = false,
  onCreateAction,
  onUpdateActionStatus,
  planningProjections,
}: BiteCasesPlanningTabProps) {
  const [legendAnchorEl, setLegendAnchorEl] = useState<HTMLElement | null>(null);
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(null);
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [showActionForm, setShowActionForm] = useState(false);
  const [bufferDaysSetting, setBufferDaysSetting] = useState<number>(14);
  const [sharingMode, setSharingMode] = useState<'conservative' | 'intradermal'>('intradermal');
  const [actionDraft, setActionDraft] = useState({
    finding_key: '',
    observed_pattern: '',
    supporting_metric: '',
    proposed_action: '',
    owner_name: '',
    due_date: '',
    target_measure: '',
    baseline_value: '',
  });

  const projections = planningProjections ?? doh?.planning_projections;
  const supply = projections?.supply_scenarios;
  const popCtx = projections?.population_context;
  const forecast = projections?.baseline_forecast;
  const vetLinks = projections?.veterinary_surveillance_links;

  const usableArv = supply?.usable_stock?.arv_vials ?? 0;
  const usableRig = supply?.usable_stock?.rig_vials ?? 0;
  const arvExpiring30d = supply?.usable_stock?.arv_expiring_within_30d ?? 0;
  const dailyRunRate = supply?.demand_projection?.recent_daily_doses_run_rate ?? 0;
  const dosesPerVial = sharingMode === 'conservative' ? 1.0 : 2.0;
  const dailyVialsNeeded = dosesPerVial > 0 ? dailyRunRate / dosesPerVial : 0;
  const projected30dVials = Math.ceil(dailyVialsNeeded * 30);
  const bufferVialsNeeded = Math.ceil(dailyVialsNeeded * bufferDaysSetting);
  const totalRequiredVials = projected30dVials + bufferVialsNeeded;
  const daysStockRemaining = dailyVialsNeeded > 0 ? (usableArv / dailyVialsNeeded).toFixed(1) : '—';
  const suggestedReorder = Math.max(0, totalRequiredVials - usableArv);
  const stockoutRisk =
    daysStockRemaining !== '—' && Number(daysStockRemaining) < 7
      ? 'critical'
      : daysStockRemaining !== '—' && Number(daysStockRemaining) < 14
      ? 'warning'
      : 'adequate';

  const over30Count = doh?.data_quality_and_aging?.unresolved_review_age_buckets.over_30_days ?? 0;
  const awaitingAssess = doh?.pep_and_biologics.awaiting_assessment ?? 0;
  const externalUnverified =
    doh?.data_quality_and_aging?.documentation_gaps.external_treatment_unverified ?? 0;

  const handlePrefillFromFinding = (f: DescriptiveFinding) => {
    setActionDraft({
      finding_key: f.finding_key,
      observed_pattern: f.statement,
      supporting_metric: f.supporting_metric,
      proposed_action: f.recommended_review,
      owner_name: '',
      due_date: '',
      target_measure: 'Resolve pending reviews before next monthly cutoff',
      baseline_value: f.supporting_metric,
    });
    setShowActionForm(true);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDraft.observed_pattern.trim() || !actionDraft.proposed_action.trim()) return;
    await onCreateAction?.(actionDraft);
    setActionDraft({
      finding_key: '',
      observed_pattern: '',
      supporting_metric: '',
      proposed_action: '',
      owner_name: '',
      due_date: '',
      target_measure: '',
      baseline_value: '',
    });
    setShowActionForm(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      {/* BCS-06.1 & BCS-06.3: Report Snapshots & Program Action Register */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, gap: 1.75 }}>
        {/* Left: Snapshot Lifecycle & Reproducibility */}
        <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75, gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)' }}>
              Report Snapshot &amp; Reproducibility (BCS-06.1)
            </Typography>
            <Chip
              size="small"
              icon={activeSnapshot?.status === 'finalized' ? <LockOutlined sx={{ fontSize: 13 }} /> : <HistoryOutlined sx={{ fontSize: 13 }} />}
              label={
                activeSnapshot
                  ? `${activeSnapshot.snapshot_code} (v${activeSnapshot.version} • ${activeSnapshot.status.toUpperCase()})`
                  : 'Live Working Draft'
              }
              sx={{
                fontWeight: 700,
                fontSize: 11,
                bgcolor: activeSnapshot?.status === 'finalized' ? 'var(--bc-success-bg)' : 'var(--bc-info-bg)',
                color: activeSnapshot?.status === 'finalized' ? 'var(--bc-green-strong)' : 'var(--bc-info-text)',
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mb: 1.25 }}>
            Save a point-in-time snapshot of the current period, cutoff, and aggregate counts. Finalized snapshots remain immutable even if records change later.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.25, flexWrap: 'wrap' }}>
            <Select
              size="small"
              value={activeSnapshot ? String(activeSnapshot.snapshot_id) : 'live'}
              onChange={(e) => {
                const val = e.target.value;
                onSelectSnapshot?.(val === 'live' ? null : Number(val));
              }}
              inputProps={{ 'aria-label': 'Select report snapshot version' }}
              sx={{ minWidth: 220, fontSize: 12.5, fontWeight: 600, flex: 1 }}
            >
              <MenuItem value="live">Live Working Draft (Current Database State)</MenuItem>
              {snapshots.map((snap) => (
                <MenuItem key={snap.snapshot_id} value={String(snap.snapshot_id)}>
                  {snap.snapshot_code} (v{snap.version} • {snap.status.toUpperCase()} • Cutoff {snap.cutoff_date})
                </MenuItem>
              ))}
            </Select>
          </Box>

          <TextField
            size="small"
            fullWidth
            placeholder="Optional snapshot note (e.g., Q4 LGU Rabies Committee Review)"
            value={snapshotNotes}
            onChange={(e) => setSnapshotNotes(e.target.value)}
            sx={{ mb: 1.25, '& .MuiInputBase-input': { fontSize: 12.5 } }}
          />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!activeSnapshot && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={snapshotBusy}
                  startIcon={<BookmarkAddOutlined fontSize="small" />}
                  onClick={() => {
                    onSaveSnapshot?.('draft', null, snapshotNotes);
                    setSnapshotNotes('');
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12 }}
                >
                  Save Draft Snapshot
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={snapshotBusy}
                  startIcon={<LockOutlined fontSize="small" />}
                  onClick={() => {
                    onSaveSnapshot?.('finalized', null, snapshotNotes);
                    setSnapshotNotes('');
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, bgcolor: 'var(--bc-green-strong)' }}
                >
                  Save &amp; Finalize Snapshot
                </Button>
              </>
            )}

            {activeSnapshot && activeSnapshot.status === 'draft' && (
              <Button
                size="small"
                variant="contained"
                disabled={snapshotBusy}
                startIcon={<CheckCircleOutlined fontSize="small" />}
                onClick={() => onFinalizeSnapshot?.(activeSnapshot.snapshot_id)}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, bgcolor: 'var(--bc-green-strong)' }}
              >
                Finalize Snapshot ({activeSnapshot.snapshot_code})
              </Button>
            )}

            {activeSnapshot && (
              <Button
                size="small"
                variant="outlined"
                disabled={snapshotBusy}
                startIcon={<HistoryOutlined fontSize="small" />}
                onClick={() => {
                  onSaveSnapshot?.('draft', activeSnapshot.snapshot_id, snapshotNotes || `Revision of ${activeSnapshot.snapshot_code}`);
                  setSnapshotNotes('');
                }}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12 }}
              >
                Create Versioned Revision (v{(activeSnapshot.version || 1) + 1})
              </Button>
            )}
          </Box>
        </Paper>

        {/* Right: Descriptive Findings & Action Register */}
        <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 1.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75, gap: 1, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--bc-text)' }}>
                Meeting Findings &amp; Action Register (BCS-06.3)
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                Pair descriptive findings with concrete clinic or barangay follow-up actions, owners, and target measures.
              </Typography>
            </Box>
            <Button
              size="small"
              variant={showActionForm ? 'outlined' : 'contained'}
              startIcon={<AddOutlined fontSize="small" />}
              onClick={() => setShowActionForm((prev) => !prev)}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12 }}
            >
              {showActionForm ? 'Cancel' : 'Add Action Item'}
            </Button>
          </Box>

          {/* Quick-add pills from backend descriptive findings */}
          {insights.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25 }}>
              {insights.map((f) => (
                <Chip
                  key={f.finding_key}
                  size="small"
                  clickable
                  onClick={() => handlePrefillFromFinding(f)}
                  label={`+ Log Action: ${f.title} (${f.supporting_metric})`}
                  sx={{ fontSize: 11, fontWeight: 700, bgcolor: 'var(--bc-surface-2)', border: BC_BORDER }}
                />
              ))}
            </Box>
          )}

          {showActionForm && (
            <Box
              component="form"
              onSubmit={handleSubmitAction}
              sx={{
                p: 1.5,
                mb: 1.5,
                borderRadius: '8px',
                bgcolor: 'var(--bc-surface-2)',
                border: BC_BORDER,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1,
              }}
            >
              <TextField
                size="small"
                label="Observed Pattern / Issue *"
                required
                value={actionDraft.observed_pattern}
                onChange={(e) => setActionDraft((d) => ({ ...d, observed_pattern: e.target.value }))}
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
              <TextField
                size="small"
                label="Proposed Action *"
                required
                value={actionDraft.proposed_action}
                onChange={(e) => setActionDraft((d) => ({ ...d, proposed_action: e.target.value }))}
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
              <TextField
                size="small"
                label="Supporting Metric (Count / Denominator)"
                value={actionDraft.supporting_metric}
                onChange={(e) => setActionDraft((d) => ({ ...d, supporting_metric: e.target.value }))}
              />
              <TextField
                size="small"
                label="Owner / Responsible Role"
                placeholder="e.g., ABTC Nurse / Barangay Health Worker"
                value={actionDraft.owner_name}
                onChange={(e) => setActionDraft((d) => ({ ...d, owner_name: e.target.value }))}
              />
              <TextField
                size="small"
                type="date"
                label="Target Due Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={actionDraft.due_date}
                onChange={(e) => setActionDraft((d) => ({ ...d, due_date: e.target.value }))}
              />
              <TextField
                size="small"
                label="Target Measure"
                placeholder="e.g., Verify 100% of pending Form 2 charts"
                value={actionDraft.target_measure}
                onChange={(e) => setActionDraft((d) => ({ ...d, target_measure: e.target.value }))}
              />
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  type="submit"
                  size="small"
                  variant="contained"
                  disabled={actionBusy}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Save Action to Register
                </Button>
              </Box>
            </Box>
          )}

          {actions.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', py: 1 }}>
              No actions logged yet. Click any finding pill above or “Add Action Item” to record a follow-up action.
            </Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 220 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Observed Pattern &amp; Metric</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Proposed Action &amp; Target</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Owner &amp; Due</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {actions.map((act) => (
                    <TableRow key={act.action_id} hover>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{act.observed_pattern}</Typography>
                        {act.supporting_metric && (
                          <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                            Metric: {act.supporting_metric}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{act.proposed_action}</Typography>
                        {act.target_measure && (
                          <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                            Target: {act.target_measure}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                        {act.owner_name || 'Unassigned'}
                        {act.due_date ? <Box component="span" sx={{ display: 'block', color: 'var(--bc-text-secondary)' }}>Due: {act.due_date}</Box> : null}
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={act.status}
                          onChange={(e) => onUpdateActionStatus?.(act.action_id, e.target.value as ReportActionItem['status'])}
                          sx={{ fontSize: 11.5, fontWeight: 700, height: 28 }}
                        >
                          <MenuItem value="open">Open</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="deferred">Deferred</MenuItem>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Phase 8: Supply Scenarios, Population Rate Context & Baseline Forecasting */}
      {projections && (
        <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)' }}>
                  Supply Scenario Estimates &amp; Population Context
                </Typography>
                <Chip
                  size="small"
                  label="Phase 8 Planning"
                  sx={{
                    fontWeight: 700,
                    fontSize: 10.5,
                    bgcolor: 'var(--bc-focus-ring-subtle)',
                    color: 'var(--bc-focus-ring)',
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                Usable vaccine/immunoglobulin stock, upcoming scheduled demand, configurable buffer stock, and catchment exposure rates.
              </Typography>
            </Box>

            {/* Interactive Simulator Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>
                  Buffer Days:
                </Typography>
                <Select
                  size="small"
                  value={bufferDaysSetting}
                  onChange={(e) => setBufferDaysSetting(Number(e.target.value))}
                  inputProps={{ 'aria-label': 'Select safety buffer days' }}
                  sx={{ fontSize: 12, fontWeight: 700, height: 30, minWidth: 110 }}
                >
                  <MenuItem value={7}>7 Days (Rapid)</MenuItem>
                  <MenuItem value={14}>14 Days (Standard)</MenuItem>
                  <MenuItem value={21}>21 Days</MenuItem>
                  <MenuItem value={30}>30 Days (Remote)</MenuItem>
                </Select>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>
                  Regimen:
                </Typography>
                <Select
                  size="small"
                  value={sharingMode}
                  onChange={(e) => setSharingMode(e.target.value as 'conservative' | 'intradermal')}
                  inputProps={{ 'aria-label': 'Select regimen sharing model' }}
                  sx={{ fontSize: 12, fontWeight: 700, height: 30, minWidth: 165 }}
                >
                  <MenuItem value="intradermal">Intradermal (2 doses/vial)</MenuItem>
                  <MenuItem value="conservative">Conservative (1 dose/vial)</MenuItem>
                </Select>
              </Box>
            </Box>
          </Box>

          {/* 4 KPI Summary Boxes */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.25, mb: 2 }}>
            <Box sx={{ p: 1.25, borderRadius: '8px', border: BC_BORDER, bgcolor: 'var(--bc-surface-2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--bc-text-secondary)' }}>
                  Usable ARV Stock
                </Typography>
                <Chip
                  size="small"
                  label={stockoutRisk.toUpperCase()}
                  sx={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    height: 18,
                    bgcolor: stockoutRisk === 'critical' ? 'var(--bc-danger-bg)' : (stockoutRisk === 'warning' ? 'var(--bc-warning-bg)' : 'var(--bc-success-bg)'),
                    color: stockoutRisk === 'critical' ? 'var(--bc-red)' : (stockoutRisk === 'warning' ? 'var(--bc-amber)' : 'var(--bc-green-strong)'),
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                {usableArv} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>vials</span>
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                Days remaining: <strong>{daysStockRemaining} days</strong> &bull; Expiring &le;30d: {arvExpiring30d}
              </Typography>
            </Box>

            <Box sx={{ p: 1.25, borderRadius: '8px', border: BC_BORDER, bgcolor: 'var(--bc-surface-2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--bc-text-secondary)' }}>
                  Usable RIG Stock
                </Typography>
                <LocalHospitalOutlined sx={{ fontSize: 16, color: 'var(--bc-focus-ring)' }} />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                {usableRig} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>vials</span>
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                Earliest expiry: {supply?.usable_stock?.earliest_rig_expiry ?? 'None logged'}
              </Typography>
            </Box>

            <Box sx={{ p: 1.25, borderRadius: '8px', border: BC_BORDER, bgcolor: 'var(--bc-surface-2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--bc-text-secondary)' }}>
                  Suggested Reorder
                </Typography>
                <Inventory2Outlined sx={{ fontSize: 16, color: 'var(--bc-amber)' }} />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: suggestedReorder > 0 ? 'var(--bc-red)' : 'var(--bc-green-strong)' }}>
                {suggestedReorder} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>vials</span>
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                Covers 30d demand ({projected30dVials}v) + {bufferDaysSetting}d buffer ({bufferVialsNeeded}v)
              </Typography>
            </Box>

            <Box sx={{ p: 1.25, borderRadius: '8px', border: BC_BORDER, bgcolor: 'var(--bc-surface-2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--bc-text-secondary)' }}>
                  Catchment Rate
                </Typography>
                <PeopleAltOutlined sx={{ fontSize: 16, color: 'var(--bc-focus-ring)' }} />
              </Box>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-text)' }}>
                {popCtx?.rate_per_100k_period ?? '—'} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>/ 100k pop</span>
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                Catchment: {(popCtx?.catchment_population ?? 75000).toLocaleString()} &bull; Ann: {popCtx?.annualized_rate_per_100k ?? '—'} / 100k
              </Typography>
            </Box>
          </Box>

          {/* Two-column Scenario Comparison & Baseline Forecast */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 1.5 }}>
            {/* Left: Model Comparison Table */}
            <Box sx={{ p: 1.25, borderRadius: '8px', border: BC_BORDER, bgcolor: 'var(--bc-surface)' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-text)', mb: 0.75 }}>
                Scenario Model Comparison (30-Day Outlook + {bufferDaysSetting}-Day Buffer)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'var(--bc-surface-2)' }}>
                      <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>Parameter / Metric</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Conservative (IM)</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700 }}>Intradermal (ID)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11.5 }}>Doses extracted per vial</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 600 }}>1.0 dose</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 600 }}>2.0 doses</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11.5 }}>Projected 30-day base demand</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5 }}>{supply?.scenarios?.conservative_im?.projected_30d_vials ?? 0} vials</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5 }}>{supply?.scenarios?.intradermal_sharing?.projected_30d_vials ?? 0} vials</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11.5 }}>{bufferDaysSetting}-day safety buffer</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5 }}>{supply?.scenarios?.conservative_im?.buffer_vials ?? 0} vials</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5 }}>{supply?.scenarios?.intradermal_sharing?.buffer_vials ?? 0} vials</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Total vials required</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700 }}>{supply?.scenarios?.conservative_im?.total_vials_required ?? 0} vials</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700 }}>{supply?.scenarios?.intradermal_sharing?.total_vials_required ?? 0} vials</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11.5 }}>Estimated days of stock remaining</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5 }}>{supply?.scenarios?.conservative_im?.days_of_stock_remaining ?? '—'} days</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-green-strong)' }}>{supply?.scenarios?.intradermal_sharing?.days_of_stock_remaining ?? '—'} days</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Suggested reorder quantity</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700, color: (supply?.scenarios?.conservative_im?.suggested_reorder_vials ?? 0) > 0 ? 'var(--bc-red)' : 'var(--bc-green-strong)' }}>
                        {supply?.scenarios?.conservative_im?.suggested_reorder_vials ?? 0} vials
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700, color: (supply?.scenarios?.intradermal_sharing?.suggested_reorder_vials ?? 0) > 0 ? 'var(--bc-red)' : 'var(--bc-green-strong)' }}>
                        {supply?.scenarios?.intradermal_sharing?.suggested_reorder_vials ?? 0} vials
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', mt: 1, fontStyle: 'italic' }}>
                Note: {supply?.assumptions_and_limits?.vial_sharing_notice}
              </Typography>
            </Box>

            {/* Right: Baseline Forecast & Surveillance Coordination */}
            <Box sx={{ p: 1.25, borderRadius: '8px', border: BC_BORDER, bgcolor: 'var(--bc-surface)', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ p: 1, borderRadius: '6px', bgcolor: 'var(--bc-surface-2)', border: BC_BORDER }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                    Next-Month Presentation Baseline
                  </Typography>
                  <SpeedOutlined sx={{ fontSize: 15, color: 'var(--bc-focus-ring)' }} />
                </Box>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'var(--bc-text)' }}>
                  ~{forecast?.projected_next_month_presentations ?? 0}{' '}
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>
                    presentations (range: {forecast?.projected_next_month_range?.lower_bound ?? 0}–{forecast?.projected_next_month_range?.upper_bound ?? 0})
                  </span>
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
                  {forecast?.evaluation_and_limits?.predictive_claim_disclaimer}
                </Typography>
              </Box>

              <Box sx={{ p: 1, borderRadius: '6px', bgcolor: 'var(--bc-surface-2)', border: BC_BORDER }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text)', mb: 0.25 }}>
                  Catchment &amp; Coverage Limitations
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>
                  {popCtx?.facility_coverage_limitations?.presentation_bias} {popCtx?.facility_coverage_limitations?.denominator_context}
                </Typography>
              </Box>

              <Box sx={{ p: 1, borderRadius: '6px', bgcolor: 'var(--bc-surface-2)', border: BC_BORDER }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bc-text)', mb: 0.5 }}>
                  External Veterinary Surveillance Coordination
                </Typography>
                {vetLinks?.partner_agencies?.map((agency, i) => (
                  <Box key={i} sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--bc-text)' }}>
                      • {agency.agency_name}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', pl: 1.5 }}>
                      Role: {agency.role} &bull; Trigger: {agency.coordination_trigger}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Barangay Exposure & DOH Surveillance Table */}
      <Paper elevation={0} sx={{ border: BC_BORDER, borderRadius: '10px', overflow: 'hidden' }}>
        <Box
          sx={{
            p: 1.5,
            borderBottom: BC_BORDER,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)' }}>
              Barangay Exposure &amp; Explicit Review Reasons
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
              Sorted using explicit surveillance metrics with supporting review counts. In Conference Mode, cells &lt;5 are suppressed.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <AccessibleIconButton
              icon={<FilterAltOutlined aria-hidden="true" fontSize="small" />}
              label="View surveillance priority legend"
              onClick={(event?: unknown) => {
                const e = event as React.MouseEvent<HTMLElement> | undefined;
                if (e?.currentTarget) setLegendAnchorEl(e.currentTarget);
              }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewColumnOutlined aria-hidden="true" />}
              onClick={(e) => setColumnsAnchorEl(e.currentTarget)}
              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
            >
              Columns
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadOutlined aria-hidden="true" />}
              data-walkthrough="bite-cases-export-csv"
              data-tour="bite-cases-export-csv"
              onClick={onExportLocationsCsv}
              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        <TableContainer
          className="bc-table-scroll-region"
          tabIndex={0}
          role="region"
          aria-labelledby="barangay-table-caption"
        >
          <Table size="small" stickyHeader>
            <caption id="barangay-table-caption" className="bc-table-caption">
              Barangay exposure summary showing geography scope, explicit review reasons, prior-period change, WHO categories, PEP initiation/gaps, completion, RIG, and overdue backlog.
            </caption>
            <TableHead>
              <TableRow>
                <TableCell
                  component="th"
                  scope="col"
                  aria-sort={sortKey === 'location' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('location')}>
                    <span>Barangay / Location</span>
                    <SortIcon active={sortKey === 'location'} order={sortOrder} />
                  </button>
                </TableCell>
                <TableCell
                  component="th"
                  scope="col"
                  aria-sort={sortKey === 'priority' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('priority')}>
                    <span>Review Reasons &amp; Level</span>
                    <SortIcon active={sortKey === 'priority'} order={sortOrder} />
                  </button>
                </TableCell>
                <TableCell
                  component="th"
                  scope="col"
                  align="right"
                  aria-sort={sortKey === 'cases' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('cases')}>
                    <span>Total (Prior)</span>
                    <SortIcon active={sortKey === 'cases'} order={sortOrder} />
                  </button>
                </TableCell>
                {optionalColumns.demographics && (
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>
                    Sex (M/F) &amp; &lt;15y
                  </TableCell>
                )}
                <TableCell
                  component="th"
                  scope="col"
                  aria-sort={sortKey === 'cat_3' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('cat_3')}>
                    <span>Categories (I / II / III / Unass.)</span>
                    <SortIcon active={sortKey === 'cat_3'} order={sortOrder} />
                  </button>
                </TableCell>
                <TableCell
                  component="th"
                  scope="col"
                  aria-sort={sortKey === 'pep' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('pep')}>
                    <span>PEP (Presc. / Given / No Admin)</span>
                    <SortIcon active={sortKey === 'pep'} order={sortOrder} />
                  </button>
                </TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>
                  Completed / Trans.
                </TableCell>
                {optionalColumns.rig_details && (
                  <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>
                    RIG (ERIG/HRIG)
                  </TableCell>
                )}
                {optionalColumns.animals && (
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>
                    Animals (D/C/O/U)
                  </TableCell>
                )}
                <TableCell
                  component="th"
                  scope="col"
                  align="right"
                  aria-sort={sortKey === 'overdue' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('overdue')}>
                    <span>Overdue</span>
                    <SortIcon active={sortKey === 'overdue'} order={sortOrder} />
                  </button>
                </TableCell>
                <TableCell
                  component="th"
                  scope="col"
                  aria-sort={sortKey === 'last_incident' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" className="bc-table-sort-btn" onClick={() => onSort('last_incident')}>
                    <span>Last Incident</span>
                    <SortIcon active={sortKey === 'last_incident'} order={sortOrder} />
                  </button>
                </TableCell>
                {optionalColumns.trend && <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Trend</TableCell>}
                {optionalColumns.risk_score && <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Ref Score</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !hasData ? (
                <TableRow>
                  <TableCell colSpan={13} sx={{ py: 4, textAlign: 'center' }}>
                    Loading barangay summary…
                  </TableCell>
                </TableRow>
              ) : sortedLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} sx={{ py: 4, textAlign: 'center', color: 'var(--bc-text-secondary)' }}>
                    No barangay records match the active filters.
                  </TableCell>
                </TableRow>
              ) : (
                sortedLocations.map((row) => {
                  const suppressed = Boolean(row.is_small_cell_suppressed);
                  const breakdown = computePriorityBreakdown(row, maxCasesAcrossLocations);
                  const cfg = priorityConfig[breakdown.priorityLevel];
                  const overdueCount = row.overdue_episodes ?? row.overdue_doses;
                  const reasons = buildExplicitReviewReasons(row);
                  const delta = row.change ?? 0;
                  return (
                    <TableRow key={row.location} hover>
                      <TableCell component="th" scope="row" sx={{ minWidth: 165 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LocationOnOutlined aria-hidden="true" sx={{ fontSize: 16, color: 'var(--bc-text-secondary)' }} />
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--bc-text)' }}>
                              {row.normalized_barangay || row.location}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                              {row.municipality || 'Tagoloan'} • {row.geography_scope?.replaceAll('_', ' ') || row.location_level}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 230 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          <Chip
                            size="small"
                            label={suppressed ? 'Suppressed (<5)' : cfg.shortLabel}
                            onClick={() => onOpenLocationBreakdown(row)}
                            sx={{
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: 11,
                              color: cfg.color,
                              bgcolor: cfg.background,
                              border: `1px solid ${cfg.border}`,
                            }}
                          />
                          {reasons.slice(0, 3).map((reason) => (
                            <Chip
                              key={reason}
                              size="small"
                              label={reason}
                              sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: 'var(--bc-surface-3)', color: 'var(--bc-text-2)' }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                        {suppressed ? (row.display_total_cases || '<5') : row.total_cases}
                        {!suppressed && row.previous_total !== undefined && (
                          <Typography component="span" sx={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--bc-text-secondary)' }}>
                            Prior: {row.previous_total} ({delta >= 0 ? `+${delta}` : delta})
                          </Typography>
                        )}
                      </TableCell>
                      {optionalColumns.demographics && (
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {suppressed ? '<5' : `${row.male ?? 0}M / ${row.female ?? 0}F • <15: ${row.age_below_15 ?? 0}`}
                        </TableCell>
                      )}
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {suppressed ? '<5 / <5 / <5 / <5' : `${row.cat_1} / ${row.cat_2} / ${row.cat_3} / ${row.unassessed ?? 0}`}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {suppressed ? (
                          '<5 / <5 / <5'
                        ) : (
                          <>
                            <Box component="span" sx={{ fontWeight: 600 }}>{row.pep_prescribed ?? 0}</Box>
                            {' / '}
                            <Box component="span" sx={{ color: 'var(--bc-green-strong)', fontWeight: 700 }}>{row.given_pep ?? 0}</Box>
                            {' / '}
                            <Box
                              component="span"
                              sx={{
                                color: (row.no_administration_recorded ?? 0) > 0 ? 'var(--bc-red-strong)' : 'inherit',
                                fontWeight: (row.no_administration_recorded ?? 0) > 0 ? 700 : 400,
                              }}
                            >
                              {row.no_administration_recorded ?? 0}
                            </Box>
                          </>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {suppressed ? '<5 / <5' : `${row.completed ?? 0} / ${row.transferred ?? 0}`}
                      </TableCell>
                      {optionalColumns.rig_details && (
                        <TableCell align="right" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {suppressed ? '<5' : `${row.given_rig ?? 0} (${row.erig ?? 0}/${row.hrig ?? 0})`}
                        </TableCell>
                      )}
                      {optionalColumns.animals && (
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {suppressed ? '<5' : `${row.dogs ?? 0}/${row.cats ?? 0}/${row.other_animals ?? 0}/${row.unknown_animals ?? 0}`}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        {suppressed ? (
                          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>&lt;5</Typography>
                        ) : overdueCount > 0 ? (
                          <Chip
                            size="small"
                            label={`${overdueCount} ep (${row.outstanding_dose_slots ?? overdueCount} slots)`}
                            sx={{ fontSize: 11, fontWeight: 700, bgcolor: 'var(--bc-danger-bg)', color: 'var(--bc-red-strong)' }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>0</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontSize: 12 }}>{row.last_incident || '—'}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>
                          {formatDaysAgo(row.last_incident_days_ago)}
                        </Typography>
                      </TableCell>
                      {optionalColumns.trend && (
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {row.trend === 'up'
                            ? `+${row.trend_diff ?? 0}`
                            : row.trend === 'down'
                              ? `${row.trend_diff ?? 0}`
                              : row.trend === 'new'
                                ? 'New'
                                : 'Stable'}
                        </TableCell>
                      )}
                      {optionalColumns.risk_score && (
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {breakdown.compositeScore}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Collapsible Operational Review & Action Planning Reference Guide (Appendix F) */}
      <details className="bc-disclosure">
        <summary>
          <span>Operational Verification &amp; Action Planning Reference Guide (Appendix F)</span>
          <span style={{ fontSize: 12, color: 'var(--bc-text-secondary)', fontWeight: 600 }}>Click to expand</span>
        </summary>
        <div className="bc-disclosure-body">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Observed Pattern &amp; Count</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Questions to Verify</TableCell>
                  <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Recommended Review Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  {
                    pattern: `Registrations awaiting assessment (${awaitingAssess})`,
                    questions: 'Still in clinic queue, duplicate intake, departed, or assessment saved without finalization?',
                    action: 'Review registration-to-doctor handoff and unresolved Form 1 encounters (>30d: ' + over30Count + ').',
                  },
                  {
                    pattern: `PEP prescribed with no administration recorded (${noAdminCount})`,
                    questions: 'Still awaiting D0 nurse administration, treated externally, referred, or missing nurse encoding?',
                    action: 'Verify nurse immunization logs and doctor-to-nurse handoff; never assume patient refusal.',
                  },
                  {
                    pattern: `Overdue PEP follow-up (${overdueEpisodesCount} episodes / ${outstandingDoseSlotsCount} slots)`,
                    questions: 'Contact failure, transportation barrier, rescheduled visit, or unrecorded external completion?',
                    action: 'Generate recall list for barangay health worker outreach and verify external vaccination cards.',
                  },
                  {
                    pattern: `Transfers without verified external proof (${externalUnverified})`,
                    questions: 'Was receiving-facility acknowledgment or follow-up card returned?',
                    action: 'Follow up referral acknowledgment with receiving ABTC before closing outcomes.',
                  },
                ].map((item) => (
                  <TableRow key={item.pattern} hover>
                    <TableCell component="th" scope="row" sx={{ fontSize: 12.5, fontWeight: 700 }}>
                      {item.pattern}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'var(--bc-text-2)' }}>{item.questions}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'var(--bc-text-2)' }}>{item.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </details>

      {/* Column Visibility Menu */}
      <Menu anchorEl={columnsAnchorEl} open={Boolean(columnsAnchorEl)} onClose={() => setColumnsAnchorEl(null)}>
        <MenuItem onClick={() => onToggleOptionalColumn('demographics')}>
          <Checkbox checked={optionalColumns.demographics} size="small" /> Sex &amp; Age &lt;15 Columns
        </MenuItem>
        <MenuItem onClick={() => onToggleOptionalColumn('rig_details')}>
          <Checkbox checked={optionalColumns.rig_details} size="small" /> RIG (ERIG/HRIG) Column
        </MenuItem>
        <MenuItem onClick={() => onToggleOptionalColumn('animals')}>
          <Checkbox checked={optionalColumns.animals} size="small" /> Biting Animal Breakdown
        </MenuItem>
        <MenuItem onClick={() => onToggleOptionalColumn('trend')}>
          <Checkbox checked={optionalColumns.trend} size="small" /> Period Trend Column
        </MenuItem>
        <MenuItem onClick={() => onToggleOptionalColumn('risk_score')}>
          <Checkbox checked={optionalColumns.risk_score} size="small" /> Reference Score Column
        </MenuItem>
      </Menu>

      {/* Priority Legend Popover */}
      <Popover
        open={Boolean(legendAnchorEl)}
        anchorEl={legendAnchorEl}
        onClose={() => setLegendAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>Barangay Surveillance Reference Legend</Typography>
          <Divider sx={{ mb: 1 }} />
          {(['high', 'medium', 'low', 'limited_data'] as PriorityLevel[]).map((lvl) => (
            <Box key={lvl} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: priorityConfig[lvl].color }}>
                {priorityConfig[lvl].label}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>
                {priorityConfig[lvl].desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Popover>
    </Box>
  );
}
