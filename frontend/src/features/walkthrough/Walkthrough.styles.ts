export const WALKTHROUGH_Z_INDEX = 99998;

export const walkthroughStyles = `
/* ── Walkthrough Spotlight and Backdrop ── */
.walkthrough-backdrop-blur {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: ${WALKTHROUGH_Z_INDEX};
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
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

.walkthrough-tabs-illuminated {
  position: fixed;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1.5px solid rgba(16, 185, 129, 0.55);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  pointer-events: none;
  z-index: ${WALKTHROUGH_Z_INDEX + 1};
  transition: all 0.2s ease;
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
  width: 332px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 84px);
  overflow-y: auto;
  box-sizing: border-box;
  background: var(--card-bg, #ffffff);
  color: var(--text-h, #0f172a);
  border: 1px solid var(--border-glow, rgba(16, 185, 129, 0.35));
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(16, 185, 129, 0.12);
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  animation: walkthroughCardFadeIn 0.2s ease;
}

.walkthrough-tooltip-card.walkthrough-tooltip-card--center {
  width: 380px;
  max-width: min(380px, calc(100vw - 32px));
  box-shadow: 0 24px 50px -10px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(16, 185, 129, 0.25);
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
  margin-bottom: 8px;
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

.walkthrough-progress { display: flex; gap: 3px; height: 5px; margin: 2px 0 10px; }
.walkthrough-progress span { display: block; flex: 1; height: 100%; border-radius: 8px; background: #edf0ef; transition: background .22s ease; }
.walkthrough-progress span.done { background: #12b981; }
.walkthrough-step-count { font-size: 11px; color: #6b7280; margin-left: auto; margin-right: 10px; }
.guide-page-title { color: var(--text-h, #173b32); font-weight: 650; font-size: 14px; }
.guide-center { margin: 0 0 18px; padding: 17px 20px; background: var(--card-bg, #fff); border: 1px solid #cce7df; border-radius: 14px; box-shadow: 0 2px 10px rgba(8, 70, 54, .05); }
.guide-center-heading, .guide-center-card-top, .guide-center-card-bottom { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.guide-center h2 { margin: 0 0 3px; color: var(--text-h, #173b32); font-size: 17px; }
.guide-center-heading p, .guide-center-card p { margin: 0; color: var(--text-secondary, #64748b); font-size: 12px; line-height: 1.5; }
.guide-center-toggle, .guide-center-card button { border: 1px solid #15956f; background: #effaf6; color: #087b59; border-radius: 8px; padding: 7px 11px; cursor: pointer; font-size: 12px; font-weight: 650; white-space: nowrap; }
.guide-center-toggle:hover, .guide-center-card button:hover { background: #dcf5ea; }
.guide-center-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 10px; margin-top: 16px; }
.guide-center-card { border: 1px solid #dce9e4; border-radius: 10px; padding: 13px; display: flex; flex-direction: column; gap: 10px; min-height: 116px; }
.guide-center-card h3 { margin: 0; color: var(--text-h, #173b32); font-size: 13px; }
.guide-center-card-bottom { margin-top: auto; font-size: 11px; color: #64748b; }
.guide-complete { color: #087b59; font-size: 10px; font-weight: 700; }
.guide-header-icon { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0; border-radius: 8px; border: 1px solid var(--card-border, #e5e7eb); background: var(--btn-outlined-bg, #fff); color: var(--text-h, #111827); cursor: pointer; box-shadow: var(--shadow); transition: background .2s, border-color .2s, color .2s; }
.guide-header-icon:hover { background: rgba(16,185,129,.09); color: #059669; border-color: #10b981; }
.guide-header-icon:focus-visible, .guide-center-dialog button:focus-visible { outline: 2px solid #059669; outline-offset: 3px; }
.guide-center-dialog { font-family: 'Poppins', sans-serif; }
.guide-center-dialog h2 { margin: 0 0 4px; font-size: 18px; color: var(--text-h, #171a19); }
.guide-center-dialog p { margin-top: 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary, #737977); }
.guide-center-dialog button { font-family: inherit; }
.guide-center-card { transition: border-color .2s, background .2s; }
.guide-center-card:hover { border-color: #8ecdb4; background: #f4fbf7; }
.guide-center-entry { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0 0 16px; padding: 15px 20px; border: 1px solid #e3e8e5; border-radius: 14px; background: #fff; }
.guide-center-entry h2 { margin: 0 0 3px; font-size: 16px; color: #171a19; }
.guide-center-entry p { margin: 0; color: #737977; font-size: 12px; }
.guide-center-backdrop { position: fixed; inset: 0; z-index: 99996; display: grid; place-items: center; padding: 16px; background: rgba(18, 28, 25, .35); backdrop-filter: blur(3px); }
.guide-center-dialog { width: min(960px, 100%); max-height: min(88vh, 850px); overflow: auto; padding: 20px 16px 14px; background: #fafafa; border: 1px solid #dedede; border-radius: 24px; box-shadow: 0 25px 65px rgba(0,0,0,.18); }
.guide-center-heading { justify-content: flex-start; align-items: flex-start; padding: 0 8px 0 10px; }
.guide-center-heading h2 { font-size: 18px; }
.guide-center-heading p { font-size: 14px; }
.guide-center-icon { font-size: 25px; line-height: 1; margin: 3px 6px 0 0; color: #222; }
.guide-center-close { margin-left: auto; background: transparent; border: 0; color: #969696; cursor: pointer; font-size: 25px; line-height: 1; }
.guide-center-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 15px; }
.guide-center-card { min-height: 156px; background: #fafafa; border: 1px solid #dedede; border-radius: 16px; padding: 15px; transition: border-color .2s, background .2s, box-shadow .2s; }
.guide-center-card:hover { border-color: #8ecdb4; background: #f4fbf7; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.07); }
.guide-center-card-icon { font-size: 22px; color: #616665; height: 25px; }
.guide-center-card h3 { font-size: 16px; color: #171a19; }
.guide-center-card p { font-size: 12px; }
.guide-center-card button { border-color: #d4d4d4; border-radius: 999px; background: transparent; color: #555; font-size: 14px; padding: 5px 12px; }
.guide-center-card button:hover { background: #eef6f1; border-color: #9cceb5; }
.guide-center-optional { text-align: right; margin: 16px 0 0; font-size: 13px; color: #777; }
@media (max-width: 650px) { .guide-center-grid { grid-template-columns: 1fr; } .guide-center-dialog { border-radius: 16px; } }
@media (max-width: 600px) { .guide-center-heading { align-items: flex-start; flex-direction: column; } .walkthrough-tooltip-card { width: min(332px, calc(100vw - 24px)); } .guide-page-title { display: none; } }

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
  margin: 0 0 5px 0;
  font-size: 15.5px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-h, #0f172a);
}

.walkthrough-content {
  margin: 0 0 10px 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-secondary, #475569);
  font-weight: 400;
}

.walkthrough-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
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
  background: #059669;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.25);
}

.walkthrough-btn-primary:hover {
  background: #047857;
  color: #ffffff;
}

.walkthrough-btn-restart-inline {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid #10b981;
  color: #059669;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 6px;
}

.walkthrough-btn-restart-inline:hover {
  background: #10b981;
  color: #ffffff;
  border-color: #059669;
}

.guide-card-btn-resume {
  background: #059669 !important;
  color: #ffffff !important;
  border: 1px solid #059669 !important;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s ease;
}
.guide-card-btn-resume:hover {
  background: #047857 !important;
  border-color: #047857 !important;
}

.guide-card-btn-restart {
  background: #effaf6 !important;
  color: #087b59 !important;
  border: 1px solid #15956f !important;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s ease;
}
.guide-card-btn-restart:hover {
  background: #dcf5ea !important;
}

.guide-card-btn-start {
  background: #effaf6 !important;
  color: #087b59 !important;
  border: 1px solid #15956f !important;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s ease;
}
.guide-card-btn-start:hover {
  background: #dcf5ea !important;
}

/* ── Quick Action Walkthrough Menu ── */
.guide-quick-menu {
  overflow: hidden !important;
  font-family: 'Poppins', sans-serif !important;
}

.guide-quick-menu .MuiList-root {
  overflow: hidden !important;
  padding: 8px !important;
}

.guide-quick-menu .MuiMenuItem-root {
  font-family: inherit !important;
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

/* ── Welcome & Completion Modals ── */
.walkthrough-welcome-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
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
  position: relative;
  width: 440px;
  max-width: 100%;
  background: var(--card-bg, #ffffff);
  border-radius: 20px;
  border: 1px solid var(--border-glow, rgba(16, 185, 129, 0.35));
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.15);
  padding: 28px 24px 24px;
  text-align: center;
  font-family: 'Poppins', sans-serif;
  animation: walkthroughCardPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

.walkthrough-modal-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.walkthrough-modal-close-btn:hover {
  color: #1e293b;
  background: rgba(0, 0, 0, 0.05);
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
  font-family: 'Poppins', sans-serif;
}

.walkthrough-welcome-text {
  margin: 0 0 24px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary, #475569);
  font-family: 'Poppins', sans-serif;
}

.walkthrough-welcome-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
`;
