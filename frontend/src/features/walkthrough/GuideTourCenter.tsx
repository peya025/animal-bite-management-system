import React, { useEffect, useState } from 'react';
import { Dialog, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { useLocation } from 'react-router-dom';
import {
  MenuBookOutlined,
  PeopleOutlined,
  FormatListNumbered,
  PlaceOutlined,
  BarChartOutlined,
  DashboardOutlined,
  MedicalServicesOutlined,
  Inventory2Outlined,
  TuneOutlined,
  ManageAccountsOutlined,
  EventAvailableOutlined,
  BuildOutlined,
  PlayArrowOutlined,
  RestartAltOutlined,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useWalkthrough } from './WalkthroughContext';

function ModuleIcon({ route, id }: { route: string; id: string }) {
  const norm = (id + ' ' + route).toLowerCase();
  const Icon = norm.includes('map') ? PlaceOutlined
    : norm.includes('report') ? BarChartOutlined
    : norm.includes('queue') ? FormatListNumbered
    : norm.includes('inventory') || norm.includes('vaccine-stock') ? Inventory2Outlined
    : norm.includes('clinic') || norm.includes('setup') ? TuneOutlined
    : norm.includes('user') ? ManageAccountsOutlined
    : norm.includes('vax') || norm.includes('vaccination') ? EventAvailableOutlined
    : norm.includes('patient') ? PeopleOutlined
    : norm.includes('dev') ? BuildOutlined
    : norm.includes('dashboard') ? DashboardOutlined
    : MedicalServicesOutlined;
  return <Icon fontSize="small" />;
}

export const GuideTourCenter: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { modules, progress, startGuide, isActive, stopWalkthrough, activeModuleId } = useWalkthrough();
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const visitedKey = user?.id ? `abtc_guide_center_visited_v1_${user.id}` : null;

  useEffect(() => {
    setOpen(false);
    if (!visitedKey || !modules.length) return;
    try {
      if (!localStorage.getItem(visitedKey)) {
        const saved = JSON.parse(localStorage.getItem(`abtc_guides_v2_${user?.id}`) || '{}');
        const previouslyUsed = Object.keys(saved || {}).length > 0 || !!localStorage.getItem(`abtc_walkthrough_status_${user?.id}`);
        setOpen(!previouslyUsed);
        localStorage.setItem(visitedKey, 'true');
      }
    } catch { /* The guide remains available when browser storage is unavailable. */ }
  }, [visitedKey, modules.length, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (anchorEl) setAnchorEl(null);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, anchorEl]);

  if (!modules.length) return null;

  const currentModule = modules.find(
    m => m.route === location.pathname || m.steps.some(step => step.route === location.pathname)
  );

  const inProgressModule = activeModuleId
    ? modules.find(m => m.id === activeModuleId)
    : modules.find(m => {
        const p = progress[m.id];
        return p && (p.status === 'in_progress' || (typeof p.step === 'number' && p.step > 0));
      });

  const activeOrRelevantModule = inProgressModule || currentModule || modules[0];
  const targetSaved = activeOrRelevantModule ? progress[activeOrRelevantModule.id] : null;
  const hasSavedProgress = Boolean(
    targetSaved && (targetSaved.status === 'in_progress' || (typeof targetSaved.step === 'number' && targetSaved.step > 0) || targetSaved.status === 'completed')
  );
  const currentStepNum = Math.min(
    (targetSaved?.step ?? 0) + 1,
    activeOrRelevantModule?.steps.length ?? 1
  );
  const totalModuleSteps = activeOrRelevantModule?.steps.length ?? 0;
  const progressPercent = totalModuleSteps > 0 ? Math.round((currentStepNum / totalModuleSteps) * 100) : 0;

  const openCenter = () => {
    if (isActive) stopWalkthrough();
    setOpen(true);
    if (visitedKey) { try { localStorage.setItem(visitedKey, 'true'); } catch { /* Optional preference. */ } }
  };

  return <>
    <Tooltip title="Interactive Guide (Resume / Restart)" arrow>
      <button
        type="button"
        className="guide-header-icon"
        aria-label="Interactive Guide"
        data-testid="walkthrough-help-button"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <MenuBookOutlined sx={{ fontSize: 20 }} />
      </button>
    </Tooltip>

    <Menu
      anchorEl={anchorEl}
      open={isMenuOpen}
      onClose={() => setAnchorEl(null)}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      slotProps={{
        paper: {
          className: 'guide-quick-menu',
          sx: {
            borderRadius: '20px',
            width: 330,
            maxWidth: 'calc(100vw - 32px)',
            p: 0,
            overflow: 'hidden !important',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.16), 0 4px 14px rgba(5, 150, 105, 0.08)',
            border: '1px solid #e2e8f0',
            fontFamily: "'Poppins', sans-serif",
            '& .MuiList-root': {
              padding: '8px',
              overflow: 'hidden',
            },
          },
        },
      }}
    >
      {/* ── Card Header ── */}
      <div
        style={{
          padding: '16px 18px 14px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 85%)',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#047857',
              fontWeight: 700,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            Walkthrough Guide
          </span>
          {hasSavedProgress && (
            <span style={{ fontSize: '11px', fontWeight: 650, color: '#059669' }}>
              {progressPercent}% completed
            </span>
          )}
        </div>

        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '15px',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.3,
          }}
        >
          {activeOrRelevantModule?.name || 'Clinic Walkthrough'}
        </h3>

        {/* Progress bar */}
        {hasSavedProgress && (
          <div
            style={{
              width: '100%',
              height: '5px',
              background: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: `${Math.max(6, progressPercent)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #059669)',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Actions List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Resume Guide */}
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            if (activeOrRelevantModule) {
              startGuide(activeOrRelevantModule.id, false);
            }
          }}
          data-testid="walkthrough-menu-resume"
          sx={{
            borderRadius: '14px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: '#ecfdf5',
              transform: 'translateX(2px)',
            },
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PlayArrowOutlined sx={{ fontSize: 22, color: '#059669' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 650, color: '#0f172a' }}>
                {hasSavedProgress ? 'Resume Guide' : 'Start Guide'}
              </span>
              {hasSavedProgress && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#047857',
                    background: '#d1fae5',
                    padding: '1px 6px',
                    borderRadius: '6px',
                  }}
                >
                  Step {currentStepNum}/{totalModuleSteps}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: '#64748b',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {hasSavedProgress ? `Continue ${activeOrRelevantModule?.name}` : `Begin tour from Step 1`}
            </div>
          </div>
          <ChevronRight sx={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }} />
        </MenuItem>

        {/* Restart Guide */}
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            if (activeOrRelevantModule) {
              startGuide(activeOrRelevantModule.id, true);
            }
          }}
          data-testid="walkthrough-menu-restart"
          sx={{
            borderRadius: '14px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: '#f0f9ff',
              transform: 'translateX(2px)',
            },
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <RestartAltOutlined sx={{ fontSize: 20, color: '#0284c7' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#0f172a' }}>
              Restart Guide
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: '#64748b',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Restart {activeOrRelevantModule?.name} from Step 1
            </div>
          </div>
          <ChevronRight sx={{ fontSize: 18, color: '#94a3b8', flexShrink: 0 }} />
        </MenuItem>

        <Divider sx={{ my: '4px', mx: '4px', borderColor: '#f1f5f9' }} />

        {/* Explore All Guides */}
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            openCenter();
          }}
          data-testid="walkthrough-menu-explore-all"
          sx={{
            borderRadius: '14px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: '#f8fafc',
              transform: 'translateX(2px)',
            },
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MenuBookOutlined sx={{ fontSize: 19, color: '#475569' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Explore All Guides
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              View all module tours & guides
            </div>
          </div>
          <ChevronRight sx={{ fontSize: 18, color: '#cbd5e1', flexShrink: 0 }} />
        </MenuItem>
      </div>
    </Menu>

    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth={false}
      aria-labelledby="guide-center-title"
      aria-describedby="guide-center-description"
      data-testid="walkthrough-help-menu"
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(18,28,25,.35)', backdropFilter: 'blur(3px)' } },
        paper: {
          className: 'guide-center-dialog',
          sx: { m: 2, width: 'min(960px, calc(100% - 32px))', maxHeight: '88vh', borderRadius: '24px' },
        } as any,
      }}
    >
      <div className="guide-center-heading">
        <MenuBookOutlined className="guide-center-icon" />
        <div>
          <h2 id="guide-center-title">Explore Your Dashboard</h2>
          <p id="guide-center-description">Choose what you want to learn. All guides are optional.</p>
        </div>
        <button className="guide-center-close" type="button" onClick={() => setOpen(false)} aria-label="Close guide chooser">×</button>
      </div>
      <div className="guide-center-grid">
        {modules.map(module => {
          const saved = progress[module.id];
          const hasProgress = saved && (saved.status === 'in_progress' || (typeof saved.step === 'number' && saved.step > 0) || saved.status === 'completed');
          const isDashboard = module.route === '/dashboard' || module.id === '/dashboard';
          const isCurrentRoute = module.route === location.pathname || module.steps.some(step => step.route === location.pathname);

          return <article className="guide-center-card" key={module.id}>
            <div className="guide-center-card-icon" aria-hidden="true"><ModuleIcon route={module.route} id={module.id} /></div>
            <div className="guide-center-card-top">
              <h3>{module.name}</h3>
              {saved?.status === 'completed' && <span className="guide-complete">Completed</span>}
              {saved?.status === 'in_progress' && typeof saved.step === 'number' && saved.step > 0 && (
                <span className="guide-in-progress" style={{ color: '#0284c7', fontSize: '10px', fontWeight: 700 }}>
                  Step {saved.step + 1}/{module.steps.length}
                </span>
              )}
            </div>
            <p>{module.description}</p>
            <div className="guide-center-card-bottom">
              <span>{module.steps.length} steps</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {hasProgress ? (
                  <>
                    <button
                      type="button"
                      className="guide-card-btn-resume"
                      data-testid={isDashboard ? 'menu-start-dashboard-tour' : isCurrentRoute ? 'menu-start-module-tour' : undefined}
                      aria-label={`Resume Guide: ${module.name}`}
                      onClick={() => {
                        setOpen(false);
                        startGuide(module.id, false);
                      }}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className="guide-card-btn-restart"
                      aria-label={`Restart Guide: ${module.name}`}
                      onClick={() => {
                        setOpen(false);
                        startGuide(module.id, true);
                      }}
                    >
                      Restart
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="guide-card-btn-start"
                    data-testid={isDashboard ? 'menu-start-dashboard-tour' : isCurrentRoute ? 'menu-start-module-tour' : undefined}
                    aria-label={`Start Guide: ${module.name}`}
                    onClick={() => {
                      setOpen(false);
                      startGuide(module.id, true);
                    }}
                  >
                    Start Guide
                  </button>
                )}
              </div>
            </div>
          </article>;
        })}
      </div>
      <p className="guide-center-optional">All guides are optional</p>
    </Dialog>
  </>;
};

export default GuideTourCenter;
