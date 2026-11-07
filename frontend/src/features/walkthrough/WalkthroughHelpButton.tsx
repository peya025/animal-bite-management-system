import React from 'react';
import { useWalkthrough } from './WalkthroughContext';

export const WalkthroughHelpButton: React.FC = () => {
  const { isRegistrationStaff, restartWalkthrough } = useWalkthrough();

  if (!isRegistrationStaff) return null;

  return (
    <button
      type="button"
      className="walkthrough-restart-btn"
      onClick={restartWalkthrough}
      title="Restart System Walkthrough"
      aria-label="Restart System Walkthrough"
      data-walkthrough="walkthrough-btn"
      data-testid="walkthrough-help-button"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>Guide Tour</span>
    </button>
  );
};

export default WalkthroughHelpButton;
