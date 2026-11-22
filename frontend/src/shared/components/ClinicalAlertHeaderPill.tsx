import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { ROUTES } from '../config/routes';
import './ClinicalAlertHeaderPill.css';

interface HeaderClinicalAlertSummary {
  rig_pending_total: number;
  rig_pending_urgent_48h: number;
  animal_died: number;
  animal_sick: number;
  overdue_episodes: number;
  overdue_critical_3d_plus: number;
  unassessed_over_48h: number;
  day14_observation_due: number;
  vial_readiness_status: 'shortfall' | 'tight' | 'expiring' | 'ok';
  vial_readiness_headline: string;
  usable_arv_vials: number;
  projected_stockout_date: string | null;
  barangay_clusters_count: number;
  barangay_clusters: string[];
  updated_at: string;
}

interface PillAlertItem {
  key: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  badge: string;
  route: string;
}

const SNOOZE_KEY = 'abtc_clinical_alert_pill_snooze_v1';
const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface SnoozeState {
  until: number;
  criticalCountAtSnooze: number;
  totalCountAtSnooze: number;
}

function readSnoozeState(): SnoozeState | null {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SnoozeState;
    if (typeof parsed.until === 'number' && parsed.until > Date.now()) {
      return parsed;
    }
    localStorage.removeItem(SNOOZE_KEY);
    return null;
  } catch {
    return null;
  }
}

export default function ClinicalAlertHeaderPill() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);

  const role: string = user?.role ?? '';
  const isAllowedRole = ['admin', 'developer', 'triage', 'doctor', 'treatment', 'nurse'].includes(role);
  const isOnBiteCasesPage = location.pathname.startsWith(ROUTES.BITE_CASES.LIST);

  const [summary, setSummary] = useState<HeaderClinicalAlertSummary | null>(null);
  const [snooze, setSnooze] = useState<SnoozeState | null>(() => readSnoozeState());
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const supportsNativePopover =
    typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover');

  const fetchSummary = useCallback(async () => {
    if (!isAllowedRole || !user) return;
    try {
      const res = await api.get<HeaderClinicalAlertSummary>('/cases/clinical-alerts/summary');
      if (res.data) {
        setSummary(res.data);
      }
    } catch {
      // Silent failure — never disrupt active clinical work
    }
  }, [isAllowedRole, user]);

  useEffect(() => {
    if (!isAllowedRole) return;
    const initial = window.setTimeout(() => {
      void fetchSummary();
    }, 0);
    const interval = window.setInterval(() => {
      if (!document.hidden) void fetchSummary();
    }, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [isAllowedRole, fetchSummary]);

  // Refresh immediately when a live clinical safety or inventory notification arrives over Echo/Reverb
  const latestSafetyNotifId = useMemo(() => {
    const match = notifications.find((n) =>
      ['rig_pending', 'animal_risk', 'vial_shortfall_7d', 'high_risk_area'].includes(n.type)
    );
    return match?.id ?? 0;
  }, [notifications]);

  useEffect(() => {
    if (latestSafetyNotifId > 0 && isAllowedRole) {
      const timer = window.setTimeout(() => {
        void fetchSummary();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [latestSafetyNotifId, isAllowedRole, fetchSummary]);

  // Build role-filtered high-priority alert items
  const items = useMemo<PillAlertItem[]>(() => {
    if (!summary || !isAllowedRole) return [];
    const list: PillAlertItem[] = [];
    const isDoctor = role === 'triage' || role === 'doctor';
    const isNurse = role === 'treatment' || role === 'nurse';
    const isAdmin = role === 'admin' || role === 'developer';

    if (summary.rig_pending_total > 0 && (isDoctor || isNurse || isAdmin)) {
      list.push({
        key: 'rig_pending',
        severity: 'critical',
        title: 'RIG Pending (Category III)',
        detail:
          summary.rig_pending_urgent_48h > 0
            ? `${summary.rig_pending_urgent_48h} within 48h window · no verified RIG recorded`
            : 'Category III / indicated episodes awaiting RIG administration',
        badge: `${summary.rig_pending_total}`,
        route: `${ROUTES.BITE_CASES.LIST}?tab=cases&status=rig_pending`,
      });
    }

    if ((summary.animal_died > 0 || summary.animal_sick > 0) && (isDoctor || isNurse || isAdmin)) {
      const total = summary.animal_died + summary.animal_sick;
      list.push({
        key: 'animal_risk',
        severity: summary.animal_died > 0 ? 'critical' : 'warning',
        title: summary.animal_died > 0 ? 'Biting Animal Died / Sick' : 'Biting Animal Reported Sick',
        detail:
          summary.animal_died > 0
            ? `${summary.animal_died} died${summary.animal_sick > 0 ? ` · ${summary.animal_sick} sick` : ''} — verify full PEP & RIG`
            : `${summary.animal_sick} sick — verify PEP adherence`,
        badge: `${total}`,
        route: `${ROUTES.BITE_CASES.LIST}?tab=cases&animal_condition=${summary.animal_died > 0 ? 'died' : 'sick'}`,
      });
    }

    if (summary.vial_readiness_status === 'shortfall' && (isNurse || isAdmin)) {
      list.push({
        key: 'vial_shortfall',
        severity: 'critical',
        title: '7-Day Follow-Up Vial Shortfall',
        detail: summary.vial_readiness_headline || `${summary.usable_arv_vials} usable ARV vials`,
        badge: summary.projected_stockout_date ? summary.projected_stockout_date.slice(5) : `${summary.usable_arv_vials}v`,
        route: `${ROUTES.INVENTORY.LIST}?tab=forecast`,
      });
    }

    if (summary.overdue_critical_3d_plus > 0 && (isNurse || isAdmin)) {
      list.push({
        key: 'overdue_pep',
        severity: 'critical',
        title: 'Severely Overdue PEP (≥ 3 Days)',
        detail: `${summary.overdue_critical_3d_plus} episode(s) ≥3d past scheduled follow-up dose`,
        badge: `${summary.overdue_critical_3d_plus}`,
        route: `${ROUTES.BITE_CASES.LIST}?tab=treatment`,
      });
    }

    if (summary.barangay_clusters_count > 0 && isAdmin) {
      list.push({
        key: 'barangay_cluster',
        severity: 'critical',
        title: '7-Day Barangay Bite Cluster',
        detail: summary.barangay_clusters.slice(0, 2).join(', '),
        badge: `${summary.barangay_clusters_count}`,
        route: `${ROUTES.BITE_CASES.LIST}?range=week`,
      });
    }

    if (summary.unassessed_over_48h > 0 && (isDoctor || isAdmin)) {
      list.push({
        key: 'unassessed_48h',
        severity: 'warning',
        title: 'Unassessed > 48 Hours (Form 1)',
        detail: `${summary.unassessed_over_48h} patient(s) awaiting doctor assessment >48h`,
        badge: `${summary.unassessed_over_48h}`,
        route: `${ROUTES.BITE_CASES.LIST}?tab=cases&status=unassessed_over_48h`,
      });
    }

    if (summary.day14_observation_due > 0 && (isDoctor || isNurse)) {
      list.push({
        key: 'day14_due',
        severity: 'warning',
        title: 'Day-14 Animal Observation Due',
        detail: `${summary.day14_observation_due} owned pet(s) at Days 14–21 need status check`,
        badge: `${summary.day14_observation_due}`,
        route: `${ROUTES.BITE_CASES.LIST}?tab=cases&animal_status=owned&animal_condition=unknown`,
      });
    }

    return list;
  }, [summary, isAllowedRole, role]);

  const criticalCount = useMemo(
    () => items.filter((i) => i.severity === 'critical').length,
    [items]
  );

  // Auto-wake if a new critical alert arrives or alert count increases while snoozed
  const isSnoozed = useMemo(() => {
    if (!snooze || snooze.until <= Date.now()) return false;
    if (criticalCount > snooze.criticalCountAtSnooze || items.length > snooze.totalCountAtSnooze) {
      return false;
    }
    return true;
  }, [snooze, criticalCount, items.length]);

  useEffect(() => {
    if (snooze && !isSnoozed) {
      try {
        localStorage.removeItem(SNOOZE_KEY);
      } catch {
        // Ignore storage errors
      }
      setSnooze(null);
    }
  }, [snooze, isSnoozed]);

  if (!isAllowedRole || isOnBiteCasesPage || items.length === 0) {
    return null;
  }

  const hasCritical = criticalCount > 0;
  const primaryItem = items[0];

  const closePopover = () => {
    if (supportsNativePopover && popoverRef.current && typeof popoverRef.current.hidePopover === 'function') {
      try {
        popoverRef.current.hidePopover();
      } catch {
        // Already hidden
      }
    } else {
      setFallbackOpen(false);
    }
  };

  const handleNavigate = (route: string) => {
    closePopover();
    navigate(route);
  };

  const handleSnooze = () => {
    const next: SnoozeState = {
      until: Date.now() + SNOOZE_DURATION_MS,
      criticalCountAtSnooze: criticalCount,
      totalCountAtSnooze: items.length,
    };
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    setSnooze(next);
    closePopover();
  };

  const handleWake = () => {
    try {
      localStorage.removeItem(SNOOZE_KEY);
    } catch {
      // Ignore storage errors
    }
    setSnooze(null);
  };

  const pillLabel =
    items.length === 1
      ? `${primaryItem.badge} ${primaryItem.title}`
      : `${items.length} Clinical Alerts · ${primaryItem.title}`;

  const popoverAttrs = supportsNativePopover ? ({ popover: 'auto' } as const) : {};
  const triggerAttrs = supportsNativePopover ? { popoverTarget: popoverId } : {};

  return (
    <div className="clinical-alert-pill-wrap">
      <button
        type="button"
        className={`clinical-alert-pill-btn ${
          hasCritical ? 'clinical-alert-pill-btn--critical' : 'clinical-alert-pill-btn--warning'
        } ${isSnoozed ? 'clinical-alert-pill-btn--snoozed' : ''}`}
        title={isSnoozed ? `${items.length} clinical alert(s) snoozed — click to view` : pillLabel}
        aria-label={pillLabel}
        {...triggerAttrs}
        onClick={!supportsNativePopover ? () => setFallbackOpen((v) => !v) : undefined}
      >
        <span
          className={`clinical-alert-pill-dot ${
            hasCritical ? 'clinical-alert-pill-dot--critical' : 'clinical-alert-pill-dot--warning'
          }`}
          aria-hidden="true"
        />
        {!isSnoozed && <span>{pillLabel}</span>}
      </button>

      {(supportsNativePopover || fallbackOpen) && (
        <div
          id={popoverId}
          ref={popoverRef}
          className={`clinical-alert-popover ${!supportsNativePopover ? 'clinical-alert-popover-fallback' : ''}`}
          aria-label="Clinical safety alerts"
          {...popoverAttrs}
        >
          <div className="clinical-alert-popover-header">
            <span className="clinical-alert-popover-title">
              Active Clinical Safety Alerts ({items.length})
            </span>
            {isSnoozed && (
              <button
                type="button"
                className="clinical-alert-footer-btn clinical-alert-footer-btn--primary"
                onClick={handleWake}
              >
                Unmute pill
              </button>
            )}
          </div>

          <div className="clinical-alert-popover-list">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="clinical-alert-item-btn"
                onClick={() => handleNavigate(item.route)}
              >
                <div>
                  <div className="clinical-alert-item-title">{item.title}</div>
                  <div className="clinical-alert-item-detail">{item.detail}</div>
                </div>
                <span
                  className={`clinical-alert-item-badge ${
                    item.severity === 'critical'
                      ? 'clinical-alert-item-badge--critical'
                      : 'clinical-alert-item-badge--warning'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="clinical-alert-popover-footer">
            <button
              type="button"
              className="clinical-alert-footer-btn clinical-alert-footer-btn--muted"
              onClick={handleSnooze}
            >
              Collapse 1h (wakes on new)
            </button>
            <button
              type="button"
              className="clinical-alert-footer-btn clinical-alert-footer-btn--primary"
              onClick={() => handleNavigate(ROUTES.BITE_CASES.LIST)}
            >
              Open Bite Cases →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
