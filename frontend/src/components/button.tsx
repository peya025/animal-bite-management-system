import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  startIcon?: ReactNode;
}

const styles: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: 'transparent', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' },
  secondary: { background: 'var(--btn-outlined-bg)', borderColor: 'var(--btn-outlined-border)', color: 'var(--btn-outlined-color)' },
  danger: { background: 'var(--btn-outlined-bg)', borderColor: '#fecaca', color: '#dc2626' },
  ghost: { background: 'transparent', borderColor: 'transparent', color: 'var(--text)' },
};

export default function AppButton({ children, variant = 'primary', startIcon, style, ...props }: AppButtonProps) {
  return <button {...props} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 36, padding: '9px 18px', border: '1px solid', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: props.disabled ? 'not-allowed' : 'pointer', opacity: props.disabled ? 0.6 : 1, transition: 'all .2s', whiteSpace: 'nowrap', ...styles[variant], ...style }}
    onMouseEnter={event => { props.onMouseEnter?.(event); if (!props.disabled && variant === 'primary') { event.currentTarget.style.transform = 'translateY(-1px)'; event.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)'; } }}
    onMouseLeave={event => { props.onMouseLeave?.(event); if (!props.disabled && variant === 'primary') { event.currentTarget.style.transform = 'translateY(0)'; event.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)'; } }}>
    {startIcon}{children}
  </button>;
}
