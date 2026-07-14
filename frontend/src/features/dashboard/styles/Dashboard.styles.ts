import { styled } from '@mui/material/styles';

export const DashboardStylesRoot = styled('div')`
  display: contents;

  &, button, input, select, textarea {
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }

  .dashboard-container { max-width: 1400px; margin: 0 auto; }
  .dashboard-header { margin-bottom: 32px; }
  .dashboard-header h1 {
    font-size: 25px; line-height: 1.2; letter-spacing: -0.5px;
    font-weight: 600; color: #173d29; margin: 0 0 7px;
  }
  .dashboard-header p { font-size: 13px; line-height: 1.5; color: #77877d; margin: 0; }
  .stats-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px; margin-bottom: 32px;
  }
  .dashboard-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 24px; margin-bottom: 24px;
  }
  .dashboard-card { background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; }
  .dashboard-card h3 { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 20px 0; }
  .patient-list, .vaccination-list { display: flex; flex-direction: column; gap: 12px; }
  .patient-item {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    border-radius: 8px; background: #f9fafb; transition: all 0.2s;
  }
  .patient-item:hover, .vaccination-item:hover { background: #f3f4f6; }
  .patient-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white; display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 16px; flex-shrink: 0;
  }
  .patient-info, .vax-info { flex: 1; }
  .patient-name, .vax-patient { font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 4px 0; }
  .patient-number, .vax-dose { font-size: 12px; color: #6b7280; margin: 0; }
  .vaccination-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px; border-radius: 8px; background: #f9fafb; transition: all 0.2s;
  }
  .vax-btn {
    padding: 6px 16px; border-radius: 6px; border: none; background: #10b981;
    color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .vax-btn:hover { background: #059669; }
  .quick-actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .action-btn {
    padding: 16px; border-radius: 8px; border: none; font-size: 14px;
    font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;
  }
  .action-btn span { font-size: 20px; }
  .action-btn.action-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
  .action-btn.action-primary:hover {
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transform: translateY(-2px);
  }
  .action-btn.action-secondary { background: #f3f4f6; color: #111827; border: 1px solid #e5e7eb; }
  .action-btn.action-secondary:hover { background: #e5e7eb; }
  .empty-state { text-align: center; color: #9ca3af; padding: 32px; font-size: 14px; }
  .dashboard-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 60vh; gap: 16px;
  }
  .dashboard-loading .spinner {
    width: 48px; height: 48px; border: 4px solid #e5e7eb;
    border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dashboard-loading p { color: #6b7280; font-size: 14px; }
  .dashboard-error { text-align: center; padding: 48px; }
  .dashboard-error p { color: #ef4444; margin-bottom: 16px; }
  .dashboard-error button {
    padding: 10px 20px; border-radius: 8px; border: none; background: #10b981;
    color: white; font-weight: 600; cursor: pointer;
  }
  .dashboard-error button:hover { background: #059669; }
  .triage-header {
    display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px;
  }
  .triage-primary-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;
    border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: inherit; white-space: nowrap;
    box-shadow: 0 2px 8px rgba(16,185,129,0.35); transition: all 0.2s;
  }
  .triage-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.45); }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .card-header h3 { font-size: 15px; font-weight: 600; color: #111827; margin: 0; }
  .card-link-btn {
    background: none; border: none; font-size: 13px; color: #10b981; font-weight: 500;
    cursor: pointer; padding: 0; font-family: inherit; transition: color 0.15s;
  }
  .card-link-btn:hover { color: #059669; }
  .triage-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 28px 16px; color: #9ca3af; font-size: 13px;
  }
  .queue-summary { display: flex; flex-direction: column; gap: 16px; }
  .queue-stat-item { padding: 16px; border-radius: 10px; text-align: center; }
  .queue-stat-waiting { background: #eff6ff; }
  .qs-value { display: block; font-size: 32px; font-weight: 800; color: #1d4ed8; line-height: 1; }
  .qs-label { font-size: 12px; color: #6b7280; font-weight: 500; margin-top: 4px; display: block; }
  .triage-action-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 10px 16px; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: background 0.15s;
  }
  .triage-action-green { background: #ecfdf5; color: #065f46; }
  .triage-action-green:hover { background: #d1fae5; }
  .triage-action-red { background: #fef2f2; color: #991b1b; }
  .triage-action-red:hover { background: #fee2e2; }
  .vax-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
  .vax-status-badge {
    font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
    white-space: nowrap; flex-shrink: 0;
  }
  .vax-status-pending { background: #fef3c7; color: #92400e; }
  .vax-status-completed { background: #d1fae5; color: #065f46; }
  .vax-status-missed { background: #fee2e2; color: #991b1b; }
  .vax-status-rescheduled { background: #e0e7ff; color: #3730a3; }
  .triage-cases-placeholder { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0; }
  .cases-count-badge { text-align: center; }
  .cases-count-badge span { display: block; font-size: 48px; font-weight: 800; color: #ef4444; line-height: 1; }
  .cases-count-badge p { font-size: 13px; color: #6b7280; margin: 6px 0 0; }
  .triage-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .triage-quick-action {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 18px 12px; border: none; border-radius: 10px; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit;
    transition: background 0.15s, transform 0.15s;
  }
  .triage-quick-action:hover { transform: translateY(-1px); }
  .tqa-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .triage-qa-primary { background: #ecfdf5; color: #065f46; }
  .triage-qa-primary .tqa-icon { background: #d1fae5; color: #059669; }
  .triage-qa-primary:hover { background: #d1fae5; }
  .triage-qa-blue { background: #eff6ff; color: #1e40af; }
  .triage-qa-blue .tqa-icon { background: #dbeafe; color: #2563eb; }
  .triage-qa-blue:hover { background: #dbeafe; }
  .triage-qa-yellow { background: #fffbeb; color: #92400e; }
  .triage-qa-yellow .tqa-icon { background: #fef3c7; color: #d97706; }
  .triage-qa-yellow:hover { background: #fef3c7; }
  .triage-qa-gray { background: #f9fafb; color: #374151; }
  .triage-qa-gray .tqa-icon { background: #f3f4f6; color: #6b7280; }
  .triage-qa-gray:hover { background: #f3f4f6; }

  @media (max-width: 768px) {
    .stats-grid, .dashboard-grid { grid-template-columns: 1fr; }
    .quick-actions { grid-template-columns: 1fr; }
  }
`;
