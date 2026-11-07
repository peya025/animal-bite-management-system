export const WALKTHROUGH_Z_INDEX = 99998;

export const walkthroughStyles = `
/* ── Walkthrough Spotlight and Backdrop ── */
.walkthrough-backdrop-blur {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: ${WALKTHROUGH_Z_INDEX};
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: auto;
  transition: opacity 0.25s ease;
}

.walkthrough-backdrop-svg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: ${WALKTHROUGH_Z_INDEX};
  pointer-events: auto;
  transition: opacity 0.2s ease;
}

.walkthrough-spotlight-glow {
  position: fixed;
  box-sizing: border-box;
  border-radius: 12px;
  border: 2px solid #10b981;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.45);
  pointer-events: none;
  z-index: ${WALKTHROUGH_Z_INDEX + 1};
  animation: walkthroughPulse 2s infinite ease-in-out;
}

@keyframes walkthroughPulse {
  0%, 100% {
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 22px rgba(16, 185, 129, 0.6);
  }
}

/* ── Tooltip Box ── */
.walkthrough-tooltip-card {
  position: fixed;
  z-index: ${WALKTHROUGH_Z_INDEX + 2};
  width: 360px;
  max-width: calc(100vw - 32px);
  background: var(--card-bg, #ffffff);
  color: var(--text-h, #0f172a);
  border: 1px solid var(--border-glow, rgba(16, 185, 129, 0.35));
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(16, 185, 129, 0.12);
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
  animation: walkthroughCardFadeIn 0.2s ease;
}

@keyframes walkthroughCardFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.walkthrough-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.walkthrough-step-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #065f46;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid #a7f3d0;
}

.walkthrough-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.walkthrough-close-btn:hover {
  color: #475569;
  background: rgba(0, 0, 0, 0.05);
}

.walkthrough-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-h, #0f172a);
}

.walkthrough-content {
  margin: 0 0 16px 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary, #475569);
  font-weight: 400;
}

.walkthrough-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle, #f1f5f9);
}

.walkthrough-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.walkthrough-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.walkthrough-btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
}

.walkthrough-btn-skip {
  background: none;
  border: none;
  color: #64748b;
  padding: 7px 8px;
}

.walkthrough-btn-skip:hover {
  color: #0f172a;
  text-decoration: underline;
}

.walkthrough-btn-back {
  background: var(--bg-secondary, #f8fafc);
  color: var(--text-h, #334155);
  border-color: var(--border-subtle, #e2e8f0);
}

.walkthrough-btn-back:hover {
  background: #f1f5f9;
}

.walkthrough-btn-primary {
  background: #10b981;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

.walkthrough-btn-primary:hover {
  background: #059669;
}

/* ── Header Restart Button ── */
.walkthrough-restart-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid #10b981;
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.walkthrough-restart-btn:hover {
  background: #10b981;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

/* ── Welcome Modal ── */
.walkthrough-welcome-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: ${WALKTHROUGH_Z_INDEX + 10};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: walkthroughFadeIn 0.2s ease;
}

@keyframes walkthroughFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.walkthrough-welcome-card {
  width: 440px;
  max-width: 100%;
  background: var(--card-bg, #ffffff);
  border-radius: 20px;
  border: 1px solid var(--border-glow, rgba(16, 185, 129, 0.3));
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
  padding: 28px 24px 24px;
  text-align: center;
  font-family: 'Poppins', sans-serif;
  animation: walkthroughCardPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

@keyframes walkthroughCardPop {
  from {
    transform: scale(0.94);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.walkthrough-welcome-icon-wrap {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #ecfdf5;
  border: 2px solid #a7f3d0;
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
}

.walkthrough-welcome-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-h, #0f172a);
}

.walkthrough-welcome-text {
  margin: 0 0 24px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary, #475569);
}

.walkthrough-welcome-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
`;
