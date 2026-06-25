import './FormModal.css';

interface FormModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Footer slot — put your action buttons here */
  footer?: React.ReactNode;
  /** Max width in px (default 720) */
  maxWidth?: number;
}

export default function FormModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 720,
}: FormModalProps) {
  return (
    <div className="fm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="fm-modal"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fm-header">
          <div>
            <h2 className="fm-title">{title}</h2>
            {subtitle && <p className="fm-subtitle">{subtitle}</p>}
          </div>
          <button className="fm-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="fm-body">{children}</div>

        {/* Footer */}
        {footer && <div className="fm-footer">{footer}</div>}
      </div>
    </div>
  );
}
