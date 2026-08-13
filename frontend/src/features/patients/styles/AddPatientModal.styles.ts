import { styled } from '@mui/material/styles';

export const PatientFormContent = styled('div')({
  '.apm-tabs': {
    display: 'flex',
    gap: 4,
    borderBottom: '2px solid var(--sidebar-header-border)',
    marginBottom: 20,
  },
  '.apm-tab': {
    padding: '9px 18px',
    border: 'none',
    background: 'none',
    fontSize: 13.5,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    fontFamily: 'inherit',
    transition: 'color 0.15s, border-color 0.15s',
  },
  '.apm-tab:hover': {
    color: 'var(--text-h)',
  },
  '.apm-tab--active': {
    color: '#10b981',
    borderBottomColor: '#10b981',
  },
  '.apm-address-preview': {
    background: 'var(--nav-item-active-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--nav-item-active-color)',
    marginTop: 6,
  },
  '.apm-check-grid': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  '.apm-check': {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 13,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  '.apm-check input[type="checkbox"]': {
    width: 15,
    height: 15,
    accentColor: '#10b981',
    cursor: 'pointer',
    flexShrink: 0,
  },
  '.apm-vitals': {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },

  '@media (max-width: 600px)': {
    '.apm-vitals': {
      gridTemplateColumns: '1fr 1fr',
    },
    '.apm-check-grid': {
      gridTemplateColumns: '1fr',
    },
  },
});
