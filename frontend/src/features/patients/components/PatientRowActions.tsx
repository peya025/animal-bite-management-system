import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Box,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import AddIcon from '@mui/icons-material/Add';
import type { Patient } from '../types';

export interface PatientRowActionsData {
  primary: 'reassess' | 'checkin' | null;
  check_in_blocked_reason: string | null;
  invite: 'send' | 'resend' | null;
  invite_disabled_reason: string | null;
  has_email?: boolean;
  view: boolean;
  invitation_id?: number | null;
}

export interface PatientRowActionsProps {
  patient: Patient;
  actions?: PatientRowActionsData;
  secondaryClinical?: 'nurse_queue' | 'new_exposure' | null;
  canClinical?: boolean;
  canInvite?: boolean;
  onCheckIn: (patient: Patient) => void;
  onReassess: (patient: Patient) => void;
  onNurseCheckIn?: (patient: Patient) => void;
  onNewExposure?: (patient: Patient) => void;
  onInvite: (patient: Patient, mode: 'send' | 'resend') => void;
  onView: (patient: Patient) => void;
  loadingAction?: 'checkin' | 'reassess' | 'nurse_queue' | 'invite' | null;
}

export const PatientRowActions: React.FC<PatientRowActionsProps> = ({
  patient,
  actions,
  secondaryClinical = null,
  canClinical = true,
  canInvite = true,
  onCheckIn,
  onReassess,
  onNurseCheckIn,
  onNewExposure,
  onInvite,
  onView,
  loadingAction,
}) => {
  const isCompact = useMediaQuery('(max-width: 1100px)');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // If actions is missing (old API compatibility), render only View in Slot 3
  const effectiveActions: PatientRowActionsData = actions || {
    primary: null,
    check_in_blocked_reason: null,
    invite: null,
    invite_disabled_reason: null,
    view: true,
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleMenuInvite = (mode: 'send' | 'resend') => {
    handleCloseMenu();
    onInvite(patient, mode);
  };

  const isCheckInLoading = loadingAction === 'checkin';
  const isReassessLoading = loadingAction === 'reassess';
  const isNurseLoading = loadingAction === 'nurse_queue';
  const isInviteLoading = loadingAction === 'invite';

  // ─── Slot 1: Clinical Action (130px) ──────────────────────────
  const renderSlot1 = () => {
    if (canClinical && effectiveActions.primary === 'checkin') {
      return (
        <Button
          variant="contained"
          size="small"
          disabled={isCheckInLoading}
          onClick={(e) => {
            e.stopPropagation();
            onCheckIn(patient);
          }}
          startIcon={
            isCheckInLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <CheckIcon sx={{ fontSize: 16 }} />
            )
          }
          sx={{
            width: '130px',
            height: '34px',
            borderRadius: '9px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#1D9E75',
            color: '#ffffff',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#158360',
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              backgroundColor: '#1D9E75',
              opacity: 0.65,
              color: '#ffffff',
            },
          }}
        >
          {isCheckInLoading ? 'Checking In…' : 'Check In'}
        </Button>
      );
    }

    if (canClinical && effectiveActions.primary === 'reassess') {
      return (
        <Button
          variant="contained"
          size="small"
          disabled={isReassessLoading}
          onClick={(e) => {
            e.stopPropagation();
            onReassess(patient);
          }}
          startIcon={
            isReassessLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <RefreshIcon sx={{ fontSize: 16 }} />
            )
          }
          sx={{
            width: '130px',
            height: '34px',
            borderRadius: '9px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#d97706',
            color: '#ffffff',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#b45309',
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              backgroundColor: '#d97706',
              opacity: 0.65,
              color: '#ffffff',
            },
          }}
        >
          {isReassessLoading ? 'Reassessing…' : 'Reassess'}
        </Button>
      );
    }

    if (secondaryClinical === 'nurse_queue' && onNurseCheckIn) {
      return (
        <Button
          variant="contained"
          size="small"
          disabled={isNurseLoading}
          onClick={(e) => {
            e.stopPropagation();
            onNurseCheckIn(patient);
          }}
          startIcon={
            isNurseLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <VaccinesIcon sx={{ fontSize: 16 }} />
            )
          }
          sx={{
            width: '130px',
            height: '34px',
            borderRadius: '9px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            textTransform: 'none',
            boxShadow: 'none',
            whiteSpace: 'nowrap',
            '&:hover': {
              backgroundColor: '#1d4ed8',
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              backgroundColor: '#2563eb',
              opacity: 0.65,
              color: '#ffffff',
            },
          }}
        >
          {isNurseLoading ? 'Queuing…' : 'Nurse Queue'}
        </Button>
      );
    }

    if (secondaryClinical === 'new_exposure' && onNewExposure) {
      return (
        <Button
          variant="outlined"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onNewExposure(patient);
          }}
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          sx={{
            width: '130px',
            height: '34px',
            borderRadius: '9px',
            fontSize: '12px',
            fontWeight: 600,
            borderColor: '#6366f1',
            color: '#4f46e5',
            backgroundColor: '#ffffff',
            textTransform: 'none',
            boxShadow: 'none',
            whiteSpace: 'nowrap',
            '&:hover': {
              backgroundColor: '#eef2ff',
              borderColor: '#4f46e5',
            },
          }}
        >
          Exposure
        </Button>
      );
    }

    return <Box sx={{ width: '130px', height: '34px' }} />;
  };

  // ─── Slot 2: Portal Onboarding (128px or overflow) ───────────
  const renderSlot2 = () => {
    if (!canInvite || !effectiveActions.invite) {
      return <Box sx={{ width: isCompact ? '34px' : '128px', height: '34px' }} />;
    }

    const mode = effectiveActions.invite;
    const isResend = mode === 'resend';
    const label = isResend ? 'Resend Invite' : 'Portal Invite';
    const IconComponent = isResend ? ForwardToInboxIcon : PersonAddIcon;
    const isDisabled = Boolean(effectiveActions.invite_disabled_reason) || isInviteLoading;
    const tooltipTitle = effectiveActions.invite_disabled_reason === 'NO_CONTACT'
      ? 'Add a contact number first'
      : '';

    // Responsive: When under 1100px, collapse into overflow three-dot menu
    if (isCompact) {
      return (
        <>
          <IconButton
            size="small"
            aria-label="More actions"
            onClick={handleOpenMenu}
            sx={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              border: '0.5px solid #e5e7eb',
              backgroundColor: '#ffffff',
              color: '#374151',
              '&:hover': { backgroundColor: '#f9fafb' },
            }}
          >
            {isInviteLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <MoreVertIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Tooltip title={tooltipTitle} disableHoverListener={!tooltipTitle}>
              <span>
                <MenuItem
                  disabled={isDisabled}
                  onClick={() => handleMenuInvite(mode)}
                  sx={{ fontSize: '13px' }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconComponent sx={{ fontSize: 18, color: '#374151' }} />
                  </ListItemIcon>
                  <ListItemText>{label}</ListItemText>
                </MenuItem>
              </span>
            </Tooltip>
          </Menu>
        </>
      );
    }

    const buttonContent = (
      <Button
        variant="outlined"
        size="small"
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          onInvite(patient, mode);
        }}
        startIcon={
          isInviteLoading ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <IconComponent sx={{ fontSize: 16, color: '#374151' }} />
          )
        }
        sx={{
          width: '128px',
          height: '34px',
          borderRadius: '9px',
          fontSize: '12px',
          fontWeight: 600,
          border: '0.5px solid #e5e7eb',
          backgroundColor: '#ffffff',
          color: '#374151',
          textTransform: 'none',
          boxShadow: 'none',
          whiteSpace: 'nowrap',
          '&:hover': {
            backgroundColor: '#f9fafb',
            border: '0.5px solid #d1d5db',
          },
          '&.Mui-disabled': {
            border: '0.5px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: '#9ca3af',
          },
        }}
      >
        {isInviteLoading ? 'Sending…' : label}
      </Button>
    );

    if (tooltipTitle) {
      return (
        <Tooltip title={tooltipTitle} arrow placement="top">
          <span style={{ display: 'inline-block' }}>{buttonContent}</span>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  // ─── Slot 3: View Patient Chart (34px) ────────────────────────
  const renderSlot3 = () => {
    return (
      <Tooltip title="View chart" arrow placement="top">
        <IconButton
          size="small"
          aria-label="View patient chart"
          onClick={(e) => {
            e.stopPropagation();
            onView(patient);
          }}
          sx={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            border: '0.5px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: '#4b5563',
            '&:hover': {
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
            },
          }}
        >
          <VisibilityIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <Box
      className="pm-action-grid"
      sx={{
        display: 'grid',
        gridTemplateColumns: isCompact ? '130px 34px 34px' : '130px 128px 34px',
        gap: '8px',
        justifyContent: 'flex-end',
        alignItems: 'center',
        minWidth: isCompact ? '214px' : '308px',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>{renderSlot1()}</Box>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>{renderSlot2()}</Box>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>{renderSlot3()}</Box>
    </Box>
  );
};

export default PatientRowActions;
