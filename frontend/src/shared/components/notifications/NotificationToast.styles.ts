import { keyframes, styled } from '@mui/material/styles';

const slideInRight = keyframes`
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOutRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(120%);
    opacity: 0;
  }
`;

export const ToastContainer = styled('div')`
  position: fixed;
  top: 76px;
  right: 24px;
  z-index: 1350;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 390px;
  width: calc(100vw - 32px);
  pointer-events: none;

  @media (max-width: 480px) {
    top: 72px;
    right: 12px;
    left: 12px;
    width: auto;
    max-width: none;
  }
`;

export const ToastCard = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isClosing' && prop !== 'variant',
})<{ isClosing?: boolean; variant?: 'info' | 'warning' | 'danger' | 'success' | 'purple' }>(
  ({ isClosing, variant }) => {
    const borderLeftColors = {
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      purple: '#8b5cf6',
      info: '#0d9488',
    };
    const accentColor = borderLeftColors[variant || 'info'];

    return {
      pointerEvents: 'auto',
      background: 'var(--card-bg-solid, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--border-subtle, #e2e8f0)',
      borderLeft: `4px solid ${accentColor}`,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      padding: '12px 14px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      animation: isClosing
        ? `${slideOutRight} 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards`
        : `${slideInRight} 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
      transition: 'box-shadow 0.2s ease',

      '[data-theme="dark"] &': {
        background: '#0e1812',
        borderColor: 'rgba(16, 185, 129, 0.25)',
        color: '#f3f4f6',
      },

      '&:hover': {
        boxShadow: '0 14px 28px -5px rgba(0, 0, 0, 0.18), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
      },
    };
  }
);

export const ToastIconBox = styled('div', {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant?: 'info' | 'warning' | 'danger' | 'success' | 'purple' }>(({ variant }) => {
  const bgColors = {
    danger: '#fee2e2',
    warning: '#fef3c7',
    success: '#d1fae5',
    purple: '#f3e8ff',
    info: '#ccfbf1',
  };
  const fgColors = {
    danger: '#b91c1c',
    warning: '#b45309',
    success: '#047857',
    purple: '#6b21a8',
    info: '#0f766e',
  };
  const v = variant || 'info';

  return {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: bgColors[v],
    color: fgColors[v],
  };
});

export const ToastContent = styled('div')`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

export const ToastHeader = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
`;

export const ToastTitle = styled('span')`
  font-size: 13px;
  font-weight: 700;
  color: var(--text-h, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ToastCloseBtn = styled('button')`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  color: var(--text-secondary, #9ca3af);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-h, #111827);
    background: rgba(0, 0, 0, 0.05);
  }

  [data-theme="dark"] &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const ToastMessage = styled('p')`
  font-size: 12px;
  line-height: 1.45;
  color: var(--text, #374151);
  margin: 0 0 8px 0;
  word-break: break-word;
`;

export const ToastFooter = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const ToastTime = styled('span')`
  font-size: 11px;
  color: var(--text-secondary, #9ca3af);
  font-weight: 500;
`;

export const ToastViewButton = styled('button')`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.25);
  transition: all 0.18s ease;

  &:hover {
    opacity: 0.93;
    box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35);
  }
`;
