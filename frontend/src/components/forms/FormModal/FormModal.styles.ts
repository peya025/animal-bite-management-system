import { keyframes, styled } from '@mui/material/styles';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

export const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '24px 16px',
  animation: `${fadeIn} 0.2s ease`,
});

export const Modal = styled('div', {
  shouldForwardProp: (prop) => prop !== 'maxWidth',
})<{ maxWidth: number }>(({ maxWidth }) => ({
  background: 'var(--card-bg, #ffffff)',
  border: '1px solid var(--card-border, rgba(0, 0, 0, 0.05))',
  borderRadius: 16,
  width: '100%',
  maxWidth,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 48px)',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.18)',
  animation: `${scaleIn} 0.25s ease`,
  overflow: 'hidden',
}));

export const Header = styled('div')({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  padding: '24px 28px 20px',
  borderBottom: '1px solid var(--sidebar-header-border, #f3f4f6)',
  flexShrink: 0,

  '@media (max-width: 640px)': {
    paddingLeft: 20,
    paddingRight: 20,
  },
});

export const Title = styled('h2')({
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text-h, #111827)',
  margin: '0 0 4px',
});

export const Subtitle = styled('p')({
  fontSize: 13,
  color: 'var(--text-secondary, #6b7280)',
  margin: 0,
});

export const CloseButton = styled('button')({
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid var(--card-border, #e5e7eb)',
  background: 'var(--card-bg, #fff)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary, #6b7280)',
  flexShrink: 0,
  transition: 'all 0.15s',

  '&:hover': {
    background: 'var(--bg-hover, #fef2f2)',
    borderColor: '#fca5a5',
    color: '#dc2626',
  },
});

export const Body = styled('div')({
  overflowY: 'auto',
  padding: '24px 28px',
  flex: 1,

  '.fm-section': { marginBottom: 24 },
  '.fm-section-title': {
    fontSize: 11,
    fontWeight: 700,
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    margin: '0 0 14px',
    paddingBottom: 8,
    borderBottom: '1px solid var(--nav-item-active-bg, #ecfdf5)',
  },
  '.fm-grid': { display: 'grid', gap: 14 },
  '.fm-grid--1': { gridTemplateColumns: '1fr' },
  '.fm-grid--2': { gridTemplateColumns: '1fr 1fr' },
  '.fm-grid--3': { gridTemplateColumns: '1fr 1fr 1fr' },
  '.fm-grid--4': { gridTemplateColumns: '1fr 1fr 1fr 1fr' },
  '.fm-field': {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  '.fm-label': {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-h, #374151)',
  },
  '.fm-label span': {
    color: '#ef4444',
    marginLeft: 2,
  },
  '.fm-input, .fm-select, .fm-textarea': {
    padding: '9px 12px',
    border: '1px solid var(--input-border, #e5e7eb)',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    color: 'var(--input-text, #111827)',
    background: 'var(--input-bg, #fff)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  '.fm-input:focus, .fm-select:focus, .fm-textarea:focus': {
    borderColor: '#10b981',
    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)',
  },
  '.fm-input::placeholder, .fm-textarea::placeholder': {
    color: 'var(--text-secondary, #d1d5db)',
  },
  '.fm-textarea': {
    resize: 'vertical',
    minHeight: 72,
  },
  '.fm-radio-group': {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  '.fm-radio': {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: 'var(--text, #374151)',
    cursor: 'pointer',
  },
  '.fm-radio input[type="radio"]': {
    accentColor: '#10b981',
    width: 16,
    height: 16,
    cursor: 'pointer',
  },

  '@media (max-width: 640px)': {
    paddingLeft: 20,
    paddingRight: 20,

    '.fm-grid--2, .fm-grid--3, .fm-grid--4': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const Footer = styled('div')({
  padding: '16px 28px',
  borderTop: '1px solid var(--sidebar-header-border, #f3f4f6)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  flexShrink: 0,
  background: 'var(--card-bg, #fff)',

  '.fm-btn': {
    padding: '10px 24px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
  },
  '.fm-btn--cancel': {
    background: 'var(--bg-hover, #f3f4f6)',
    color: 'var(--text-secondary, #4b5563)',
  },
  '.fm-btn--cancel:hover': {
    background: 'var(--bg-secondary, #e5e7eb)',
  },
  '.fm-btn--submit': {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
  },
  '.fm-btn--submit:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
  },
  '.fm-btn--submit:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none',
  },

  '@media (max-width: 640px)': {
    paddingLeft: 20,
    paddingRight: 20,
  },
});
