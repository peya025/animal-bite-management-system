import { styled } from '@mui/material/styles';

export const DashboardLayoutRoot = styled('div')`
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  color: var(--text);

  .sidebar {
    width: 248px; background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border);
    display: flex; flex-direction: column; transition: width 0.25s ease;
    position: relative; flex-shrink: 0;
  }
  .sidebar.closed { width: 64px; }
  .sidebar-header {
    height: 64px; padding: 0 16px; display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--sidebar-header-border); flex-shrink: 0; overflow: hidden;
  }
  .clinic-logo {
    width: 36px; height: 36px; background: var(--nav-item-active-bg); border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .clinic-info { overflow: hidden; }
  .clinic-info h2 {
    font-size: 13px; font-weight: 700; color: var(--text-h); margin: 0 0 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .clinic-info .app-name {
    font-size: 10px; color: var(--text-secondary); margin: 0; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .sidebar-nav {
    flex: 1; padding: 12px 8px; overflow-y: auto; display: flex;
    flex-direction: column; gap: 2px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border: none; background: transparent; color: var(--nav-item-color); font-size: 13.5px;
    font-weight: 500; border-radius: 8px; cursor: pointer; width: 100%;
    text-align: left; font-family: inherit; white-space: nowrap;
    transition: background 0.15s, color 0.15s; position: relative;
  }
  .nav-item:hover { background: var(--nav-item-hover-bg); color: var(--nav-item-hover-color); }
  .nav-item.active { background: var(--nav-item-active-bg); color: var(--nav-item-active-color); font-weight: 600; }
  .nav-icon {
    display: flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; flex-shrink: 0;
  }
  .nav-label { flex: 1; }
  .nav-chevron {
    margin-left: auto; flex-shrink: 0; transition: transform 0.2s; color: var(--text-secondary);
  }
  .nav-chevron.expanded { transform: rotate(180deg); }
  .sidebar.closed .nav-label, .sidebar.closed .nav-chevron { display: none; }
  .submenu {
    margin-left: 8px; margin-top: 2px; margin-bottom: 4px;
    border-left: 1px solid var(--sidebar-border); padding-left: 8px;
  }
  .submenu-item {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    border: none; background: transparent; color: var(--nav-item-color); font-size: 12.5px;
    font-weight: 500; border-radius: 6px; cursor: pointer; width: 100%;
    text-align: left; font-family: inherit; transition: background 0.15s, color 0.15s;
    margin-bottom: 1px;
  }
  .submenu-item:hover { background: var(--nav-item-hover-bg); color: var(--nav-item-hover-color); }
  .submenu-item.active { background: var(--nav-item-active-bg); color: var(--nav-item-active-color); font-weight: 600; }
  .submenu-dot {
    width: 5px; height: 5px; border-radius: 50%; background: var(--nav-item-color); flex-shrink: 0;
  }
  .submenu-item.active .submenu-dot { background: var(--nav-item-active-color); }
  .submenu-label {
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sidebar-user {
    padding: 12px 12px 16px; border-top: 1px solid var(--sidebar-header-border);
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .sidebar-user-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white; display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .sidebar-user-info {
    flex: 1; min-width: 0; display: flex; flex-direction: column;
  }
  .sidebar-user-name {
    font-size: 13px; font-weight: 600; color: var(--text-h); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-size: 11px; color: var(--text-secondary); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sidebar-logout-btn {
    width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--card-border);
    background: var(--card-bg); display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-secondary); flex-shrink: 0; transition: all 0.15s;
  }
  .sidebar-logout-btn:hover {
    background: #fef2f2; border-color: #fca5a5; color: #dc2626;
  }
  .header-toggle {
    width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--card-border);
    background: var(--card-bg); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s; color: var(--text-secondary); flex-shrink: 0;
  }
  .header-toggle:hover { background: var(--nav-item-hover-bg); border-color: var(--nav-item-hover-color); color: var(--nav-item-hover-color); }
  .main-content {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
  }
  .top-header {
    height: 64px; background: var(--topbar-bg); border-bottom: 1px solid var(--topbar-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-left h1 { font-size: 18px; font-weight: 600; color: var(--text-h); margin: 0; }
  .header-right { display: flex; align-items: center; gap: 16px; }
  .user-menu { display: flex; align-items: center; gap: 12px; }
  .user-info { display: flex; align-items: center; gap: 10px; }
  .user-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px;
  }
  .user-details { display: flex; flex-direction: column; }
  .user-name { font-size: 14px; font-weight: 600; color: var(--text-h); margin: 0; }
  .user-role { font-size: 12px; color: var(--text-secondary); margin: 0; }
  .logout-button {
    width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--card-border);
    background: var(--card-bg); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .logout-button:hover { background: #fef2f2; border-color: #fca5a5; }
  .logout-button svg { color: var(--text-secondary); }
  .logout-button:hover svg { color: #dc2626; }
  .page-content { flex: 1; overflow-y: auto; padding: 28px 32px; }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed; left: 0; top: 0; height: 100vh; z-index: 100;
      transform: translateX(-100%); box-shadow: 4px 0 16px rgba(0,0,0,0.1);
      transition: transform 0.25s ease, width 0.25s ease;
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar.closed { width: 248px; transform: translateX(-100%); }
    .user-details { display: none; }
    .page-content { padding: 20px 16px; }
  }
`;
