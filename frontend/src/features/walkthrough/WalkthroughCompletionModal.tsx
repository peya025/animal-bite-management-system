import React from 'react';

interface WalkthroughCompletionModalProps {
  open: boolean;
  moduleName?: string;
  onFinish: () => void;
}

export const WalkthroughCompletionModal: React.FC<WalkthroughCompletionModalProps> = ({
  open,
  moduleName,
  onFinish,
}) => {
  if (!open) return null;

  const isDashboard = !moduleName || moduleName === 'Dashboard';
  const headingText = isDashboard
    ? "You've Explored Your Dashboard!"
    : `You've Explored ${moduleName}!`;
  const bodyText = isDashboard
    ? "You're all set to use the Dashboard. You can reopen this guide anytime."
    : `You're all set to use ${moduleName}. You can reopen this guide anytime.`;

  return (
    <div
      className="walkthrough-welcome-backdrop"
      data-testid="walkthrough-completion-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-completion-heading"
    >
      <div className="walkthrough-welcome-card walkthrough-completion-card">
        {/* Celebration / Success Icon */}
        <div
          className="walkthrough-welcome-icon-wrap"
          style={{
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '2px solid #10b981',
            color: '#059669',
          }}
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 12px',
            borderRadius: '999px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Tour Completed
        </div>

        <h2 id="walkthrough-completion-heading" className="walkthrough-welcome-title" style={{ fontSize: '21px' }}>
          {headingText}
        </h2>

        <p className="walkthrough-welcome-text" style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-secondary, #475569)' }}>
          {bodyText}
        </p>

        <div className="walkthrough-welcome-actions">
          <button
            type="button"
            className="walkthrough-btn walkthrough-btn-primary"
            data-testid="walkthrough-btn-finish"
            style={{ padding: '10px 28px', fontSize: '13.5px', fontWeight: 650 }}
            onClick={onFinish}
            autoFocus
          >
            Finish Tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughCompletionModal;
