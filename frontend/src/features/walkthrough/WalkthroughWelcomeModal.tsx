import React from 'react';

interface WalkthroughWelcomeModalProps {
  open: boolean;
  roleName?: string;
  totalSteps?: number;
  onStart: () => void;
  onDismiss: () => void;
}

export const WalkthroughWelcomeModal: React.FC<WalkthroughWelcomeModalProps> = ({
  open,
  roleName,
  totalSteps,
  onStart,
  onDismiss,
}) => {
  if (!open) return null;

  return (
    <div
      className="walkthrough-welcome-backdrop"
      data-testid="walkthrough-welcome-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-welcome-heading"
    >
      <div className="walkthrough-welcome-card">
        {/* Close 'X' button */}
        <button
          type="button"
          className="walkthrough-modal-close-btn"
          data-testid="walkthrough-modal-close-btn"
          onClick={onDismiss}
          title="Close"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="walkthrough-welcome-icon-wrap" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        {totalSteps ? (
          <div
            className="walkthrough-progress-indicator"
            data-testid="walkthrough-progress-indicator"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 12px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              marginBottom: '12px',
            }}
          >
            <span>✨</span>
            <span>{roleName ? `${roleName} • ` : ''}{totalSteps} steps</span>
          </div>
        ) : null}

        <h2 id="walkthrough-welcome-heading" className="walkthrough-welcome-title">
          Explore Your Dashboard
        </h2>

        <p className="walkthrough-welcome-text">
          Welcome to your Dashboard! This guide will help you understand the important features, information, and tools available for your role. Let's explore your dashboard step by step.
        </p>

        <div className="walkthrough-welcome-actions">
          <button
            type="button"
            className="walkthrough-btn walkthrough-btn-back"
            data-testid="walkthrough-dismiss-btn"
            style={{ padding: '9px 20px', fontSize: '13px' }}
            onClick={onDismiss}
          >
            Skip Tour
          </button>
          <button
            type="button"
            className="walkthrough-btn walkthrough-btn-primary"
            data-testid="walkthrough-start-btn"
            style={{ padding: '9px 24px', fontSize: '13px' }}
            onClick={onStart}
            autoFocus
          >
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughWelcomeModal;
