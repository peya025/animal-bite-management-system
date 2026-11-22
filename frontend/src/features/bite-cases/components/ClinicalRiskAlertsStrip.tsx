import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CampaignOutlined,
  CheckCircleOutlined,
  ChevronRightOutlined,
  CloseOutlined,
  ErrorOutlineOutlined,
  EventBusyOutlined,
  HealthAndSafetyOutlined,
  LocationOffOutlined,
  MapOutlined,
  PetsOutlined,
  ScheduleOutlined,
  TrendingUpOutlined,
  VaccinesOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import api from '../../../services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/config/routes';
import type { BarangaySurgeAlert, ClinicalAlertsSummary } from '../types/biteCasesSummary.types';
import { formatLocalDate } from '../types/biteCasesSummary.types';
import { BC_BORDER } from './BiteCasesSharedUi';

interface ClinicalRiskAlertsStripProps {
  alerts?: ClinicalAlertsSummary;
  onDrillDownFilter: (next: {
    status?: string;
    severity?: string;
    animal_condition?: string;
    search?: string;
    range?: string;
  }) => void;
  onJumpToOverdue: () => void;
  onNotify: (msg: string) => void;
}

function buildDefaultAdvisoryMessage(barangay: string): string {
  return (
    `Pahibalo sa Tagoloan ABTC: Adunay nadugang nga natalang kaso sa pinaakan sa hayop sa Brgy. ${barangay} karong semanaha. ` +
    `Palihug ihigot ang mga binuhing iro ug iring, bantayi ang mga bata, ug likayi ang mga naglatagaw nga hayop. ` +
    `Kung mapaakan o makawrasan, hugasi dayon og sabon ug nagaagos nga tubig sulod sa 15 minutos ug bisita dayon sa Tagoloan ABTC.`
  );
}

function defaultExpiryDate(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return formatLocalDate(d);
}

export function ClinicalRiskAlertsStrip({
  alerts,
  onDrillDownFilter,
  onJumpToOverdue,
  onNotify,
}: ClinicalRiskAlertsStripProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  const [advisoryTarget, setAdvisoryTarget] = useState<BarangaySurgeAlert | null>(null);
  const [advisoryTitle, setAdvisoryTitle] = useState('');
  const [advisoryMessage, setAdvisoryMessage] = useState('');
  const [advisoryExpiry, setAdvisoryExpiry] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  if (!alerts) return null;

  const rigTotal = alerts.rig_pending.total;
  const rigUrgent = alerts.rig_pending.urgent_within_48h;
  const overdueTotal = alerts.overdue_pep.overdue_episodes;
  const overdueCritical = alerts.overdue_pep.critical_3d_plus;
  const animalDied = alerts.high_risk_animals.died;
  const animalSick = alerts.high_risk_animals.sick;
  const animalTotal = alerts.high_risk_animals.total;
  const unassessedOver48h = alerts.workflow_pending.unassessed_over_48h;
  const catMissing = alerts.workflow_pending.assessed_category_missing;
  const surges = alerts.barangay_surges || [];
  const unknownLocWarn = alerts.data_completeness.unknown_location_warning;
  const unknownLocCount = alerts.data_completeness.unknown_location_count;
  const unknownLocPct = alerts.data_completeness.unknown_location_pct;
  const vialReadiness = alerts.vial_readiness;

  const triageCards: Array<{
    key: string;
    severity: 'critical' | 'warning';
    icon: React.ReactNode;
    title: string;
    count: number;
    detail: string;
    actionLabel: string;
    onClick: () => void;
  }> = [];

  if (rigTotal > 0) {
    triageCards.push({
      key: 'rig_pending',
      severity: 'critical',
      icon: <HealthAndSafetyOutlined aria-hidden="true" sx={{ fontSize: 18, color: '#dc2626' }} />,
      title: 'RIG Pending (Category III / Indicated)',
      count: rigTotal,
      detail:
        rigUrgent > 0
          ? `${rigUrgent} within critical 48-hour window · no verified RIG recorded`
          : 'No verified ERIG/HRIG administration recorded yet',
      actionLabel: 'Review RIG cases',
      onClick: () => onDrillDownFilter({ status: 'rig_pending' }),
    });
  }

  if (overdueTotal > 0) {
    triageCards.push({
      key: 'overdue_pep',
      severity: overdueCritical > 0 ? 'critical' : 'warning',
      icon: (
        <EventBusyOutlined
          aria-hidden="true"
          sx={{ fontSize: 18, color: overdueCritical > 0 ? '#dc2626' : '#d97706' }}
        />
      ),
      title: 'Overdue PEP Follow-Ups',
      count: overdueTotal,
      detail:
        overdueCritical > 0
          ? `${overdueCritical} overdue ≥ 3 days · ${alerts.overdue_pep.outstanding_dose_slots} missed dose slot(s)`
          : `${alerts.overdue_pep.overdue_patients} patient(s) 1–2 days past scheduled dose`,
      actionLabel: 'Open recall list',
      onClick: onJumpToOverdue,
    });
  }

  if (animalTotal > 0) {
    triageCards.push({
      key: 'high_risk_animals',
      severity: animalDied > 0 ? 'critical' : 'warning',
      icon: (
        <PetsOutlined
          aria-hidden="true"
          sx={{ fontSize: 18, color: animalDied > 0 ? '#dc2626' : '#d97706' }}
        />
      ),
      title: animalDied > 0 ? 'Biting Animal Died / Sick' : 'Biting Animal Reported Sick',
      count: animalTotal,
      detail:
        animalDied > 0 && animalSick > 0
          ? `${animalDied} dead/died · ${animalSick} sick — verify full PEP & RIG`
          : animalDied > 0
            ? `${animalDied} dead/died — verify mandatory full PEP & RIG`
            : `${animalSick} sick — monitor and verify PEP adherence`,
      actionLabel: 'Inspect episodes',
      onClick: () => onDrillDownFilter({ animal_condition: animalDied > 0 ? 'died' : 'sick' }),
    });
  }

  if (vialReadiness && vialReadiness.status !== 'ok') {
    const isShortfall = vialReadiness.status === 'shortfall';
    triageCards.push({
      key: 'vial_readiness',
      severity: isShortfall ? 'critical' : 'warning',
      icon: (
        <VaccinesOutlined
          aria-hidden="true"
          sx={{ fontSize: 18, color: isShortfall ? '#dc2626' : '#d97706' }}
        />
      ),
      title: isShortfall
        ? '7-Day Follow-Up Vial Shortfall'
        : vialReadiness.status === 'tight'
          ? '7-Day Follow-Up Stock Tight'
          : 'ARV Batch Expiry Watch',
      count: vialReadiness.usable_arv_vials,
      detail: vialReadiness.headline,
      actionLabel: 'Open supply forecast',
      onClick: () => navigate(`${ROUTES.INVENTORY.LIST}?tab=forecast`),
    });
  }

  if (unassessedOver48h > 0) {
    triageCards.push({
      key: 'unassessed_over_48h',
      severity: 'warning',
      icon: <ScheduleOutlined aria-hidden="true" sx={{ fontSize: 18, color: '#d97706' }} />,
      title: 'Unassessed > 48 Hours (Form 1)',
      count: unassessedOver48h,
      detail: 'Registered >48h ago without finalized doctor assessment; verify RIG/PEP need',
      actionLabel: 'Review pending',
      onClick: () => onDrillDownFilter({ status: 'unassessed_over_48h' }),
    });
  }

  if (catMissing > 0) {
    triageCards.push({
      key: 'assessed_category_missing',
      severity: 'warning',
      icon: <WarningAmberOutlined aria-hidden="true" sx={{ fontSize: 18, color: '#d97706' }} />,
      title: 'Assessed Without WHO Category',
      count: catMissing,
      detail: 'Finalized Form 2 chart missing Category I–III; required for DOH reporting & RIG check',
      actionLabel: 'Fix charts',
      onClick: () => onDrillDownFilter({ severity: 'assessed_category_missing' }),
    });
  }

  const hasAnyAlert = triageCards.length > 0 || surges.length > 0 || unknownLocWarn;

  const openPublishAdvisory = (surge: BarangaySurgeAlert) => {
    setAdvisoryTarget(surge);
    setAdvisoryTitle(`Community Bite Caution: Brgy. ${surge.barangay}`);
    setAdvisoryMessage(buildDefaultAdvisoryMessage(surge.barangay));
    setAdvisoryExpiry(defaultExpiryDate(7));
    setPublishError('');
  };

  const handlePrintBarangayMemo = async (barangay: string) => {
    try {
      const res = await api.get<string>('/print/reports/barangay-advisory-memo', {
        params: { barangay },
        responseType: 'text' as unknown as 'json',
      });
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(String(res.data));
        printWin.document.close();
      } else {
        onNotify('Please allow pop-ups to open the Barangay / MAO Advisory Memo.');
      }
    } catch {
      onNotify(`Unable to generate Barangay / MAO Memo for Brgy. ${barangay}.`);
    }
  };

  const handlePublishAdvisory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!advisoryTarget || !advisoryTitle.trim() || !advisoryMessage.trim()) return;
    setPublishing(true);
    setPublishError('');
    try {
      await api.post('/announcements', {
        title: advisoryTitle.trim(),
        message: advisoryMessage.trim(),
        is_published: true,
        is_urgent: true,
        target_barangay: advisoryTarget.barangay,
        expires_on: advisoryExpiry || null,
      });
      onNotify(`Published mobile community advisory for Brgy. ${advisoryTarget.barangay}.`);
      setAdvisoryTarget(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setPublishError(axiosErr?.response?.data?.message || 'Unable to publish mobile advisory.');
    } finally {
      setPublishing(false);
    }
  };

  if (!hasAnyAlert) {
    return (
      <Paper
        elevation={0}
        component="section"
        aria-label="Clinical risk alerts status"
        sx={{
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          px: 2,
          py: 1.25,
          bgcolor: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <CheckCircleOutlined aria-hidden="true" sx={{ fontSize: 18, color: '#059669' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
            All clinical safety checks clear
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#047857' }}>
            No pending Category III RIG, overdue PEP follow-ups, dead/sick biting animals, or 7-day barangay surges.
            {vialReadiness
              ? ` Next 7d supply covered (${vialReadiness.usable_arv_vials} ARV vials for ${vialReadiness.next_7d_committed_followups} scheduled follow-ups).`
              : ''}
          </Typography>
        </Box>
        {vialReadiness && (
          <Button
            size="small"
            variant="text"
            endIcon={<ChevronRightOutlined sx={{ fontSize: 16 }} />}
            onClick={() => navigate(`${ROUTES.INVENTORY.LIST}?tab=forecast`)}
            sx={{
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 700,
              color: '#065f46',
              px: 1,
            }}
          >
            View 14d vial forecast
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <>
      <Paper
        elevation={0}
        component="section"
        aria-label="Clinical risk alerts"
        sx={{
          border: alerts.has_critical_alerts ? '1px solid #fecaca' : '1px solid #fde68a',
          borderRadius: '14px',
          p: { xs: 1.75, md: 2 },
          bgcolor: 'var(--bc-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
            {alerts.has_critical_alerts ? (
              <ErrorOutlineOutlined aria-hidden="true" sx={{ fontSize: 20, color: '#dc2626' }} />
            ) : (
              <WarningAmberOutlined aria-hidden="true" sx={{ fontSize: 20, color: '#d97706' }} />
            )}
            <Typography component="h3" sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)' }}>
              Clinical Risk Alerts &amp; Priority Triage
            </Typography>
            <Chip
              size="small"
              label={alerts.has_critical_alerts ? 'Immediate review needed' : 'Attention recommended'}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: alerts.has_critical_alerts ? '#fef2f2' : '#fffbeb',
                color: alerts.has_critical_alerts ? '#b91c1c' : '#b45309',
                border: alerts.has_critical_alerts ? '1px solid #fecaca' : '1px solid #fde68a',
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
            Select any alert to open the filtered patient list immediately.
          </Typography>
        </Box>

        {/* Triage Action Cards */}
        {triageCards.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: `repeat(${Math.min(triageCards.length, 4)}, minmax(0, 1fr))`,
              },
              gap: 1.25,
            }}
          >
            {triageCards.map((card) => {
              const isCritical = card.severity === 'critical';
              return (
                <Box
                  key={card.key}
                  component="button"
                  type="button"
                  onClick={card.onClick}
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    border: isCritical ? '1px solid #fecaca' : '1px solid #fde68a',
                    borderLeft: `4px solid ${isCritical ? '#dc2626' : '#d97706'}`,
                    bgcolor: isCritical ? '#fef2f2' : '#fffbeb',
                    textAlign: 'left',
                    font: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 0.75,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${isCritical ? '#b91c1c' : '#b45309'}`,
                      outlineOffset: '2px',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65, minWidth: 0 }}>
                      {card.icon}
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 800,
                          color: isCritical ? '#991b1b' : '#92400e',
                          lineHeight: 1.25,
                        }}
                      >
                        {card.title}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: isCritical ? '#b91c1c' : '#b45309',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {card.count}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-2)', lineHeight: 1.4 }}>
                    {card.detail}
                  </Typography>

                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.25,
                      fontSize: 12,
                      fontWeight: 700,
                      color: isCritical ? '#b91c1c' : '#b45309',
                      mt: 'auto',
                    }}
                  >
                    <span>{card.actionLabel}</span>
                    <ChevronRightOutlined aria-hidden="true" sx={{ fontSize: 16 }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* 7-Day Barangay Cluster / Surge Alerts */}
        {surges.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 800,
                color: 'var(--bc-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              7-Day Barangay Activity Alerts (Normalized Exposure Locations)
            </Typography>
            {surges.map((surge) => {
              const isCluster = surge.level === 'cluster';
              return (
                <Box
                  key={surge.barangay}
                  sx={{
                    p: 1.25,
                    borderRadius: '10px',
                    border: isCluster ? '1px solid #fecaca' : '1px solid #fde68a',
                    bgcolor: 'var(--bc-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.25,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0, flex: 1 }}>
                    <TrendingUpOutlined
                      aria-hidden="true"
                      sx={{ fontSize: 19, color: isCluster ? '#dc2626' : '#d97706', mt: 0.2, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bc-text)' }}>
                          Brgy. {surge.barangay}
                        </Typography>
                        <Chip
                          size="small"
                          label={isCluster ? '7-Day Cluster' : '7-Day Surge'}
                          sx={{
                            height: 20,
                            fontSize: 10.5,
                            fontWeight: 800,
                            bgcolor: isCluster ? '#fef2f2' : '#fffbeb',
                            color: isCluster ? '#b91c1c' : '#b45309',
                            border: isCluster ? '1px solid #fecaca' : '1px solid #fde68a',
                          }}
                        />
                        {surge.awaiting_assessment_7d > 0 && (
                          <Chip
                            size="small"
                            label={`${surge.awaiting_assessment_7d} awaiting assessment`}
                            sx={{
                              height: 20,
                              fontSize: 10.5,
                              fontWeight: 600,
                              bgcolor: 'var(--bc-surface-3)',
                              color: 'var(--bc-text-secondary)',
                            }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'var(--bc-text-2)', mt: 0.25 }}>
                        {surge.reason}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onDrillDownFilter({ search: surge.barangay, range: 'week' })}
                      sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: '8px',
                        borderColor: '#cbd5e1',
                        color: 'var(--bc-text)',
                      }}
                    >
                      View Cases
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<MapOutlined aria-hidden="true" sx={{ fontSize: 15 }} />}
                      onClick={() =>
                        navigate(`${ROUTES.BITE_CASES.MAP}?location=${encodeURIComponent(surge.barangay)}&period=week`)
                      }
                      sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: '8px',
                        borderColor: '#0f766e',
                        color: '#0f766e',
                      }}
                    >
                      Bite Map
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handlePrintBarangayMemo(surge.barangay)}
                      sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: '8px',
                        borderColor: '#94a3b8',
                        color: 'var(--bc-text)',
                      }}
                    >
                      Barangay / MAO Memo
                    </Button>
                    {isAdmin && (
                      <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        startIcon={<CampaignOutlined aria-hidden="true" sx={{ fontSize: 15 }} />}
                        onClick={() => openPublishAdvisory(surge)}
                        sx={{
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: '8px',
                          bgcolor: '#0f766e',
                          '&:hover': { bgcolor: '#0d655e' },
                        }}
                      >
                        Publish Advisory to Mobile
                      </Button>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Quiet Data Completeness Safeguard for Unknown Exposure Locations */}
        {unknownLocWarn && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: '8px',
              bgcolor: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85 }}>
              <LocationOffOutlined aria-hidden="true" sx={{ fontSize: 17, color: '#b45309', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12.5, color: '#92400e' }}>
                <strong>Data completeness notice:</strong> {unknownLocCount} episode{unknownLocCount === 1 ? '' : 's'} ({unknownLocPct}%) have no place of incident recorded and are excluded from barangay surge alerts.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="text"
              onClick={() => onDrillDownFilter({ search: 'not recorded' })}
              sx={{
                textTransform: 'none',
                fontSize: 12,
                fontWeight: 700,
                color: '#92400e',
                p: 0,
                minWidth: 'auto',
              }}
            >
              Review records
            </Button>
          </Box>
        )}
      </Paper>

      {/* Human-in-the-Loop Publish Barangay Advisory to Mobile Dialog */}
      <Dialog
        open={Boolean(advisoryTarget)}
        onClose={() => !publishing && setAdvisoryTarget(null)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="bc-publish-advisory-title"
      >
        <form onSubmit={handlePublishAdvisory}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Box>
              <Typography id="bc-publish-advisory-title" sx={{ fontSize: 16, fontWeight: 800, color: 'var(--bc-text)' }}>
                Publish Community Advisory to Mobile App
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                Appears on the mobile home page announcement banner and sends an FCM push notification.
              </Typography>
            </Box>
            <IconButton onClick={() => setAdvisoryTarget(null)} disabled={publishing} aria-label="Close publish advisory modal">
              <CloseOutlined aria-hidden="true" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Alert severity="info" sx={{ fontSize: 12 }}>
              <strong>Public-health guideline:</strong> Keep wording calm and actionable. Do not include patient names, exact puroks/addresses, or claim confirmed rabies without laboratory verification.
            </Alert>
            {publishError && <Alert severity="error" sx={{ fontSize: 12.5 }}>{publishError}</Alert>}
            <TextField
              size="small"
              label="Target Barangay"
              value={advisoryTarget?.barangay || ''}
              slotProps={{ input: { readOnly: true } }}
              fullWidth
            />
            <TextField
              size="small"
              label="Advisory Headline *"
              required
              value={advisoryTitle}
              onChange={(e) => setAdvisoryTitle(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 160 } }}
              fullWidth
            />
            <TextField
              size="small"
              label="Community Guidance Message *"
              required
              multiline
              minRows={4}
              value={advisoryMessage}
              onChange={(e) => setAdvisoryMessage(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 1500 } }}
              fullWidth
            />
            <TextField
              size="small"
              type="date"
              label="Auto-Expire Date"
              value={advisoryExpiry}
              onChange={(e) => setAdvisoryExpiry(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="Automatically stops displaying on the mobile home page after this date (default: 7 days)."
              sx={{ maxWidth: 260 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: BC_BORDER }}>
            <Button onClick={() => setAdvisoryTarget(null)} disabled={publishing} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={publishing || !advisoryTitle.trim() || !advisoryMessage.trim()}
              startIcon={<CampaignOutlined aria-hidden="true" />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: '#0f766e',
                '&:hover': { bgcolor: '#0d655e' },
              }}
            >
              {publishing ? 'Publishing…' : 'Publish to Mobile Home Page'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
