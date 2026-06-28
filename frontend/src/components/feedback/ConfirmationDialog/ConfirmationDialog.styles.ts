import { keyframes, styled } from '@mui/material/styles';

export type ConfirmationVariant = 'confirm' | 'success' | 'warning' | 'danger';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
`;

const loaderGrow = keyframes`
  0% { width: 0; }
  100% { width: 100%; }
`;

const sparkDown = keyframes`
  0% { transform: rotate(-45deg) translateX(0); opacity: 0.7; }
  100% { transform: rotate(-45deg) translateX(-45px); opacity: 0; }
`;

const sparkUp = keyframes`
  0% { transform: rotate(45deg) translateX(0); opacity: 1; }
  100% { transform: rotate(45deg) translateX(-45px); opacity: 0.7; }
`;

const iconColors: Record<ConfirmationVariant, { background: string; color: string }> = {
  confirm: { background: '#d1fae5', color: '#065f46' },
  success: { background: '#d1fae5', color: '#065f46' },
  warning: { background: '#fef3c7', color: '#92400e' },
  danger: { background: '#fee2e2', color: '#991b1b' },
};

const buttonColors: Record<
  Exclude<ConfirmationVariant, 'confirm'> | 'confirm',
  { background: string; shadow: string; hoverShadow: string }
> = {
  confirm: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
    hoverShadow: '0 6px 16px rgba(16, 185, 129, 0.45)',
  },
  success: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
    hoverShadow: '0 6px 16px rgba(16, 185, 129, 0.45)',
  },
  warning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
    hoverShadow: '0 6px 16px rgba(245, 158, 11, 0.45)',
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    shadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
    hoverShadow: '0 6px 16px rgba(239, 68, 68, 0.45)',
  },
};

export const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  animation: `${fadeIn} 0.2s ease`,
});

export const Modal = styled('div')({
  background: '#ffffff',
  borderRadius: 16,
  padding: '36px 32px 28px',
  width: '100%',
  maxWidth: 400,
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  animation: `${scaleIn} 0.25s ease`,

  '@media (max-width: 480px)': {
    margin: 16,
    padding: '28px 20px 22px',
  },
});

export const Icon = styled('div', {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: ConfirmationVariant }>(({ variant }) => ({
  width: 64,
  height: 64,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
  ...iconColors[variant],
}));

export const Title = styled('h3')({
  fontSize: 20,
  fontWeight: 700,
  color: '#374151',
  marginBottom: 10,
});

export const Message = styled('p')({
  fontSize: 14,
  color: '#6b7280',
  lineHeight: 1.6,
  marginBottom: 28,

  '& strong': {
    color: '#374151',
  },
});

export const Actions = styled('div')({
  display: 'flex',
  gap: 12,

  '@media (max-width: 480px)': {
    flexDirection: 'column-reverse',
  },
});

const DialogButton = styled('button')({
  flex: 1,
  padding: '11px 16px',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.2s ease',
});

export const CancelButton = styled(DialogButton)({
  background: '#f3f4f6',
  color: '#4b5563',

  '&:hover': {
    background: '#e5e7eb',
  },
});

export const ConfirmButton = styled(DialogButton, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: ConfirmationVariant }>(({ variant }) => {
  const colors = buttonColors[variant];

  return {
    background: colors.background,
    color: '#ffffff',
    boxShadow: colors.shadow,

    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: colors.hoverShadow,
    },
  };
});

export const LoaderWrap = styled('div')({
  width: '100%',
  marginBottom: 8,
});

export const LoaderBar = styled('span')({
  width: 0,
  height: 4.8,
  display: 'block',
  position: 'relative',
  background: '#54f98d',
  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
  boxSizing: 'border-box',
  animation: `${loaderGrow} 2s linear forwards`,

  '&::after, &::before': {
    content: '""',
    width: 10,
    height: 1,
    background: '#fff',
    position: 'absolute',
    top: 9,
    right: -2,
    opacity: 0,
    transform: 'rotate(-45deg) translateX(0)',
    boxSizing: 'border-box',
    animation: `${sparkDown} 0.3s linear infinite`,
  },

  '&::before': {
    top: -4,
    transform: 'rotate(45deg)',
    animation: `${sparkUp} 0.3s linear infinite`,
  },
});
