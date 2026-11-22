import React, { useEffect } from 'react';

interface WalkthroughWelcomeModalProps {
  open: boolean;
  roleName?: string;
  title?: string;
  description?: string;
  totalSteps?: number;
  onStart: () => void;
  onDismiss: () => void;
}

export const WalkthroughWelcomeModal: React.FC<WalkthroughWelcomeModalProps> = ({
  open,
  roleName,
  title,
  description,
  totalSteps,
  onStart,
  onDismiss,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onDismiss]);

  if (!open) return null;

  const displayBadgeText = roleName
    ? roleName.toLowerCase().includes('tour')
      ? `${roleName} • ${totalSteps || 15} steps`
      : `${roleName} Dashboard Tour • ${totalSteps || 15} steps`
    : `Dashboard Tour • ${totalSteps || 15} steps`;

  return (
    <div
      className="walkthrough-welcome-backdrop"
      data-testid="walkthrough-welcome-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-welcome-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="walkthrough-welcome-card">
        {/* Close 'X' button */}
        <button
          type="button"
          className="walkthrough-modal-close-btn"
          data-testid="walkthrough-modal-close-btn"
          onClick={onDismiss}
          title="Close guide"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* System Animal Bite & Clinical Treatment Emblem (Vector SVG, No Emojis) */}
        <div className="walkthrough-welcome-icon-outer" aria-hidden="true">
          <div className="walkthrough-welcome-icon-glow" />
          <div className="walkthrough-welcome-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              {/* 4 Paw Toes */}
              <circle cx="6.5" cy="8" r="2.2" fill="#0d9488" />
              <circle cx="10.2" cy="5" r="2.2" fill="#0d9488" />
              <circle cx="13.8" cy="5" r="2.2" fill="#0d9488" />
              <circle cx="17.5" cy="8" r="2.2" fill="#0d9488" />
              {/* Main Paw Pad */}
              <path
                d="M12 9.8C8.5 9.8 5.5 12.4 5.5 15.8C5.5 18.8 8.2 21 12 21C15.8 21 18.5 18.8 18.5 15.8C18.5 12.4 15.5 9.8 12 9.8Z"
                fill="#0d9488"
              />
              {/* Medical Cross inside Main Pad */}
              <rect x="10.9" y="12.2" width="2.2" height="6.6" rx="0.6" fill="#ffffff" />
              <rect x="8.7" y="14.4" width="6.6" height="2.2" rx="0.6" fill="#ffffff" />
            </svg>
          </div>
        </div>

        {/* Role Pill Badge (Subtle dot indicator, No Emojis) */}
        <div
          className="walkthrough-welcome-badge walkthrough-progress-indicator"
          data-testid="walkthrough-progress-indicator"
        >
          <span className="walkthrough-welcome-badge-dot" />
          <span>{displayBadgeText}</span>
        </div>

        {/* Title */}
        <h2 id="walkthrough-welcome-heading" className="walkthrough-welcome-title">
          {title || 'Explore Your Dashboard'}
        </h2>

        {/* Subtitle */}
        <p className="walkthrough-welcome-text">
          {description || 'Welcome to your clinical dashboard. This interactive guide will walk you through the essential tools, workflow queues, and patient surveillance features available for your role.'}
        </p>

        {/* Professional Feature Highlights (Vector SVGs, No Emojis) */}
        <div className="walkthrough-welcome-highlights" aria-hidden="true">
          <div className="walkthrough-welcome-pill">
            <span className="walkthrough-welcome-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 12h6M9 16h6" />
              </svg>
            </span>
            <span className="walkthrough-welcome-pill-text">Real-time Records</span>
          </div>

          <div className="walkthrough-welcome-pill">
            <span className="walkthrough-welcome-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            <span className="walkthrough-welcome-pill-text">Queue Workflows</span>
          </div>

          <div className="walkthrough-welcome-pill">
            <span className="walkthrough-welcome-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <span className="walkthrough-welcome-pill-text">Quick Actions</span>
          </div>
        </div>

        {/* Actions */}
        <div className="walkthrough-welcome-actions">
          <button
            type="button"
            className="walkthrough-welcome-btn-skip"
            data-testid="walkthrough-dismiss-btn"
            onClick={onDismiss}
          >
            Skip Tour
          </button>
          <button
            type="button"
            className="walkthrough-welcome-btn-start"
            data-testid="walkthrough-start-btn"
            onClick={onStart}
          >
            <span>Start Tour</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Professional Footer Reassurance (No Emojis) */}
        <div className="walkthrough-welcome-footer-note">
          <span>Interactive guided tour</span>
          <span>•</span>
          <span>Restart anytime via the top bar guide menu</span>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughWelcomeModal;
