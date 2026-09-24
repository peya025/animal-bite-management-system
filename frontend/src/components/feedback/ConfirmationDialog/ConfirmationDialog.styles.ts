import { keyframes, styled } from '@mui/material/styles';

export type ConfirmationVariant = 'confirm' | 'success' | 'warning' | 'danger' | 'logout';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
`;

const overlayFadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
`;

const shake = keyframes`
  0%, 100% { transform: rotate(0deg) scale(1); }
  15% { transform: rotate(-8deg) scale(1.05); }
  30% { transform: rotate(6deg) scale(1.05); }
  45% { transform: rotate(-6deg) scale(1.05); }
  60% { transform: rotate(4deg) scale(1.05); }
  75% { transform: rotate(-2deg) scale(1.02); }
  90% { transform: rotate(1deg) scale(1); }
`;

const shakeHover = keyframes`
  0%, 100% { transform: rotate(0deg) scale(1); }
  15% { transform: rotate(-6deg) scale(1.05); }
  30% { transform: rotate(4deg) scale(1.05); }
  45% { transform: rotate(-4deg) scale(1.05); }
  60% { transform: rotate(2deg) scale(1.05); }
  75% { transform: rotate(-1deg) scale(1.02); }
  90% { transform: rotate(1deg) scale(1); }
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
  warning: { background: '#d1fae5', color: '#065f46' },
  danger:  { background: '#fee2e2', color: '#991b1b' },
  logout:  { background: '#fee2e2', color: '#991b1b' },
};

const buttonColors: Record<
  ConfirmationVariant,
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
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
    hoverShadow: '0 6px 16px rgba(16, 185, 129, 0.45)',
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    shadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
    hoverShadow: '0 6px 16px rgba(239, 68, 68, 0.45)',
  },
  logout: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    shadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
    hoverShadow: '0 6px 16px rgba(239, 68, 68, 0.45)',
  },
};

export const Overlay = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isFadingOut',
})<{ isFadingOut?: boolean }>(({ isFadingOut }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1400,
  padding: '16px',
  boxSizing: 'border-box',
  animation: isFadingOut ? `${overlayFadeOut} 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards` : `${fadeIn} 0.2s ease`,
}));

export const Modal = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isFadingOut',
})<{ isFadingOut?: boolean }>(({ isFadingOut }) => ({
  background: 'var(--card-bg-solid, #ffffff)',
  borderRadius: 16,
  padding: 'clamp(24px, 4vh, 36px) clamp(20px, 4vw, 32px) 24px',
  width: '100%',
  maxWidth: 'min(420px, calc(100vw - 32px))',
  maxHeight: 'calc(100dvh - 32px)',
  overflowY: 'auto',
  boxSizing: 'border-box',
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
  border: '1px solid var(--border-glow, rgba(16, 185, 129, 0.2))',
  animation: isFadingOut ? `${fadeOut} 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards` : `${scaleIn} 0.25s ease`,
  pointerEvents: isFadingOut ? 'none' : 'auto',

  '[data-theme="dark"] &': {
    background: '#0e1812',
    color: '#ffffff',
    border: '1px solid rgba(163, 230, 53, 0.25)',
  },

  '@media (max-width: 480px)': {
    margin: 8,
    padding: '24px 16px 20px',
  },
}));

export const Icon = styled('div', {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'shouldShake',
})<{ variant: ConfirmationVariant; shouldShake?: boolean }>(({ variant, shouldShake }) => ({
  width: 64,
  height: 64,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
  ...iconColors[variant],
  ...(shouldShake && {
    animation: `${shake} 0.6s ease-in-out`,
    '&:hover': {
      animation: `${shakeHover} 0.6s ease-in-out`,
    },
  }),
}));

export const Title = styled('h3')({
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-primary, #374151)',
  marginBottom: 10,
});

export const Message = styled('p')({
  fontSize: 14,
  color: 'var(--text-secondary, #6b7280)',
  lineHeight: 1.6,
  marginBottom: 28,

  '& strong': {
    color: 'var(--text-primary, #374151)',
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
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  '&:disabled': {
    opacity: 0.65,
    cursor: 'not-allowed',
    transform: 'none !important',
  },
});

export const CancelButton = styled(DialogButton)({
  background: 'var(--bg-hover, #f3f4f6)',
  color: 'var(--text-primary, #4b5563)',
  border: '1px solid var(--border-glow, transparent)',

  '&:hover:not(:disabled)': {
    background: 'var(--bg-secondary, #e5e7eb)',
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

    '&:hover:not(:disabled)': {
      transform: 'translateY(-1px)',
      boxShadow: colors.hoverShadow,
    },
  };
});

export { ButtonSpinner } from '../../common/ButtonSpinner';

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
