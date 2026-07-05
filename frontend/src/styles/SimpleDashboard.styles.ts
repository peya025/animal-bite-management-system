import { styled } from '@mui/material/styles';

export const AppStyleScope = styled('div')`
  display: contents;

  *, *::before, *::after { box-sizing: border-box; }
  .sd-layout, .sd-layout * {
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-layout {
    display: flex; min-height: 100vh; background: #ffffff;
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-sidebar {
    width: 240px; min-height: 100vh; background: #ffffff; display: flex;
    flex-direction: column; padding: 0; position: sticky; top: 0; flex-shrink: 0;
    transition: width 0.2s ease; overflow: hidden;
    border-right: 1px solid #e5e7eb;
  }
  .sd-sidebar--collapsed { width: 64px; }
  .sd-brand {
    display: flex; align-items: center; gap: 10px; padding: 0 16px;
    border-bottom: 1px solid rgba(6,78,59,0.12);
    height: 56px; min-height: 56px; flex-shrink: 0;
  }
  .sd-brand-logo {
    width: 36px; height: 36px; background: rgba(6,78,59,0.12);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sd-brand-text { display: flex; flex-direction: column; overflow: hidden; }
  .sd-brand-clinic {
    font-size: 13px; font-weight: 700; color: #064e3b; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-brand-app { font-size: 10px; color: rgba(6,78,59,0.55); margin-top: 1px; }
  .sd-nav {
    flex: 1; padding: 12px 8px; display: flex; flex-direction: column;
    gap: 2px; overflow-y: auto;
  }
  .sd-nav-item {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px;
    border: none; background: transparent; color: rgba(6,78,59,0.65);
    border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
    text-align: left; transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .sd-nav-item:hover { background: rgba(6,78,59,0.1); color: #064e3b; }
  .sd-nav-item--active { background: rgba(6,78,59,0.15); color: #064e3b; font-weight: 700; }
  .sd-nav-item--active:hover { background: rgba(6,78,59,0.2); }
  .sd-nav-icon { display: flex; align-items: center; flex-shrink: 0; }
  .sd-nav-label { flex: 1; }
  .sd-nav-chevron {
    display: flex; align-items: center; margin-left: auto; opacity: 0.5;
    transition: transform 0.2s;
  }
  .sd-nav-chevron--open { transform: rotate(180deg); }
  .sd-submenu {
    margin-left: 36px; margin-top: 2px; display: flex; flex-direction: column; gap: 1px;
  }
  .sd-submenu-item {
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 10px;
    border: none; background: transparent; color: rgba(6,78,59,0.55);
    border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;
    text-align: left; transition: all 0.15s; font-family: inherit;
  }
  .sd-submenu-item:hover { background: rgba(6,78,59,0.08); color: #064e3b; }
  .sd-submenu-item--active { color: #064e3b; background: rgba(6,78,59,0.12); font-weight: 700; }
  .sd-submenu-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    flex-shrink: 0; opacity: 0.6;
  }
  .sd-user {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px;
    border-top: 1px solid #e5e7eb; min-height: 60px;
  }
  .sd-user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg,#10b981,#059669); color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .sd-user-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .sd-user-name {
    font-size: 12px; font-weight: 600; color: #064e3b; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-user-role { font-size: 10px; color: rgba(6,78,59,0.55); white-space: nowrap; }
  .sd-logout-btn {
    background: transparent; border: none; color: rgba(6,78,59,0.5);
    cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
    transition: all 0.15s; flex-shrink: 0;
  }
  .sd-logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .sd-toggle {
    position: absolute; bottom: 72px; right: -12px; width: 24px; height: 24px;
    background: #fff; border: 1.5px solid #e5e7eb;
    border-radius: 50%; color: #064e3b; display: flex;
    align-items: center; justify-content: center; cursor: pointer;
    transition: all 0.15s; z-index: 10;
  }
  .sd-toggle:hover { background: #10b981; border-color: #10b981; color: #fff; }
  .sd-main {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
  }
  .sd-topbar {
    height: 56px; background: #fff; border-bottom: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; flex-shrink: 0; position: sticky; top: 0; z-index: 5;
  }
  .sd-topbar-title { font-size: 15px; font-weight: 700; color: #1e2a4a; }
  .sd-topbar-right { display: flex; align-items: center; gap: 14px; }
  .sd-topbar-date { font-size: 12px; color: #9ca3af; }
  .sd-topbar-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg,#10b981,#059669); color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center;
  }
  .sd-content { flex: 1; padding: 24px; overflow-y: auto; background: #ffffff; }
  .sd-dash-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
  }
  .sd-dash-header h1 { font-size: 22px; font-weight: 800; color: #1e2a4a; margin: 0 0 4px; }
  .sd-dash-header p { font-size: 13px; color: #9ca3af; margin: 0; }
  .sd-dash-tabs { display: flex; gap: 4px; background: #f3f4f6; border-radius: 10px; padding: 4px; }
  .sd-dash-tab {
    padding: 6px 14px; border: none; background: transparent; color: #6b7280;
    border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500;
    font-family: inherit; transition: all 0.15s;
  }
  .sd-dash-tab:hover { color: #1e2a4a; background: rgba(0,0,0,0.04); }
  .sd-dash-tab--active {
    background: #fff; color: #1e2a4a; font-weight: 700;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .sd-cards-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
  }
  .sd-card {
    border-radius: 22px;
    padding: 22px 20px 20px;
    border: none;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 130px;
    cursor: default;
    transition: transform 0.22s cubic-bezier(0.2,0.9,0.4,1), box-shadow 0.22s ease;
  }
  .sd-card:hover {
    transform: translateY(-5px) scale(1.015);
    box-shadow: 0 16px 36px rgba(0,0,0,0.13);
  }
  /* Large decorative circle — top right (simulates illustration) */
  .sd-card::before {
    content: '';
    position: absolute;
    top: -30px; right: -30px;
    width: 110px; height: 110px;
    border-radius: 50%;
    background: rgba(255,255,255,0.22);
    pointer-events: none;
  }
  /* Smaller inner circle */
  .sd-card::after {
    content: '';
    position: absolute;
    top: 10px; right: 10px;
    width: 52px; height: 52px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    pointer-events: none;
  }
  .sd-card-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; margin: 0 0 6px; opacity: 0.75;
    position: relative; z-index: 1;
  }
  .sd-card-value {
    font-size: 2.5rem; font-weight: 900; margin: 0 0 2px;
    line-height: 1; letter-spacing: -1px;
    position: relative; z-index: 1;
  }
  .sd-card-sub {
    font-size: 12px; font-weight: 500; margin: 0; opacity: 0.7;
    position: relative; z-index: 1;
  }

  /* All cards — pastel mint green, #064e3b font */
  .sd-card--purple,
  .sd-card--blue,
  .sd-card--indigo,
  .sd-card--teal,
  .sd-card--violet,
  .sd-card--cyan,
  .sd-card--green,
  .sd-card--emerald {
    background: linear-gradient(135deg, #abffd5ff, #ffffffff);
    color: #064e3b;
    border-color: transparent;
  }

  /* Unified hover shadow */
  .sd-card--purple:hover,
  .sd-card--blue:hover,
  .sd-card--indigo:hover,
  .sd-card--teal:hover,
  .sd-card--violet:hover,
  .sd-card--cyan:hover,
  .sd-card--green:hover,
  .sd-card--emerald:hover {
    box-shadow: 0 16px 36px rgba(16,185,129,0.3);
  }
  .sd-charts-row, .sd-charts-bottom {
    display: grid; grid-template-columns: 1fr 1fr 280px; gap: 16px; margin-bottom: 24px;
  }
  .sd-charts-bottom { grid-template-columns: 1fr 1fr; }
  .sd-chart-card {
    background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #f0f1f3;
  }
  .sd-chart-title { font-size: 13px; font-weight: 700; color: #1e2a4a; margin: 0 0 16px; }
  .sd-chart-title span { color: #9ca3af; font-weight: 400; margin-left: 4px; }
  .sd-line-chart { width: 100%; display: block; }
  .sd-donut-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .sd-donut-legend { display: flex; flex-direction: column; gap: 8px; }
  .sd-donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
  .sd-donut-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .sd-donut-legend-pct { margin-left: auto; font-weight: 700; color: #1e2a4a; padding-left: 12px; }
  .sd-filter-card {
    background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #f0f1f3;
    display: flex; flex-direction: column; gap: 0;
  }
  .sd-filter-title { font-size: 13px; font-weight: 700; color: #1e2a4a; margin: 0 0 16px; }
  .sd-filter-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
  .sd-filter-label {
    font-size: 11px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .sd-filter-select {
    padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
    font-size: 13px; color: #374151; background: #fafafa; cursor: pointer;
    font-family: inherit; width: 100%; appearance: none;
  }
  .sd-filter-select:focus { outline: none; border-color: #10b981; }
  .sd-filter-divider { border: none; border-top: 1px solid #f3f4f6; margin: 10px 0; }
  .sd-filter-link {
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
    color: #374151; font-size: 13px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .sd-filter-link:hover { background: #ecfdf5; border-color: #10b981; color: #059669; }

  @media (max-width: 1100px) {
    .sd-cards-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 900px) {
    .sd-charts-row, .sd-charts-bottom { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .sd-cards-grid { grid-template-columns: 1fr; }
    .sd-content { padding: 16px; }
    .sd-topbar { padding: 0 16px; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
