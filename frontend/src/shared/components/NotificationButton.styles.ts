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

export const NotificationDropdown = styled('div')`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e0eae3);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  z-index: 50;
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

  h3 {
    font-size: 13.5px;
    font-weight: 650;
    margin: 0;
    color: var(--text-h, #111827);
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
  max-height: 280px;
  overflow-y: auto;
`;

export const NotificationItem = styled('div')<{ isUnread?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid var(--sidebar-header-border, #f3f4f6);
  display: flex;
  gap: 10px;
  cursor: pointer;
  background: ${props => props.isUnread ? 'var(--nav-item-active-bg, #ecfdf5)' : 'transparent'};
  transition: background 0.15s ease;

  &:hover {
    background: var(--nav-item-hover-bg, #f9fafb);
  }

  &:last-child {
    border-bottom: none;
  }
`;

export const NotificationItemIcon = styled('div')<{ iconName?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  transition: all 0.15s ease;

  /* Blue for patients */
  ${props => props.iconName === 'patients' && `
    background: #e0f2fe;
    color: #0369a1;
    [data-theme='dark'] & {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
    }
  `}

  /* Amber/yellow for warnings */
  ${props => props.iconName === 'warning' && `
    background: #fef3c7;
    color: #b45309;
    [data-theme='dark'] & {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }
  `}

  /* Purple for calendar */
  ${props => props.iconName === 'calendar' && `
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
  gap: 2px;
  text-align: left;
`;

export const NotificationText = styled('p')<{ unread?: boolean }>`
  font-size: 12px;
  margin: 0;
  color: ${props => props.unread ? 'var(--text-h, #111827)' : 'var(--text, #374151)'};
  font-weight: ${props => props.unread ? '600' : '400'};
  line-height: 1.45;
`;

export const NotificationTime = styled('span')`
  font-size: 10px;
  color: var(--text-secondary, #6b7280);
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
