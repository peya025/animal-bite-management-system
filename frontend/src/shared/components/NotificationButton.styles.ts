import { styled } from '@mui/material/styles';

export const BellButton = styled('button')`
  position: relative;
  background: var(--btn-outlined-bg, #ffffff);
  border: 1px solid var(--card-border, #e5e7eb);
  color: var(--text-h, #111827);
  border-radius: 8px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  box-shadow: var(--shadow);

  &:hover {
    background: var(--nav-item-hover-bg, #f9fafb);
    border-color: #10b981;
    color: #10b981;
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }

  svg {
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: rotate(-8deg);
  }
`;

export const NotificationDot = styled('span')`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%);
  box-shadow: 0 0 0 2px var(--btn-outlined-bg, #ffffff);
`;

export const NotificationBadge = styled('span')`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fb7185 0%, #ef4444 100%);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px var(--btn-outlined-bg, #ffffff);
  line-height: 1;
`;

export const NotificationDropdown = styled('div')`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-width: calc(100vw - 32px);
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e0eae3);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const DropdownHeader = styled('div')`
  padding: 12px 16px;
  border-bottom: 1px solid var(--sidebar-header-border, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h3 {
    font-size: 13.5px;
    font-weight: 650;
    margin: 0;
    color: var(--text-h, #111827);
  }

  .count-chip {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 999px;
    background: #ecfdf5;
    color: #059669;
  }

  .mark-read {
    font-size: 11px;
    color: #10b981;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    padding: 0;
    &:hover {
      text-decoration: underline;
    }
  }
`;

export const NotificationList = styled('div')`
  max-height: 380px;
  overflow-y: auto;
`;

export const NotificationItem = styled('div')<{ isUnread?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid var(--sidebar-header-border, #f3f4f6);
  display: flex;
  gap: 12px;
  cursor: pointer;
  background: ${props => props.isUnread ? 'var(--nav-item-active-bg, #f0fdf4)' : 'transparent'};
  transition: background 0.15s ease;

  &:hover {
    background: var(--nav-item-hover-bg, #f9fafb);
  }

  &:last-child {
    border-bottom: none;
  }
`;

export const NotificationItemIcon = styled('div')<{ iconName?: string; variant?: 'info' | 'warning' | 'danger' | 'success' | 'purple' }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 15px;
  transition: all 0.15s ease;

  /* Blue / Info (Queue, Patients) */
  ${props => (props.variant === 'info' || props.iconName === 'patients' || props.iconName === 'queue') && `
    background: #e0f2fe;
    color: #0369a1;
    [data-theme='dark'] & {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
    }
  `}

  /* Amber / Warning (Low Stock, Near Expiry, Overdue) */
  ${props => (props.variant === 'warning' || props.iconName === 'warning') && `
    background: #fef3c7;
    color: #b45309;
    [data-theme='dark'] & {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }
  `}

  /* Danger / High Risk (Out of stock, Expired, High risk area) */
  ${props => (props.variant === 'danger') && `
    background: #ffe4e6;
    color: #e11d48;
    [data-theme='dark'] & {
      background: rgba(244, 63, 94, 0.15);
      color: #fb7185;
    }
  `}

  /* Success / Inventory (Stock received, preset added) */
  ${props => (props.variant === 'success' || props.iconName === 'inventory') && `
    background: #d1fae5;
    color: #059669;
    [data-theme='dark'] & {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }
  `}

  /* Purple / Calendar (Appointments) */
  ${props => (props.variant === 'purple' || props.iconName === 'calendar') && `
    background: #f3e8ff;
    color: #7e22ce;
    [data-theme='dark'] & {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
    }
  `}
`;

export const NotificationContent = styled('div')`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  text-align: left;
`;

export const NotificationTitle = styled('div')`
  font-size: 12.5px;
  font-weight: 650;
  color: var(--text-h, #111827);
  line-height: 1.35;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const AlertChip = styled('span')<{ variant?: 'danger' | 'warning' | 'info' }>`
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: ${props => props.variant === 'danger' ? '#ffe4e6' : props.variant === 'warning' ? '#fef3c7' : '#e0f2fe'};
  color: ${props => props.variant === 'danger' ? '#e11d48' : props.variant === 'warning' ? '#b45309' : '#0369a1'};
  white-space: nowrap;
`;

export const NotificationText = styled('p')<{ unread?: boolean }>`
  font-size: 11.5px;
  margin: 3px 0 0 0;
  color: ${props => props.unread ? 'var(--text, #1f2937)' : 'var(--text-secondary, #4b5563)'};
  font-weight: ${props => props.unread ? '500' : '400'};
  line-height: 1.45;
  word-break: break-word;
`;

export const NotificationMeta = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-secondary, #9ca3af);
`;

export const NotificationTime = styled('span')`
  font-size: 10.5px;
  color: var(--text-secondary, #6b7280);
`;

export const ActionHint = styled('span')`
  font-size: 10px;
  font-weight: 500;
  color: #10b981;
  display: inline-flex;
  align-items: center;
  gap: 2px;
`;

export const UnreadDot = styled('span')`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
  margin-top: 5px;
`;

export const DropdownFooter = styled('button')`
  padding: 10px;
  background: var(--bg-secondary, #f9fafb);
  border: none;
  border-top: 1px solid var(--sidebar-header-border, #f3f4f6);
  color: var(--text-secondary, #6b7280);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: color 0.15s;

  &:hover {
    color: var(--nav-item-active-color, #065f46);
  }
`;
