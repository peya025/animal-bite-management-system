import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutlined,
  ChevronRightOutlined,
  ErrorOutlineOutlined,
  EventBusyOutlined,
  HealthAndSafetyOutlined,
  LocationOffOutlined,
  PetsOutlined,
  ScheduleOutlined,
  VaccinesOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { ROUTES } from '../../../shared/config/routes';
import type { ClinicalAlertsSummary } from '../types/biteCasesSummary.types';

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

export function ClinicalRiskAlertsStrip({
  alerts,
  onDrillDownFilter,
  onJumpToOverdue,
}: ClinicalRiskAlertsStripProps) {
  const navigate = useNavigate();
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

  const hasAnyAlert = triageCards.length > 0 || unknownLocWarn;

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
            No pending clinical care items in this summary. Review community reporting trends in Surveillance Insights.
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


    </>
  );
}
