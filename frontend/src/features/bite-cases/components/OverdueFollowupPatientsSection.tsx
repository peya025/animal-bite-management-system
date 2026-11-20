import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  CalendarMonthOutlined,
  CloseOutlined,
  ContentCopyOutlined,
  LockOutlined,
  MoreVertOutlined,
  NoteAddOutlined,
  OpenInNewOutlined,
  PhoneOutlined,
  SearchOutlined,
  SmsOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import api from '../../../services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/config/routes';
import type { CaseSummary, PatientFollowupLog, PrivacyMode } from '../types/biteCasesSummary.types';
import { BC_BORDER, SemanticChip } from './BiteCasesSharedUi';

interface OverdueFollowupPatientsSectionProps {
  cases: CaseSummary[];
  privacyMode: PrivacyMode;
  onSwitchToInternalMode: () => void;
  onCaseLogsUpdated: (biteId: number, log: PatientFollowupLog) => void;
  onNotify: (msg: string) => void;
}

function resolveOverdueDoseDay(caseItem: CaseSummary): number {
  if (typeof caseItem.overdue_dose_day === 'number' && !Number.isNaN(caseItem.overdue_dose_day)) {
    return caseItem.overdue_dose_day;
  }
  const slot = caseItem.overdue_dose_slots?.[0];
  if (slot && typeof slot.dose_number === 'number') {
    return slot.dose_number;
  }
  const match = String(caseItem.overdue_dose || '').match(/(\d+)/);
  if (match) {
    return Number(match[1]);
  }
  return 3;
}

function buildStandardDohSms(patientName: string, doseDay: number | string): string {
  const cleanName = patientName.trim() || 'Patient';
  const dayText = String(doseDay ?? '').trim() || 'Follow-up';
  return `ABCare Tagoloan Reminder: Maayong adlaw ${cleanName}. Schedule nimo karon para sa imong follow-up anti-rabies shot (Day ${dayText}) sa Tagoloan ABTC. Palihug bisita taliwala sa 8:00 AM - 4:00 PM para sa imong kaluwasan. Salamat!`;
}

function formatLogStatusLabel(status: string): string {
  const map: Record<string, string> = {
    promised_visit: 'Promised Visit',
    reached: 'Reached',
    no_answer: 'No Answer',
    wrong_number: 'Wrong / Unreachable #',
    sms_queued: 'SMS Queued',
    sms_sent: 'SMS Sent',
    sms_delivered: 'SMS Delivered',
    sms_simulated: 'SMS Simulated',
    sms_logged: 'SMS Reminder Logged',
    sms_failed: 'SMS Failed',
    refused: 'Refused Follow-up',
    completed_elsewhere: 'Completed Elsewhere',
  };
  return map[status] || status.replace(/_/g, ' ');
}

function getLogStatusStyle(status: string): { bg: string; color: string; border: string } {
  if (['promised_visit', 'reached', 'sms_sent', 'sms_delivered', 'completed_elsewhere'].includes(status)) {
    return { bg: 'var(--bc-success-bg)', color: 'var(--bc-green-strong)', border: 'var(--bc-success-border)' };
  }
  if (['sms_failed', 'wrong_number', 'refused'].includes(status)) {
    return { bg: 'var(--bc-danger-bg)', color: 'var(--bc-red-strong)', border: 'var(--bc-danger-border)' };
  }
  return { bg: 'var(--bc-amber-bg)', color: 'var(--bc-amber-strong)', border: 'var(--bc-amber-border)' };
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

let lastCopyAnnouncement = '';

function CopyPhoneControl({
  phone,
  source,
  patientName,
  onCopied,
}: {
  phone: string;
  source?: 'patient' | 'guardian' | null;
  patientName: string;
  onCopied: (phone: string) => void;
}) {
  const valueId = useId();
  const [bubbleText, setBubbleText] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(phone);
    if (!ok) return;
    let msg = 'Copied';
    if (msg === lastCopyAnnouncement) msg += '\u00A0';
    lastCopyAnnouncement = msg;
    setBubbleText(msg);
    onCopied(phone);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBubbleText(''), 2000);
  };

  return (
    <Box className="bc-copy-wrap">
      <Box>
        <Typography id={valueId} sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)', fontFamily: 'monospace' }}>
          {phone}
        </Typography>
        {source === 'guardian' && (
          <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)' }}>
            Guardian / Emergency
          </Typography>
        )}
      </Box>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy mobile number ${phone} for ${patientName}`}
        {...({ command: '--copy', commandfor: valueId } as Record<string, string>)}
        title="Copy mobile number"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 6,
          border: '1px solid var(--bc-border-strong)',
          background: 'var(--bc-surface)',
          color: 'var(--bc-text-2)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <ContentCopyOutlined aria-hidden="true" sx={{ fontSize: 14 }} />
      </button>
      <span className="bc-copy-bubble" role="status" aria-live="polite" style={{ display: bubbleText ? 'inline-block' : 'none' }}>
        {bubbleText}
      </span>
    </Box>
  );
}

function OverdueRowActionMenu({
  caseItem,
  canOpenVaccinationSchedule,
  onCopyNumber,
  onOpenSms,
  onOpenLog,
  onRedirectSchedule,
}: {
  caseItem: CaseSummary;
  canOpenVaccinationSchedule: boolean;
  onCopyNumber: (c: CaseSummary) => void;
  onOpenSms: (c: CaseSummary) => void;
  onOpenLog: (c: CaseSummary) => void;
  onRedirectSchedule: (c: CaseSummary) => void;
}) {
  const triggerId = useId();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const enterOnOpenRef = useRef(false);
  const pointerDownRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const phone = caseItem.follow_up_contact_number || caseItem.contact_number || caseItem.emergency_contact_number || '';

  const closeMenu = (restoreFocus = false, fromPointer = false) => {
    const popover = popoverRef.current;
    if (restoreFocus && triggerRef.current) {
      try {
        triggerRef.current.focus({ focusVisible: !fromPointer } as FocusOptions);
      } catch {
        triggerRef.current.focus();
      }
    }
    if (popover && typeof popover.hidePopover === 'function' && popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  };

  useEffect(() => {
    const popover = popoverRef.current;
    const list = listRef.current;
    const trigger = triggerRef.current;
    if (!popover || !list || !trigger) return;

    const supportsFocusgroup = 'focusGroup' in HTMLElement.prototype;
    if (!supportsFocusgroup) {
      list.setAttribute('role', 'menu');
      list.querySelectorAll('button:not([role])').forEach((btn) => btn.setAttribute('role', 'menuitem'));
    }

    const positionFallback = () => {
      if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('position-area: block-end')) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const popRect = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.right - popRect.width;
      if (left < 8) left = Math.max(8, rect.left);
      if (left + popRect.width > vw - 8) left = Math.max(8, vw - popRect.width - 8);
      let top = rect.bottom + 4;
      if (top + popRect.height > vh - 8) {
        top = Math.max(8, rect.top - popRect.height - 4);
      }
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
    };

    const handleToggle = (event: Event) => {
      const toggleEvent = event as ToggleEvent;
      const isOpen = toggleEvent.newState === 'open';
      setMenuOpen(isOpen);
      if (isOpen) {
        positionFallback();
        if (enterOnOpenRef.current) {
          enterOnOpenRef.current = false;
          const firstEnabled = list.querySelector<HTMLButtonElement>('button:not(:disabled)');
          firstEnabled?.focus({ preventScroll: true });
        }
      } else {
        enterOnOpenRef.current = false;
      }
    };

    const handleListKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true, false);
        return;
      }
      if (event.key === 'Tab') {
        closeMenu(false, false);
        return;
      }
      if (!supportsFocusgroup && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = Array.from(list.querySelectorAll<HTMLButtonElement>('button')).filter((btn) => !btn.disabled);
        if (items.length === 0) return;
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        let next: number;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else if (current < 0) next = 0;
        else next = (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
        event.preventDefault();
        items[next].focus({ preventScroll: true });
      }
    };

    popover.addEventListener('toggle', handleToggle);
    list.addEventListener('keydown', handleListKeyDown);
    return () => {
      popover.removeEventListener('toggle', handleToggle);
      list.removeEventListener('keydown', handleListKeyDown);
    };
  }, []);

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const supportsInvokers =
      typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;
    const isKeyboardClick = event.detail === 0;
    if (isKeyboardClick && !pointerDownRef.current) {
      enterOnOpenRef.current = true;
    }
    pointerDownRef.current = false;

    if (supportsInvokers) {
      return;
    }

    event.preventDefault();
    const popover = popoverRef.current;
    if (!popover) return;
    if (popover.matches(':popover-open')) {
      closeMenu(true, !isKeyboardClick);
    } else if (typeof popover.showPopover === 'function') {
      try {
        (popover.showPopover as (opts?: { source?: HTMLElement }) => void)({ source: triggerRef.current || undefined });
      } catch {
        popover.showPopover();
      }
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      enterOnOpenRef.current = true;
      const popover = popoverRef.current;
      if (popover && !popover.matches(':popover-open')) {
        triggerRef.current?.click();
      } else {
        const firstEnabled = listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
        firstEnabled?.focus({ preventScroll: true });
      }
    }
  };

  return (
    <Box sx={{ display: 'inline-block' }}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="bc-action-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onPointerDown={() => {
          pointerDownRef.current = true;
        }}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        {...({ commandfor: menuId, command: 'toggle-popover' } as Record<string, string>)}
      >
        <MoreVertOutlined aria-hidden="true" sx={{ fontSize: 16 }} />
        Follow-up Actions
      </button>

      <div
        id={menuId}
        ref={popoverRef}
        className="bc-action-menu-popover"
        {...({ popover: 'auto' } as Record<string, string>)}
      >
        <div
          ref={listRef}
          aria-labelledby={triggerId}
          className="bc-action-menu-list"
          {...({ focusgroup: 'menu nomemory' } as Record<string, string>)}
        >
          <button
            type="button"
            disabled={!phone}
            onClick={() => {
              closeMenu(true, true);
              onCopyNumber(caseItem);
            }}
          >
            <PhoneOutlined aria-hidden="true" sx={{ fontSize: 17, color: 'var(--bc-green-strong)' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span>Direct Call / Copy Number</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>
                {phone || 'No mobile number recorded'}
              </span>
            </Box>
          </button>

          <button
            type="button"
            onClick={() => {
              closeMenu(false, true);
              onOpenSms(caseItem);
            }}
          >
            <SmsOutlined aria-hidden="true" sx={{ fontSize: 17, color: 'var(--bc-focus-ring)' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span>SMS Reminder Trigger</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>
                DOH Tagoloan ABTC Cebuano template
              </span>
            </Box>
          </button>

          <button
            type="button"
            onClick={() => {
              closeMenu(false, true);
              onOpenLog(caseItem);
            }}
          >
            <NoteAddOutlined aria-hidden="true" sx={{ fontSize: 17, color: 'var(--bc-amber-strong)' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span>Log Contact Attempt</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>
                Record call/outreach &amp; nurse ID
              </span>
            </Box>
          </button>

          {canOpenVaccinationSchedule && caseItem.patient_id && (
            <>
              <hr />
              <button
                type="button"
                onClick={() => {
                  closeMenu(false, true);
                  onRedirectSchedule(caseItem);
                }}
              >
                <CalendarMonthOutlined aria-hidden="true" sx={{ fontSize: 17, color: 'var(--bc-red-strong)' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span>Open in Vaccination Schedule</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--bc-text-secondary)' }}>
                    Redirect to overdue patients list
                  </span>
                </Box>
              </button>
            </>
          )}
        </div>
      </div>
    </Box>
  );
}

export function OverdueFollowupPatientsSection({
  cases,
  privacyMode,
  onSwitchToInternalMode,
  onCaseLogsUpdated,
  onNotify,
}: OverdueFollowupPatientsSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canOpenVaccinationSchedule = ['triage', 'treatment', 'admin', 'developer'].includes(user?.role || '');

  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Native <dialog> refs & state for SMS Reminder Trigger
  const smsDialogRef = useRef<HTMLDialogElement | null>(null);
  const [smsTarget, setSmsTarget] = useState<CaseSummary | null>(null);
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState('');

  // Native <dialog> refs & state for Log Contact Attempt
  const logDialogRef = useRef<HTMLDialogElement | null>(null);
  const [logTarget, setLogTarget] = useState<CaseSummary | null>(null);
  const [logContactType, setLogContactType] = useState<'call' | 'sms' | 'visit' | 'other'>('call');
  const [logStatus, setLogStatus] = useState('promised_visit');
  const [logNotes, setLogNotes] = useState('');
  const [logHistory, setLogHistory] = useState<PatientFollowupLog[]>([]);
  const [logLoadingHistory, setLogLoadingHistory] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logError, setLogError] = useState('');

  const overdueCases = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return cases
      .filter((c) => Boolean(c.is_overdue) && (c.days_overdue ?? 0) >= 1)
      .filter((c) => {
        if (!q) return true;
        return (
          c.case_number.toLowerCase().includes(q) ||
          c.patient_name.toLowerCase().includes(q) ||
          (c.normalized_barangay || c.location || '').toLowerCase().includes(q) ||
          (c.follow_up_contact_number || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.days_overdue ?? 0) - (a.days_overdue ?? 0));
  }, [cases, localSearch]);

  const maxPage = Math.max(0, Math.ceil(overdueCases.length / rowsPerPage) - 1);
  const safePage = Math.min(page, maxPage);

  const displayedOverdue = useMemo(() => {
    if (overdueCases.length <= rowsPerPage) return overdueCases;
    return overdueCases.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);
  }, [overdueCases, safePage, rowsPerPage]);

  // Attach native <dialog> close/light-dismiss fallback
  useEffect(() => {
    const bindDialog = (dialog: HTMLDialogElement | null, onClosed: () => void) => {
      if (!dialog) return () => {};
      const handleClose = () => {
        dialog.returnValue = '';
        onClosed();
      };
      dialog.addEventListener('close', handleClose);

      let cleanupOutside = () => {};
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        const outside = (e: PointerEvent) => {
          const r = dialog.getBoundingClientRect();
          return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        };
        let pressedOutside = false;
        const onDown = (e: PointerEvent) => {
          pressedOutside = outside(e);
        };
        const onUp = (e: PointerEvent) => {
          if (pressedOutside && outside(e)) dialog.close();
        };
        dialog.addEventListener('pointerdown', onDown);
        dialog.addEventListener('pointerup', onUp);
        cleanupOutside = () => {
          dialog.removeEventListener('pointerdown', onDown);
          dialog.removeEventListener('pointerup', onUp);
        };
      }

      return () => {
        dialog.removeEventListener('close', handleClose);
        cleanupOutside();
      };
    };

    const unbindSms = bindDialog(smsDialogRef.current, () => {
      setSmsTarget(null);
      setSmsError('');
    });
    const unbindLog = bindDialog(logDialogRef.current, () => {
      setLogTarget(null);
      setLogError('');
    });

    return () => {
      unbindSms();
      unbindLog();
    };
  }, [smsTarget, logTarget]);

  const openSmsModal = (c: CaseSummary) => {
    const doseDay = resolveOverdueDoseDay(c);
    const phone = c.follow_up_contact_number || c.contact_number || c.emergency_contact_number || '';
    setSmsTarget(c);
    setSmsRecipient(phone);
    setSmsBody(buildStandardDohSms(c.patient_name, doseDay));
    setSmsError('');
    requestAnimationFrame(() => {
      if (smsDialogRef.current && !smsDialogRef.current.open) {
        smsDialogRef.current.showModal();
      }
    });
  };

  const openLogModal = async (c: CaseSummary) => {
    setLogTarget(c);
    setLogContactType('call');
    setLogStatus('promised_visit');
    setLogNotes('');
    setLogError('');
    setLogHistory(c.followup_logs || []);
    requestAnimationFrame(() => {
      if (logDialogRef.current && !logDialogRef.current.open) {
        logDialogRef.current.showModal();
      }
    });

    setLogLoadingHistory(true);
    try {
      const res = await api.get<{ logs: PatientFollowupLog[] }>(`/cases/${c.bite_id}/followup-logs`);
      if (Array.isArray(res.data?.logs)) {
        setLogHistory(res.data.logs);
      }
    } catch {
      // Keep cached preview logs if fetch fails
    } finally {
      setLogLoadingHistory(false);
    }
  };

  const handleCopyNumber = async (c: CaseSummary) => {
    const phone = c.follow_up_contact_number || c.contact_number || c.emergency_contact_number || '';
    if (!phone) {
      onNotify(`No mobile number recorded for ${c.patient_name}.`);
      return;
    }
    const ok = await copyTextToClipboard(phone);
    onNotify(ok ? `Copied ${phone} (${c.patient_name}) to clipboard.` : 'Unable to copy mobile number.');
  };

  const handleSendSmsReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!smsTarget) return;
    setSmsSending(true);
    setSmsError('');
    try {
      const doseDay = resolveOverdueDoseDay(smsTarget);
      const res = await api.post<{
        message: string;
        delivery_status: string;
        log: PatientFollowupLog;
      }>(`/cases/${smsTarget.bite_id}/send-reminder`, {
        dose_day: doseDay,
        dose_label: `Day ${doseDay}`,
        days_overdue: smsTarget.days_overdue ?? 1,
        recipient_number: smsRecipient.trim() || undefined,
        message: smsBody.trim() || undefined,
      });

      if (res.data?.log) {
        onCaseLogsUpdated(smsTarget.bite_id, res.data.log);
      }
      onNotify(res.data?.message || `SMS reminder recorded for ${smsTarget.patient_name}.`);
      smsDialogRef.current?.close();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        axiosErr?.response?.data?.message ||
        Object.values(axiosErr?.response?.data?.errors || {})?.[0]?.[0] ||
        'Unable to dispatch SMS reminder.';
      setSmsError(msg);
    } finally {
      setSmsSending(false);
    }
  };

  const handleSaveContactAttempt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!logTarget) return;
    setLogSubmitting(true);
    setLogError('');
    try {
      const doseDay = resolveOverdueDoseDay(logTarget);
      const res = await api.post<{ message: string; log: PatientFollowupLog }>(
        `/cases/${logTarget.bite_id}/followup-logs`,
        {
          contact_type: logContactType,
          status: logStatus,
          notes: logNotes.trim() || undefined,
          dose_label: `Day ${doseDay}`,
          days_overdue: logTarget.days_overdue ?? 1,
          recipient_number: logTarget.follow_up_contact_number || undefined,
        }
      );

      if (res.data?.log) {
        onCaseLogsUpdated(logTarget.bite_id, res.data.log);
        setLogHistory((prev) => [res.data.log, ...prev]);
      }
      onNotify(`Logged contact attempt for ${logTarget.patient_name}.`);
      logDialogRef.current?.close();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setLogError(axiosErr?.response?.data?.message || 'Unable to log contact attempt.');
    } finally {
      setLogSubmitting(false);
    }
  };

  const handleRedirectToVaccinationSchedule = (caseItem?: CaseSummary) => {
    const params = new URLSearchParams({ tab: 'missed' });
    if (caseItem?.patient_id) {
      params.set('patient_id', String(caseItem.patient_id));
    }
    navigate(`${ROUTES.VACCINATIONS.LIST}?${params.toString()}`);
  };

  if (privacyMode === 'aggregate_only') {
    return (
      <Paper
        id="bc-overdue-followup-section"
        elevation={0}
        sx={{ border: BC_BORDER, borderRadius: '10px', p: 2.25, textAlign: 'center' }}
      >
        <LockOutlined aria-hidden="true" sx={{ fontSize: 28, color: 'var(--bc-amber-strong)', mb: 0.75 }} />
        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)', mb: 0.4 }}>
          Overdue Follow-up Patient List Hidden in Conference Mode
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'var(--bc-text-secondary)', maxWidth: 600, mx: 'auto', mb: 1.5 }}>
          Patient names, mobile numbers, and outreach logs are masked while Conference / Aggregate-Only Privacy Mode is enabled.
        </Typography>
        <Button
          size="small"
          variant="contained"
          disableElevation
          startIcon={<VisibilityOutlined aria-hidden="true" />}
          onClick={onSwitchToInternalMode}
          sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 700, bgcolor: 'var(--bc-green-strong)' }}
        >
          Switch to Authorized Internal Detail Mode
        </Button>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        id="bc-overdue-followup-section"
        elevation={0}
        sx={{ border: BC_BORDER, borderRadius: '10px', overflow: 'hidden' }}
      >
        <Box
          sx={{
            p: 1.75,
            borderBottom: BC_BORDER,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.25,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'var(--bc-text)' }}>
                Patients Who Did Not Return for Follow-up
              </Typography>
              <Chip
                size="small"
                label={`${overdueCases.length} overdue (\u2265 1d past due)`}
                sx={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  bgcolor: overdueCases.length > 0 ? 'var(--bc-danger-bg)' : 'var(--bc-success-bg)',
                  color: overdueCases.length > 0 ? 'var(--bc-red-strong)' : 'var(--bc-green-strong)',
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)', mt: 0.25 }}>
              Patients whose scheduled anti-rabies follow-up dose is at least 1 day past due. Contact them via mobile copy, DOH SMS reminder, or log outreach attempts.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Filter overdue patient, #, barangay…"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined aria-hidden="true" sx={{ fontSize: 16, color: 'var(--bc-text-secondary)' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: '100%', sm: 230 }, '& .MuiOutlinedInput-root': { height: 34, fontSize: 12.5 } }}
            />

            {canOpenVaccinationSchedule && (
              <Button
                size="small"
                variant="contained"
                disableElevation
                endIcon={<OpenInNewOutlined aria-hidden="true" sx={{ fontSize: 15 }} />}
                onClick={() => handleRedirectToVaccinationSchedule()}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: 12.5,
                  bgcolor: '#0f766e',
                  color: '#ffffff',
                  height: 34,
                  '&:hover': { bgcolor: '#0d655e' },
                }}
              >
                Open Overdue in Vaccination Schedule
              </Button>
            )}
          </Box>
        </Box>

        <TableContainer
          className="bc-table-scroll-region"
          tabIndex={0}
          role="region"
          aria-labelledby="overdue-followup-caption"
        >
          <Table size="small" stickyHeader>
            <caption id="overdue-followup-caption" className="bc-table-caption">
              Patients with overdue anti-rabies PEP follow-up doses (1 or more days past scheduled date), verified contact numbers, latest outreach attempt, and interactive follow-up actions.
            </caption>
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Case # &amp; Patient</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Category &amp; Exposure</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Missed Dose &amp; Days Past Due</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Verified Mobile #</TableCell>
                <TableCell component="th" scope="col" sx={{ fontWeight: 700, fontSize: 12 }}>Latest Contact Attempt</TableCell>
                <TableCell component="th" scope="col" align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Follow-up Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedOverdue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 3.5, textAlign: 'center', color: 'var(--bc-text-secondary)' }}>
                    {localSearch.trim()
                      ? 'No overdue follow-up patients match your search filter.'
                      : 'No patients are currently 1 or more days overdue for follow-up under the active filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayedOverdue.map((c) => {
                  const daysOverdue = c.days_overdue ?? 0;
                  const doseDay = resolveOverdueDoseDay(c);
                  const isHighRiskOverdue = daysOverdue > 3;
                  const phone = c.follow_up_contact_number || c.contact_number || c.emergency_contact_number || '';
                  const latestLog = c.followup_logs?.[0] ?? null;
                  const logTone = latestLog ? getLogStatusStyle(latestLog.status) : null;

                  return (
                    <TableRow key={c.bite_id} hover>
                      <TableCell component="th" scope="row" sx={{ minWidth: 185 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--bc-text)' }}>
                          {c.patient_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'var(--bc-text-secondary)' }}>
                          {c.case_number} · {c.age !== null && c.age !== undefined ? `${c.age}y` : 'Age Unk'} {c.gender || ''}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                          {c.normalized_barangay || c.location || 'Place not recorded'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 130 }}>
                        <SemanticChip label={c.category || 'Unassessed'} />
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', mt: 0.4, textTransform: 'capitalize' }}>
                          {c.animal_type || 'Unknown'} · {c.bite_date || 'Date Unk'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 170 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={`Day ${doseDay} · ${daysOverdue}d past due`}
                            sx={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              bgcolor: isHighRiskOverdue ? 'var(--bc-danger-bg)' : 'var(--bc-amber-bg)',
                              color: isHighRiskOverdue ? 'var(--bc-red-strong)' : 'var(--bc-amber-strong)',
                              border: `1px solid ${isHighRiskOverdue ? 'var(--bc-danger-border)' : 'var(--bc-amber-border)'}`,
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)', mt: 0.35 }}>
                          {c.overdue_due_date ? `Due: ${c.overdue_due_date}` : ''}
                          {c.outstanding_dose_slot_count && c.outstanding_dose_slot_count > 1
                            ? ` · ${c.outstanding_dose_slot_count} overdue slots`
                            : ''}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 170 }}>
                        {phone ? (
                          <CopyPhoneControl
                            phone={phone}
                            source={c.follow_up_contact_source}
                            patientName={c.patient_name}
                            onCopied={(copied) => onNotify(`Copied ${copied} (${c.patient_name}) to clipboard.`)}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'var(--bc-amber-strong)', fontStyle: 'italic' }}>
                            No mobile # on file
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ minWidth: 210, maxWidth: 260 }}>
                        {latestLog && logTone ? (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                label={formatLogStatusLabel(latestLog.status)}
                                sx={{
                                  height: 20,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  bgcolor: logTone.bg,
                                  color: logTone.color,
                                  border: `1px solid ${logTone.border}`,
                                }}
                              />
                              {(c.followup_logs_count ?? 1) > 1 && (
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'var(--bc-text-secondary)' }}>
                                  +{((c.followup_logs_count ?? 1) - 1)} more
                                </Typography>
                              )}
                            </Box>
                            {latestLog.notes && (
                              <Typography
                                sx={{
                                  fontSize: 11.5,
                                  color: 'var(--bc-text-2)',
                                  mt: 0.35,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {latestLog.notes}
                              </Typography>
                            )}
                            <Typography sx={{ fontSize: 10.5, color: 'var(--bc-text-secondary)', mt: 0.2 }}>
                              {latestLog.created_by_name ? `${latestLog.created_by_name} (ID #${latestLog.created_by ?? '—'})` : 'Staff'}
                              {latestLog.created_at ? ` · ${new Date(latestLog.created_at).toLocaleString()}` : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                            No contact logged yet
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ minWidth: 165 }}>
                        <OverdueRowActionMenu
                          caseItem={c}
                          canOpenVaccinationSchedule={canOpenVaccinationSchedule}
                          onCopyNumber={handleCopyNumber}
                          onOpenSms={openSmsModal}
                          onOpenLog={openLogModal}
                          onRedirectSchedule={handleRedirectToVaccinationSchedule}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {overdueCases.length > 10 && (
          <TablePagination
            component="div"
            count={overdueCases.length}
            page={safePage}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ borderTop: BC_BORDER }}
          />
        )}
      </Paper>

      {/* Native <dialog>: DOH-Compliant SMS Reminder Trigger */}
      <dialog
        ref={smsDialogRef}
        className="bc-native-dialog"
        aria-labelledby="bc-sms-dialog-title"
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        {smsTarget && (
          <form onSubmit={handleSendSmsReminder}>
            <div className="bc-native-dialog-header">
              <div>
                <h2 id="bc-sms-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  Send DOH-Compliant SMS Reminder
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
                  {smsTarget.patient_name} ({smsTarget.case_number}) · Day {resolveOverdueDoseDay(smsTarget)} ({smsTarget.days_overdue ?? 0}d overdue)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close SMS reminder dialog"
                onClick={() => smsDialogRef.current?.close()}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'var(--bc-text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <CloseOutlined aria-hidden="true" sx={{ fontSize: 20 }} />
              </button>
            </div>

            <div className="bc-native-dialog-body">
              {smsError && <Alert severity="error" sx={{ fontSize: 12.5 }}>{smsError}</Alert>}

              <Box>
                <Typography component="label" htmlFor="bc-sms-recipient" sx={{ display: 'block', fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                  Verified Patient / Guardian Mobile Number
                </Typography>
                <TextField
                  id="bc-sms-recipient"
                  size="small"
                  fullWidth
                  required
                  value={smsRecipient}
                  onChange={(e) => setSmsRecipient(e.target.value)}
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                />
              </Box>

              <Box>
                <Typography component="label" htmlFor="bc-sms-message" sx={{ display: 'block', fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                  Standardized DOH Tagoloan ABTC SMS Message
                </Typography>
                <TextField
                  id="bc-sms-message"
                  multiline
                  rows={4}
                  fullWidth
                  required
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  helperText={`${smsBody.length} characters · Recorded in patient_followup_logs upon dispatch`}
                />
              </Box>
            </div>

            <div className="bc-native-dialog-footer">
              <Button
                type="button"
                variant="outlined"
                disabled={smsSending}
                onClick={() => smsDialogRef.current?.close()}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={smsSending || !smsRecipient.trim()}
                autoFocus
                startIcon={<SmsOutlined aria-hidden="true" />}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0f766e', '&:hover': { bgcolor: '#0d655e' } }}
              >
                {smsSending ? 'Sending…' : 'Send SMS Reminder'}
              </Button>
            </div>
          </form>
        )}
      </dialog>

      {/* Native <dialog>: Log Contact Attempt */}
      <dialog
        ref={logDialogRef}
        className="bc-native-dialog"
        aria-labelledby="bc-log-dialog-title"
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        {logTarget && (
          <form onSubmit={handleSaveContactAttempt}>
            <div className="bc-native-dialog-header">
              <div>
                <h2 id="bc-log-dialog-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  Log Follow-up Contact Attempt
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--bc-text-secondary)' }}>
                  {logTarget.patient_name} ({logTarget.case_number}) · Day {resolveOverdueDoseDay(logTarget)} ({logTarget.days_overdue ?? 0}d past due)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close contact attempt dialog"
                onClick={() => logDialogRef.current?.close()}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'var(--bc-text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <CloseOutlined aria-hidden="true" sx={{ fontSize: 20 }} />
              </button>
            </div>

            <div className="bc-native-dialog-body">
              {logError && <Alert severity="error" sx={{ fontSize: 12.5 }}>{logError}</Alert>}

              <Box
                sx={{
                  p: 1.25,
                  borderRadius: '8px',
                  bgcolor: 'var(--bc-surface-2)',
                  border: BC_BORDER,
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 12, color: 'var(--bc-text-2)' }}>
                  <strong>Staff / Nurse ID:</strong> {user?.name || 'Staff'} (ID #{user?.id ?? '—'})
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>
                  <strong>Timestamp:</strong> {new Date().toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                <Box>
                  <Typography component="label" htmlFor="bc-log-type" sx={{ display: 'block', fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                    Contact Method
                  </Typography>
                  <select
                    id="bc-log-type"
                    value={logContactType}
                    onChange={(e) => setLogContactType(e.target.value as 'call' | 'sms' | 'visit' | 'other')}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid var(--bc-border-strong)',
                      background: 'var(--bc-surface)',
                      color: 'var(--bc-text)',
                      font: 'inherit',
                      fontSize: 13,
                    }}
                  >
                    <option value="call">Phone Call</option>
                    <option value="sms">SMS</option>
                    <option value="visit">Barangay / Home Visit</option>
                    <option value="other">Other</option>
                  </select>
                </Box>

                <Box>
                  <Typography component="label" htmlFor="bc-log-status" sx={{ display: 'block', fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                    Outreach Outcome
                  </Typography>
                  <select
                    id="bc-log-status"
                    value={logStatus}
                    onChange={(e) => setLogStatus(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid var(--bc-border-strong)',
                      background: 'var(--bc-surface)',
                      color: 'var(--bc-text)',
                      font: 'inherit',
                      fontSize: 13,
                    }}
                  >
                    <option value="promised_visit">Promised Visit</option>
                    <option value="reached">Reached / Advised</option>
                    <option value="no_answer">No Answer / Busy</option>
                    <option value="wrong_number">Wrong / Unreachable Number</option>
                    <option value="completed_elsewhere">Completed Elsewhere</option>
                    <option value="refused">Patient Refused Follow-up</option>
                  </select>
                </Box>
              </Box>

              <Box>
                <Typography component="label" htmlFor="bc-log-notes" sx={{ display: 'block', fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                  Contact Notes
                </Typography>
                <TextField
                  id="bc-log-notes"
                  autoFocus
                  multiline
                  rows={3}
                  fullWidth
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Called - Patient promised to visit tomorrow 9am"
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                />
              </Box>

              {/* Outreach History */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--bc-text-secondary)', textTransform: 'uppercase', mb: 0.75 }}>
                  Recorded Follow-up Attempts ({logHistory.length})
                </Typography>
                {logLoadingHistory ? (
                  <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>Loading outreach history…</Typography>
                ) : logHistory.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: 'var(--bc-text-secondary)' }}>No prior contact attempts logged for this episode.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 165, overflowY: 'auto' }}>
                    {logHistory.map((item) => {
                      const tone = getLogStatusStyle(item.status);
                      return (
                        <Box
                          key={item.id}
                          sx={{
                            p: 1,
                            borderRadius: '8px',
                            border: BC_BORDER,
                            bgcolor: 'var(--bc-surface-2)',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Chip
                                size="small"
                                label={formatLogStatusLabel(item.status)}
                                sx={{ height: 19, fontSize: 10.5, fontWeight: 700, bgcolor: tone.bg, color: tone.color }}
                              />
                              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'var(--bc-text-secondary)', textTransform: 'uppercase' }}>
                                {item.contact_type}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: 11, color: 'var(--bc-text-secondary)' }}>
                              {item.created_by_name ? `${item.created_by_name} (ID #${item.created_by ?? '—'})` : 'Staff'}
                              {item.created_at ? ` · ${new Date(item.created_at).toLocaleString()}` : ''}
                            </Typography>
                          </Box>
                          {item.notes && (
                            <Typography sx={{ fontSize: 12, color: 'var(--bc-text)', mt: 0.4 }}>
                              {item.notes}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </div>

            <div className="bc-native-dialog-footer">
              <Button
                type="button"
                variant="outlined"
                disabled={logSubmitting}
                onClick={() => logDialogRef.current?.close()}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={logSubmitting}
                startIcon={<NoteAddOutlined aria-hidden="true" />}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0f766e', '&:hover': { bgcolor: '#0d655e' } }}
              >
                {logSubmitting ? 'Saving…' : 'Save Contact Attempt'}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
