import { styled } from '@mui/material/styles';

export const AppStyleScope = styled('div')`
  display: contents;

  *, *::before, *::after { box-sizing: border-box; }
  .sd-layout, .sd-layout * {
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-layout {
    display: flex; height: 100vh; max-height: 100vh; overflow: hidden; background: var(--bg);
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-sidebar {
    width: 272px; height: 100vh; max-height: 100vh; background: var(--sidebar-bg); display: flex;
    flex-direction: column; padding: 0; flex-shrink: 0; position: relative;
    transition: width 0.2s ease; overflow: hidden;
    border-right: 1px solid var(--sidebar-border); z-index: 10;
  }
  .sd-sidebar--collapsed { width: 64px; }
  .sd-brand {
    display: flex; align-items: center; gap: 10px; padding: 0 16px;
    border-bottom: 1px solid var(--sidebar-header-border);
    height: 68px; min-height: 68px; flex-shrink: 0;
  }
  .sd-brand-logo {
    width: 36px; height: 36px; background: var(--nav-item-active-bg);
    border: 1px solid var(--card-border); border-radius: 10px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sd-brand-text { display: flex; flex-direction: column; overflow: hidden; }
  .sd-brand-clinic {
    font-size: 13px; font-weight: 700; color: var(--nav-item-active-color); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-brand-app { font-size: 10px; color: var(--text-secondary); margin-top: 1px; }
  .sd-nav {
    flex: 1; padding: 18px 12px; display: flex; flex-direction: column;
    gap: 2px; overflow-y: auto;
  }
  .sd-nav-item {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px;
    border: 1px solid transparent; background: transparent; color: var(--nav-item-color);
    border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500;
    text-align: left; transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .sd-nav-item:hover { background: var(--nav-item-hover-bg); color: var(--nav-item-hover-color); }
  .sd-nav-item--active { background: var(--nav-item-active-bg); border-color: var(--card-border); color: var(--nav-item-active-color); font-weight: 650; }
  .sd-nav-item--active:hover { background: var(--nav-item-active-bg); }
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
    border: none; background: transparent; color: var(--nav-item-color);
    border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;
    text-align: left; transition: all 0.15s; font-family: inherit;
  }
  .sd-submenu-item:hover { background: var(--nav-item-hover-bg); color: var(--nav-item-hover-color); }
  .sd-submenu-item--active { color: var(--nav-item-active-color); background: var(--nav-item-active-bg); font-weight: 700; }
  .sd-submenu-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    flex-shrink: 0; opacity: 0.6;
  }
  .sd-user {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px;
    border-top: 1px solid var(--sidebar-header-border); min-height: 68px;
  }
  .sd-user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #277a4b; color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .sd-user-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .sd-user-name {
    font-size: 12px; font-weight: 600; color: var(--text-h); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-user-role { font-size: 10px; color: var(--text-secondary); white-space: nowrap; }
  .sd-logout-btn {
    background: transparent; border: none; color: var(--text-secondary);
    cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
    transition: all 0.15s; flex-shrink: 0;
  }
  .sd-logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .sd-toggle-brand {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; background: transparent; border: none;
    border-radius: 6px; color: var(--text-h); cursor: pointer;
    transition: all 0.15s; flex-shrink: 0;
  }
  .sd-toggle-brand:hover { background: var(--nav-item-hover-bg); color: #10b981; }
  .sd-sidebar--collapsed .sd-brand { justify-content: center; padding: 0; }
  .sd-main {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
  }
  .sd-topbar {
    height: 68px; background: var(--topbar-bg); border-bottom: 1px solid var(--topbar-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; flex-shrink: 0; position: sticky; top: 0; z-index: 5;
    backdrop-filter: blur(12px);
  }
  .sd-topbar-left { display: flex; align-items: center; gap: 14px; }
  .sd-topbar-title { font-size: 15px; font-weight: 650; color: var(--text-h); }
  .sd-topbar-right { display: flex; align-items: center; gap: 14px; }
  .sd-topbar-date { font-size: 12px; color: var(--text-secondary); }
  .sd-topbar-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #277a4b; color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center;
  }
  .sd-content { flex: 1; padding: 32px; overflow-y: auto; background: var(--bg); }
  .sd-dash-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 28px; flex-wrap: wrap; gap: 16px;
  }
  .sd-dash-header h1 { font-size: 25px; line-height: 1.2; letter-spacing: -0.5px; font-weight: 600; color: var(--text-h); margin: 0 0 7px; }
  .sd-dash-header p { font-size: 13px; color: var(--text-secondary); margin: 0; }
  .sd-dash-tabs { display: flex; gap: 3px; background: var(--nav-item-hover-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 4px; }
  .sd-dash-tab {
    padding: 6px 14px; border: none; background: transparent; color: var(--text-secondary);
    border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500;
    font-family: inherit; transition: all 0.15s;
  }
  .sd-dash-tab:hover { color: var(--nav-item-active-color); background: var(--nav-item-hover-bg); }
  .sd-dash-tab--active {
    background: var(--card-bg); color: var(--nav-item-active-color); font-weight: 650;
    box-shadow: 0 1px 3px rgba(23,61,41,0.08);
  }
  .sd-cards-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px;
  }
  .sd-card {
    border-radius: 14px;
    padding: 20px;
    border: 1px solid var(--card-border);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 118px;
    cursor: default;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  }
  .sd-card:hover {
    transform: translateY(-2px);
    border-color: var(--nav-item-active-color);
    box-shadow: 0 8px 24px rgba(24,83,50,0.08);
  }
  /* Large decorative circle — top right (simulates illustration) */
  .sd-card::before {
    content: '';
    position: absolute;
    top: 18px; right: 18px;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #59a978;
    pointer-events: none;
  }
  /* Smaller inner circle */
  .sd-card::after {
    content: '';
    position: absolute;
    top: 15px; right: 15px;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--nav-item-active-bg);
    pointer-events: none;
  }
  .sd-card-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
    text-transform: uppercase; margin: 0 0 6px; opacity: 0.75;
    position: relative; z-index: 1;
  }
  .sd-card-value {
    font-size: 2rem; font-weight: 700; margin: 0 0 5px;
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
    background: var(--card-bg);
    color: var(--text-h);
    border-color: var(--card-border);
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
    box-shadow: 0 8px 24px rgba(24,83,50,0.08);
  }
  .sd-charts-row, .sd-charts-bottom {
    display: grid; grid-template-columns: 1fr 1fr 280px; gap: 16px; margin-bottom: 24px;
  }
  .sd-charts-bottom { grid-template-columns: 1fr 1fr; }
  .sd-chart-card {
    background: var(--card-bg); border-radius: 14px; padding: 20px; border: 1px solid var(--card-border);
  }
  .sd-chart-title { font-size: 13px; font-weight: 650; color: var(--text-h); margin: 0 0 16px; }
  .sd-chart-title span { color: var(--text-secondary); font-weight: 400; margin-left: 4px; }
  .sd-line-chart { width: 100%; display: block; }
  .sd-donut-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .sd-donut-legend { display: flex; flex-direction: column; gap: 8px; }
  .sd-donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text); }
  .sd-donut-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .sd-donut-legend-pct { margin-left: auto; font-weight: 700; color: var(--text-h); padding-left: 12px; }
  .sd-filter-card {
    background: var(--card-bg); border-radius: 14px; padding: 20px; border: 1px solid var(--card-border);
    display: flex; flex-direction: column; gap: 0;
  }
  .sd-filter-title { font-size: 13px; font-weight: 700; color: var(--text-h); margin: 0 0 16px; }
  .sd-filter-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
  .sd-filter-label {
    font-size: 11px; font-weight: 600; color: var(--text-secondary);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .sd-filter-select {
    padding: 7px 10px; border: 1px solid var(--card-border); border-radius: 8px;
    font-size: 13px; color: var(--text); background: var(--input-bg); cursor: pointer;
    font-family: inherit; width: 100%; appearance: none;
  }
  .sd-filter-select:focus { outline: none; border-color: #10b981; }
  .sd-filter-divider { border: none; border-top: 1px solid var(--sidebar-header-border); margin: 10px 0; }
  .sd-filter-link {
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: var(--bg-secondary); border: 1px solid var(--card-border); border-radius: 8px;
    color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .sd-filter-link:hover { background: var(--nav-item-active-bg); border-color: #10b981; color: var(--nav-item-active-color); }

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
