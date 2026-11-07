import React from 'react';

interface WalkthroughWelcomeModalProps {
  open: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

export const WalkthroughWelcomeModal: React.FC<WalkthroughWelcomeModalProps> = ({
  open,
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
        <div className="walkthrough-welcome-icon-wrap" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </div>

        <h2 id="walkthrough-welcome-heading" className="walkthrough-welcome-title">
          Welcome to the System!
        </h2>

        <p className="walkthrough-welcome-text">
          Would you like a quick guide to help you learn how to use the system?
        </p>

        <div className="walkthrough-welcome-actions">
          <button
            type="button"
            className="walkthrough-btn walkthrough-btn-back"
            data-testid="walkthrough-dismiss-btn"
            style={{ padding: '9px 18px', fontSize: '13px' }}
            onClick={onDismiss}
          >
            Maybe Later
          </button>
          <button
            type="button"
            className="walkthrough-btn walkthrough-btn-primary"
            data-testid="walkthrough-start-btn"
            style={{ padding: '9px 20px', fontSize: '13px' }}
            onClick={onStart}
            autoFocus
          >
            Start Walkthrough
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughWelcomeModal;
