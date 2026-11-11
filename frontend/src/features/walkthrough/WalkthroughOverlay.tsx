import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { WalkthroughStep, WalkthroughPlacement } from './types';

interface WalkthroughOverlayProps {
  step: WalkthroughStep;
  moduleName: string;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish?: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipCoords {
  top: number;
  left: number;
}

function isElementVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  return true;
}

function queryPrioritySelector(selectorList?: string): HTMLElement | null {
  if (!selectorList) return null;
  const selectors = selectorList
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sel of selectors) {
    try {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isElementVisible);
      if (nodes.length === 0) continue;

      // Prefer elements not inside a loading skeleton if both exist
      const nonBusyNodes = nodes.filter((n) => !n.closest('[aria-busy="true"]'));
      const pool = nonBusyNodes.length > 0 ? nonBusyNodes : nodes;

      // If targeting map markers/clusters and multiple exist, pick the one closest to the map center
      if (
        sel.includes('bite-map-marker') ||
        sel.includes('cluster-icon') ||
        sel.includes('marker-icon')
      ) {
        const mapEl = document.querySelector<HTMLElement>(
          '.leaflet-container, [data-tour="bite-map-container"], [data-walkthrough="bitemap-map-view"]'
        );
        if (mapEl) {
          const mapRect = mapEl.getBoundingClientRect();
          const mapCenterX = mapRect.left + mapRect.width / 2;
          const mapCenterY = mapRect.top + mapRect.height / 2;

          const inBoundsNodes = pool.filter((n) => {
            const r = n.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            return (
              cx >= mapRect.left + 48 &&
              cx <= mapRect.right - 48 &&
              cy >= mapRect.top + 48 &&
              cy <= mapRect.bottom - 48
            );
          });

          const candidates = inBoundsNodes.length > 0 ? inBoundsNodes : pool;
          candidates.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const da = Math.hypot(ra.left + ra.width / 2 - mapCenterX, ra.top + ra.height / 2 - mapCenterY);
            const db = Math.hypot(rb.left + rb.width / 2 - mapCenterX, rb.top + rb.height / 2 - mapCenterY);
            return da - db;
          });
          return candidates[0];
        }
      }

      return pool[0];
    } catch {
      // Ignore invalid selector
    }
  }
  return null;
}

function scrollElementIntoOptimalView(el: HTMLElement, placement: WalkthroughPlacement): void {
  const vh = window.innerHeight;
  const pageContent = document.querySelector<HTMLElement>('.page-content');
  const sidebarNav = document.querySelector<HTMLElement>('.sidebar-nav');

  // If element is inside the sidebar navigation
  if (sidebarNav && sidebarNav.contains(el)) {
    const navRect = sidebarNav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < navRect.top + 8 || elRect.bottom > navRect.bottom - 8) {
      const targetScroll =
        sidebarNav.scrollTop + (elRect.top - navRect.top) - Math.max(16, (navRect.height - elRect.height) / 2);
      sidebarNav.scrollTop = Math.max(0, targetScroll);
    }
    return;
  }

  // If element is inside .page-content (the main scrollable workspace)
  if (pageContent && pageContent.contains(el)) {
    const containerRect = pageContent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const topHeaderBottom = Math.max(containerRect.top, 68);
    const maxScrollTop = Math.max(0, pageContent.scrollHeight - pageContent.clientHeight);
    const maxPossibleTop = elRect.top + pageContent.scrollTop; // elRect.top when scrollTop === 0
    const minPossibleTop = elRect.top - (maxScrollTop - pageContent.scrollTop); // elRect.top when scrollTop === maxScrollTop

    // Case 1: Medium/Large container (>= 180px tall) with 'left' or 'right' placement
    if (elRect.height >= 180 && (placement === 'left' || placement === 'right')) {
      if (elRect.top < topHeaderBottom + 12 || elRect.bottom > vh - 12) {
        const desiredTop = topHeaderBottom + 20;
        const delta = elRect.top - desiredTop;
        if (Math.abs(delta) > 8) {
          pageContent.scrollTop = Math.max(0, Math.min(maxScrollTop, pageContent.scrollTop + delta));
        }
      }
      return;
    }

    // Case 2: Medium/Large container (>= 180px tall) with 'top' tooltip placement
    if (elRect.height >= 180 && placement === 'top') {
      const desiredTopForAboveTooltip = Math.max(296, topHeaderBottom + 225);
      // Check if scrolling up can actually push elRect.top down to desiredTopForAboveTooltip
      if (maxPossibleTop >= desiredTopForAboveTooltip - 16) {
        const delta = elRect.top - desiredTopForAboveTooltip;
        if (Math.abs(delta) > 6) {
          pageContent.scrollTop = Math.max(0, Math.min(maxScrollTop, pageContent.scrollTop + delta));
        }
      } else {
        // Container is near the top of the document and cannot be pushed down far enough for 'top' tooltip;
        // scroll it up near topHeaderBottom so the tooltip fits cleanly BELOW it instead.
        const desiredTopForBelowTooltip = topHeaderBottom + 14;
        const delta = elRect.top - desiredTopForBelowTooltip;
        if (Math.abs(delta) > 6) {
          pageContent.scrollTop = Math.max(0, Math.min(maxScrollTop, pageContent.scrollTop + delta));
        }
      }
      return;
    }

    // Case 3: Medium/Large container (>= 180px tall) with 'bottom' placement
    if (elRect.height >= 180 && placement === 'bottom') {
      // If it already fits at current scroll with room for tooltip below, keep it steady
      if (elRect.top >= topHeaderBottom + 10 && elRect.bottom + 200 <= vh) {
        return;
      }
      const desiredTopForBelowTooltip = topHeaderBottom + 14;
      const projectedBottom = desiredTopForBelowTooltip + elRect.height;
      if (minPossibleTop <= desiredTopForBelowTooltip + 16 && projectedBottom + 195 <= vh) {
        const delta = elRect.top - desiredTopForBelowTooltip;
        if (Math.abs(delta) > 6) {
          pageContent.scrollTop = Math.max(0, Math.min(maxScrollTop, pageContent.scrollTop + delta));
        }
      } else {
        // Too tall or too close to bottom of document for 'bottom' tooltip; position for 'top' tooltip
        const desiredTopForAboveTooltip = Math.min(278, Math.max(topHeaderBottom + 204, Math.round(vh * 0.36)));
        const delta = elRect.top - desiredTopForAboveTooltip;
        if (Math.abs(delta) > 6) {
          pageContent.scrollTop = Math.max(0, Math.min(maxScrollTop, pageContent.scrollTop + delta));
        }
      }
      return;
    }

    // Case 4: Standard element (buttons, tabs, filter bars, rows)
    const topReserve = placement === 'top' ? 210 : 24;
    const bottomReserve = placement === 'bottom' ? 215 : 32;
    const safeTop = topHeaderBottom + topReserve;
    const safeBottom = vh - bottomReserve;

    if (elRect.top < safeTop || elRect.bottom > safeBottom) {
      let idealTop: number;
      if (safeTop <= safeBottom - elRect.height) {
        idealTop = safeTop + (safeBottom - safeTop - elRect.height) / 2;
      } else if (placement === 'top') {
        idealTop = topHeaderBottom + 198;
      } else {
        idealTop = topHeaderBottom + 18;
      }
      const delta = elRect.top - idealTop;
      pageContent.scrollTop = Math.max(0, Math.min(maxScrollTop, pageContent.scrollTop + delta));
    }
    return;
  }

  // Fallback for document/window scrolling
  const elRect = el.getBoundingClientRect();
  if (elRect.top < 84 || elRect.bottom > vh - 84) {
    el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  }
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  step,
  moduleName,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}) => {
  const handleFinish = onFinish ?? onSkip;
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<TooltipCoords>({ top: 120, left: 120 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const isFallbackRef = useRef<boolean>(false);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isRouteReady = location.pathname === step.route;

  const setActiveElement = useCallback((el: HTMLElement | null, isFallback = false) => {
    activeElementRef.current = el;
    isFallbackRef.current = isFallback;
  }, []);

  const computeLayoutFromElement = useCallback(
    (el: HTMLElement | null) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardEl = cardRef.current;
      const cardRect = cardEl ? cardEl.getBoundingClientRect() : null;
      const cardW = cardRect && cardRect.width > 0 ? cardRect.width : Math.min(360, vw - 32);
      const cardH = cardRect && cardRect.height > 0 ? cardRect.height : 182;
      const MARGIN = 16;
      const GAP = 14;

      if (!el || !document.body.contains(el) || !isElementVisible(el)) {
        setTargetRect(null);
        setTooltipCoords({
          top: Math.max(MARGIN, (vh - cardH) / 2),
          left: Math.max(MARGIN, (vw - cardW) / 2),
        });
        return;
      }

      const rawRect = el.getBoundingClientRect();
      const isDashboardOverview = step.id === 'dashboard-overview';
      const pageContent = document.querySelector<HTMLElement>('.page-content');
      const isInsidePageContent = Boolean(pageContent && pageContent.contains(el));
      const minSpotlightTop = isInsidePageContent ? 70 : 6;

      // Tighter padding for compact targets (buttons, tabs, markers), 8px for containers
      const isCompact = !isDashboardOverview && rawRect.width <= 240 && rawRect.height <= 68;
      const pad = isDashboardOverview ? 2 : isCompact ? 5 : 8;

      const rawTop = rawRect.top - pad;
      const rawLeft = rawRect.left - pad;
      const rawRight = rawRect.right + pad;
      const rawBottom = rawRect.bottom + pad;

      const sTop = Math.max(minSpotlightTop, Math.min(vh - 16, rawTop));
      const sLeft = Math.max(6, Math.min(vw - 16, rawLeft));
      const sRight = Math.max(sLeft + 16, Math.min(vw - 6, rawRight));
      const sBottom = Math.max(sTop + 16, Math.min(vh - 10, rawBottom));
      const sWidth = sRight - sLeft;
      const sHeight = sBottom - sTop;

      setTargetRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - sTop) < 1 &&
          Math.abs(prev.left - sLeft) < 1 &&
          Math.abs(prev.width - sWidth) < 1 &&
          Math.abs(prev.height - sHeight) < 1
        ) {
          return prev;
        }
        return { top: sTop, left: sLeft, width: sWidth, height: sHeight };
      });

      // Determine horizontal alignment for top/bottom placements
      const preferredHorizontalLeft =
        sWidth > 520
          ? sLeft + Math.min(48, Math.max(0, (sWidth - cardW) * 0.2))
          : sLeft + sWidth / 2 - cardW / 2;
      const clampedHorizontalLeft = Math.max(MARGIN, Math.min(vw - cardW - MARGIN, preferredHorizontalLeft));

      const preferredVerticalTop =
        sHeight > 360
          ? sTop + 24
          : sTop + sHeight / 2 - cardH / 2;
      // Keep tooltip below the 68px top header when inside the main content area
      const minTooltipTop = isInsidePageContent || sRight >= 60 ? 74 : MARGIN;
      const clampedVerticalTop = Math.max(minTooltipTop, Math.min(vh - cardH - MARGIN, preferredVerticalTop));

      const candidates: WalkthroughPlacement[] = [
        step.placement,
        'bottom',
        'top',
        'right',
        'left',
      ];

      let chosen: TooltipCoords | null = null;

      if (isFirstStep) {
        // Center the Step 1 walkthrough modal directly in the viewport
        const top = Math.max(MARGIN, Math.round((vh - cardH) / 2));
        const left = Math.max(MARGIN, Math.round((vw - cardW) / 2));
        chosen = { top, left };
      } else {
        for (const p of candidates) {
          if (p === 'bottom') {
            const top = sBottom + GAP;
            if (top + cardH <= vh - MARGIN) {
              chosen = { top, left: clampedHorizontalLeft };
              break;
            }
          } else if (p === 'top') {
            const top = sTop - cardH - GAP;
            if (top >= minTooltipTop) {
              chosen = { top, left: clampedHorizontalLeft };
              break;
            }
          } else if (p === 'right') {
            const left = sRight + GAP;
            if (left + cardW <= vw - MARGIN) {
              chosen = { top: clampedVerticalTop, left };
              break;
            }
          } else if (p === 'left') {
            const left = sLeft - cardW - GAP;
            if (left >= MARGIN) {
              chosen = { top: clampedVerticalTop, left };
              break;
            }
          }
        }

        if (!chosen) {
          const spaceAbove = sTop - minTooltipTop;
          const spaceBelow = vh - MARGIN - sBottom;
          const spaceLeft = sLeft - MARGIN;
          const spaceRight = vw - MARGIN - sRight;

          if (spaceAbove >= cardH - 16) {
            chosen = {
              top: Math.max(MARGIN, sTop - cardH - 10),
              left: clampedHorizontalLeft,
            };
          } else if (spaceBelow >= cardH - 16) {
            chosen = {
              top: Math.min(vh - cardH - MARGIN, sBottom + 10),
              left: clampedHorizontalLeft,
            };
          } else if (spaceLeft >= cardW + 8) {
            chosen = {
              top: clampedVerticalTop,
              left: Math.max(MARGIN, sLeft - cardW - 12),
            };
          } else if (spaceRight >= cardW + 8) {
            chosen = {
              top: clampedVerticalTop,
              left: Math.min(vw - cardW - MARGIN, sRight + 12),
            };
          } else {
            // Keep tooltip outside the highlighted box
            if (spaceBelow > spaceAbove) {
              chosen = {
                top: Math.min(vh - cardH - MARGIN, sBottom + 10),
                left: clampedHorizontalLeft,
              };
            } else {
              chosen = {
                top: Math.max(minTooltipTop, sTop - cardH - 10),
                left: clampedHorizontalLeft,
              };
            }
          }
        }
      }

      setTooltipCoords((prev) => {
        if (Math.abs(prev.top - chosen!.top) < 1 && Math.abs(prev.left - chosen!.left) < 1) {
          return prev;
        }
        return chosen!;
      });
    },
    [step.placement]
  );

  // Resolve target element and scroll into view when step or route changes
  useEffect(() => {
    if (!isRouteReady) {
      setActiveElement(null);
      setTargetRect(null);
      return;
    }

    // Reset scroll position to top when starting at the first step
    if (currentStepIndex === 0) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      const pageContent = document.querySelector<HTMLElement>('.page-content');
      if (pageContent) pageContent.scrollTop = 0;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const tryResolve = () => {
      if (cancelled) return;

      // If step targets an element inside a tab, trigger activateSelector first if not yet active
      if (step.activateSelector) {
        const tabEl = document.querySelector<HTMLElement>(step.activateSelector);
        if (tabEl && !tabEl.classList.contains('sd-dash-tab--active') && !tabEl.classList.contains('pm-tab-btn--active') && tabEl.getAttribute('aria-selected') !== 'true') {
          tabEl.click();
        }
      }

      const primaryEl = queryPrioritySelector(step.targetSelector);
      if (primaryEl) {
        const wasDifferent = activeElementRef.current !== primaryEl || isFallbackRef.current;
        setActiveElement(primaryEl, false);
        if (wasDifferent) {
          scrollElementIntoOptimalView(primaryEl, step.placement);
        }
        computeLayoutFromElement(primaryEl);
        return;
      }

      attempts += 1;
      const isPageLoading = Boolean(
        document.querySelector('[aria-busy="true"], .MuiCircularProgress-root, .pm-spinner')
      );

      if (attempts < maxAttempts && (isPageLoading || attempts < 6)) {
        timerId = setTimeout(tryResolve, 90);
        return;
      }

      const fallbackEl = queryPrioritySelector(step.fallbackSelector);
      if (fallbackEl) {
        if (activeElementRef.current !== fallbackEl) {
          setActiveElement(fallbackEl, true);
          scrollElementIntoOptimalView(fallbackEl, step.placement);
        }
        computeLayoutFromElement(fallbackEl);
        if (attempts < maxAttempts) {
          timerId = setTimeout(tryResolve, 120);
        }
      } else if (attempts < maxAttempts) {
        timerId = setTimeout(tryResolve, 100);
      } else {
        setActiveElement(null);
        computeLayoutFromElement(null);
      }
    };

    tryResolve();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [step, isRouteReady, computeLayoutFromElement, setActiveElement]);

  // Continuously keep spotlight & tooltip synced with scroll, resize, zoom, and async layout shifts
  useEffect(() => {
    if (!isRouteReady) return;

    const syncPosition = () => {
      const primaryEl = queryPrioritySelector(step.targetSelector);
      if (primaryEl) {
        const shouldScroll = activeElementRef.current !== primaryEl;
        setActiveElement(primaryEl, false);
        if (shouldScroll) {
          scrollElementIntoOptimalView(primaryEl, step.placement);
        }
      } else if (!activeElementRef.current || !document.body.contains(activeElementRef.current)) {
        const isPageLoading = Boolean(
          document.querySelector('[aria-busy="true"], .MuiCircularProgress-root, .pm-spinner')
        );
        if (!isPageLoading) {
          const fallbackEl = queryPrioritySelector(step.fallbackSelector);
          setActiveElement(fallbackEl, Boolean(fallbackEl));
        }
      }
      computeLayoutFromElement(activeElementRef.current);
    };

    window.addEventListener('scroll', syncPosition, { capture: true, passive: true });
    window.addEventListener('resize', syncPosition, { passive: true });
    window.visualViewport?.addEventListener('resize', syncPosition);
    window.visualViewport?.addEventListener('scroll', syncPosition);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        syncPosition();
      });
      resizeObserver.observe(document.body);
      const pageContent = document.querySelector('.page-content');
      if (pageContent) resizeObserver.observe(pageContent);
      if (activeElementRef.current) resizeObserver.observe(activeElementRef.current);
    }

    const intervalId = setInterval(syncPosition, 120);

    return () => {
      window.removeEventListener('scroll', syncPosition, { capture: true });
      window.removeEventListener('resize', syncPosition);
      window.visualViewport?.removeEventListener('resize', syncPosition);
      window.visualViewport?.removeEventListener('scroll', syncPosition);
      resizeObserver?.disconnect();
      clearInterval(intervalId);
    };
  }, [step, isRouteReady, computeLayoutFromElement]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight') {
        if (isLastStep) handleFinish();
        else onNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNext, onPrev, onSkip, handleFinish]);

  return (
    <div data-testid="walkthrough-overlay" role="dialog" aria-modal="true" aria-label={step.title}>
      {isFirstStep ? (
        <div
          className="walkthrough-backdrop-blur"
          data-testid="walkthrough-backdrop-blur"
          aria-hidden="true"
        />
      ) : (
        <svg className="walkthrough-backdrop-svg" aria-hidden="true">
          <defs>
            <mask id="walkthrough-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
                  ry="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.38)"
            mask="url(#walkthrough-spotlight-mask)"
          />
        </svg>
      )}

      {!isFirstStep && targetRect && (
        <div
          className="walkthrough-spotlight-glow"
          data-testid="walkthrough-spotlight"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
        />
      )}

      <div
        ref={cardRef}
        className="walkthrough-tooltip-card"
        data-testid="walkthrough-tooltip"
        style={{
          top: `${tooltipCoords.top}px`,
          left: `${tooltipCoords.left}px`,
        }}
      >
        <div className="walkthrough-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="walkthrough-step-badge" data-testid="walkthrough-module-badge">
              {step.module || moduleName}
            </span>
            {step.section && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#047857',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                {step.section}
              </span>
            )}
          </div>
          <span className="walkthrough-step-count" data-testid="walkthrough-step-counter">Step {currentStepIndex + 1} of {totalSteps}</span>
          <button
            type="button"
            className="walkthrough-close-btn"
            onClick={onSkip}
            title="Close tour"
            aria-label="Close tour"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="walkthrough-progress" role="progressbar" aria-label="Guide progress" aria-valuenow={currentStepIndex + 1} aria-valuemin={0} aria-valuemax={totalSteps}>
          {Array.from({ length: totalSteps }, (_, index) => <span key={index} className={index <= currentStepIndex ? 'done' : ''} />)}
        </div>

        <h3 className="walkthrough-title" data-testid="walkthrough-step-title">
          {step.title}
        </h3>
        <p className="walkthrough-content" data-testid="walkthrough-step-content">
          {step.content}
        </p>

        <div className="walkthrough-footer">
          <div className="walkthrough-footer-left">
            <button
              type="button"
              className="walkthrough-btn walkthrough-btn-skip"
              onClick={onSkip}
              data-testid="walkthrough-btn-skip"
            >
              Skip Tour
            </button>
          </div>

          <div className="walkthrough-footer-right">
            {!isFirstStep && (
              <button
                type="button"
                className="walkthrough-btn walkthrough-btn-back"
                onClick={onPrev}
                data-testid="walkthrough-btn-back"
              >
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                className="walkthrough-btn walkthrough-btn-primary"
                onClick={handleFinish}
                data-testid="walkthrough-btn-finish"
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                className="walkthrough-btn walkthrough-btn-primary"
                onClick={onNext}
                data-testid="walkthrough-btn-next"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughOverlay;
