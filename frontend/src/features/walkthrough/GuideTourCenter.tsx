import React, { useEffect, useState } from 'react';
import { Dialog, Tooltip } from '@mui/material';
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
  const { modules, progress, startGuide, isActive, stopWalkthrough } = useWalkthrough();
  const [open, setOpen] = useState(false);
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
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!modules.length) return null;

  const openCenter = () => {
    if (isActive) stopWalkthrough();
    setOpen(true);
    if (visitedKey) { try { localStorage.setItem(visitedKey, 'true'); } catch { /* Optional preference. */ } }
  };

  return <>
    <Tooltip title="Interactive Guide" arrow>
      <button
        type="button"
        className="guide-header-icon"
        aria-label="Interactive Guide"
        data-testid="walkthrough-help-button"
        onClick={openCenter}
      >
        <MenuBookOutlined sx={{ fontSize: 20 }} />
      </button>
    </Tooltip>
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
          const label = saved?.status === 'completed' ? 'Restart Guide' : saved?.status === 'in_progress' ? 'Resume Guide' : 'Start Guide';
          const isDashboard = module.route === '/dashboard' || module.id === '/dashboard';
          const isCurrentRoute = module.route === location.pathname;

          return <article className="guide-center-card" key={module.id}>
            <div className="guide-center-card-icon" aria-hidden="true"><ModuleIcon route={module.route} id={module.id} /></div>
            <div className="guide-center-card-top">
              <h3>{module.name}</h3>
              {saved?.status === 'completed' && <span className="guide-complete">Completed</span>}
            </div>
            <p>{module.description}</p>
            <div className="guide-center-card-bottom">
              <span>{module.steps.length} steps</span>
              <button
                type="button"
                data-testid={isDashboard ? 'menu-start-dashboard-tour' : isCurrentRoute ? 'menu-start-module-tour' : undefined}
                aria-label={`${label}: ${module.name}`}
                onClick={() => {
                  setOpen(false);
                  startGuide(module.id, saved?.status === 'completed');
                }}
              >
                {label}
              </button>
            </div>
          </article>;
        })}
      </div>
      <p className="guide-center-optional">All guides are optional</p>
    </Dialog>
  </>;
};

export default GuideTourCenter;
