import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import ButtonSpinner from './common/ButtonSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  startIcon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

const styles: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: 'transparent', color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' },
  secondary: { background: 'var(--btn-outlined-bg)', borderColor: 'var(--btn-outlined-border)', color: 'var(--btn-outlined-color)' },
  danger: { background: 'var(--btn-outlined-bg)', borderColor: '#fecaca', color: '#dc2626' },
  ghost: { background: 'transparent', borderColor: 'transparent', color: 'var(--text)' },
};

export default function AppButton({ children, variant = 'primary', startIcon, loading = false, loadingLabel, disabled, style, ...props }: AppButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 36,
        padding: '9px 18px',
        border: '1px solid',
        borderRadius: 8,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.65 : 1,
        transition: 'all .2s',
        whiteSpace: 'nowrap',
        ...styles[variant],
        ...style,
      }}
      onMouseEnter={(event) => {
        props.onMouseEnter?.(event);
        if (!isDisabled && variant === 'primary') {
          event.currentTarget.style.transform = 'translateY(-1px)';
          event.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)';
        }
      }}
      onMouseLeave={(event) => {
        props.onMouseLeave?.(event);
        if (!isDisabled && variant === 'primary') {
          event.currentTarget.style.transform = 'translateY(0)';
          event.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.25)';
        }
      }}
    >
      {loading ? <ButtonSpinner size={15} /> : startIcon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

