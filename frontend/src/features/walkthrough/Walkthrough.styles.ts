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

.walkthrough-tooltip-card.walkthrough-tooltip-card--compact {
  padding: 12px 12px;
}

.walkthrough-tooltip-card.walkthrough-tooltip-card--compact .walkthrough-footer {
  flex-wrap: nowrap;
  gap: 4px;
}

.walkthrough-tooltip-card.walkthrough-tooltip-card--compact .walkthrough-footer-left,
.walkthrough-tooltip-card.walkthrough-tooltip-card--compact .walkthrough-footer-right {
  flex-wrap: nowrap;
  gap: 4px;
}

.walkthrough-tooltip-card.walkthrough-tooltip-card--compact .walkthrough-btn {
  padding: 5px 8px;
  font-size: 11.5px;
  flex-shrink: 0;
}

.walkthrough-tooltip-card.walkthrough-tooltip-card--compact .walkthrough-btn-skip {
  padding: 5px 2px;
  font-size: 11.5px;
}

.walkthrough-tooltip-card.walkthrough-tooltip-card--compact .walkthrough-btn-restart-inline {
  padding: 4px 7px;
  font-size: 11.5px;
  margin-left: 0;
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
  gap: 8px;
  margin-bottom: 6px;
}

.walkthrough-header-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.walkthrough-section-row {
  margin-bottom: 8px;
}

.walkthrough-section-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: #047857;
  background: rgba(16, 185, 129, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(16, 185, 129, 0.25);
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
  white-space: nowrap;
  flex-shrink: 0;
}

.walkthrough-progress { display: flex; gap: 3px; height: 5px; margin: 2px 0 10px; }
.walkthrough-progress span { display: block; flex: 1; height: 100%; border-radius: 8px; background: #edf0ef; transition: background .22s ease; }
.walkthrough-progress span.done { background: #12b981; }
.walkthrough-step-count { font-size: 11px; color: #6b7280; white-space: nowrap; flex-shrink: 0; }
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

/* ── Guide Tour Discovery Indicator ── */
.guide-tour-indicator-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.guide-tour-indicator {
  position: absolute;
  top: calc(100% + 9px);
  right: -6px;
  z-index: 1250;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 12px;
  background: #ffffff;
  border: 1.5px solid #10b981;
  border-radius: 999px;
  box-shadow: 0 10px 25px -4px rgba(16, 185, 129, 0.25), 0 4px 10px -2px rgba(15, 23, 42, 0.08);
  color: #065f46;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  white-space: nowrap;
  cursor: pointer;
  animation: guideIndicatorFadeIn 0.25s ease;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.guide-tour-indicator:hover {
  background: #f0fdf4;
  border-color: #059669;
  box-shadow: 0 12px 28px -4px rgba(16, 185, 129, 0.35), 0 6px 12px -2px rgba(15, 23, 42, 0.12);
}

.guide-tour-indicator-pointer {
  position: absolute;
  top: -6px;
  right: 18px;
  width: 10px;
  height: 10px;
  background: #ffffff;
  border-left: 1.5px solid #10b981;
  border-top: 1.5px solid #10b981;
  transform: rotate(45deg);
  pointer-events: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.guide-tour-indicator:hover .guide-tour-indicator-pointer {
  background: #f0fdf4;
  border-color: #059669;
}

.guide-tour-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.65);
  flex-shrink: 0;
}

.guide-tour-indicator-text {
  color: #047857;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: -0.01em;
  user-select: none;
}

.guide-tour-indicator-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  margin-left: 2px;
  background: #e2e8f0;
  border: none;
  border-radius: 50%;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}

.guide-tour-indicator-close:hover {
  background: #fee2e2;
  color: #ef4444;
  transform: scale(1.08);
}

@keyframes guideIndicatorFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
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

.walkthrough-tooltip-card[data-walkthrough-module="Bite Cases Summary"] .walkthrough-title,
.walkthrough-tooltip-card[data-walkthrough-module="Bite Map"] .walkthrough-title,
.walkthrough-tooltip-card[data-walkthrough-module="Vaccine Stock Management"] .walkthrough-title,
.walkthrough-tooltip-card[data-walkthrough-module="Reports & Analytics"] .walkthrough-title,
.walkthrough-tooltip-card[data-walkthrough-module="Clinic Setup"] .walkthrough-title {
  font-size: 14.5px;
}

.walkthrough-tooltip-card[data-walkthrough-module="Bite Cases Summary"] .walkthrough-content,
.walkthrough-tooltip-card[data-walkthrough-module="Bite Map"] .walkthrough-content,
.walkthrough-tooltip-card[data-walkthrough-module="Vaccine Stock Management"] .walkthrough-content,
.walkthrough-tooltip-card[data-walkthrough-module="Reports & Analytics"] .walkthrough-content,
.walkthrough-tooltip-card[data-walkthrough-module="Clinic Setup"] .walkthrough-content {
  font-size: 12px;
  line-height: 1.45;
}

.walkthrough-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle, #f1f5f9);
}

.walkthrough-footer-left {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  flex-shrink: 0;
}

.walkthrough-footer-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  flex-shrink: 0;
}

.walkthrough-btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.walkthrough-btn-skip {
  background: none;
  border: none;
  color: #64748b;
  padding: 6px 4px;
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
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0;
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
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: ${WALKTHROUGH_Z_INDEX + 10};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: walkthroughFadeIn 0.22s ease;
}

@keyframes walkthroughFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.walkthrough-welcome-card {
  position: relative;
  width: 490px;
  max-width: 100%;
  background: #ffffff;
  border-radius: 22px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(13, 148, 136, 0.08);
  padding: 34px 32px 24px;
  text-align: center;
  font-family: 'Poppins', sans-serif;
  animation: walkthroughCardPop 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  overflow: hidden;
}

.walkthrough-modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.walkthrough-modal-close-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: scale(1.05);
}

@keyframes walkthroughCardPop {
  from {
    transform: scale(0.93) translateY(8px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.walkthrough-welcome-icon-outer {
  position: relative;
  width: 68px;
  height: 68px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.walkthrough-welcome-icon-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.2) 0%, rgba(13, 148, 136, 0) 70%);
  animation: walkthroughPulseGlow 3s ease-in-out infinite;
}

@keyframes walkthroughPulseGlow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
}

.walkthrough-welcome-icon-wrap {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
  border: 1.5px solid #99f6e4;
  color: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.walkthrough-welcome-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 13px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 600;
  background: #f0fdf4;
  color: #047857;
  border: 1px solid #bbf7d0;
  margin-bottom: 12px;
  letter-spacing: 0.01em;
}

.walkthrough-welcome-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  display: inline-block;
}

.walkthrough-welcome-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
  font-family: 'Poppins', sans-serif;
}

.walkthrough-welcome-text {
  margin: 0 auto 18px;
  font-size: 13.5px;
  line-height: 1.55;
  color: #475569;
  font-family: 'Poppins', sans-serif;
  max-width: 420px;
}

/* Feature highlight strip */
.walkthrough-welcome-highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 0 0 22px;
  padding: 12px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.walkthrough-welcome-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 2px;
}

.walkthrough-welcome-pill-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  color: #0d9488;
}

.walkthrough-welcome-pill-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
}

.walkthrough-welcome-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.walkthrough-welcome-btn-skip {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 22px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.walkthrough-welcome-btn-skip:hover {
  background: #f8fafc;
  color: #1e293b;
  border-color: #94a3b8;
}

.walkthrough-welcome-btn-start {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  padding: 9px 26px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 14px -1px rgba(13, 148, 136, 0.4), 0 2px 4px -1px rgba(13, 148, 136, 0.2);
  transition: all 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  outline: none;
}

.walkthrough-welcome-btn-start:hover {
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
  box-shadow: 0 6px 20px -1px rgba(13, 148, 136, 0.5);
  transform: translateY(-1px);
}

.walkthrough-welcome-btn-start:active {
  transform: translateY(0);
}

.walkthrough-welcome-footer-note {
  margin-top: 16px;
  font-size: 11.5px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
`;
