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
  onRestart?: () => void;
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
  width?: number;
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

function scrollElementIntoOptimalView(
  el: HTMLElement,
  placement: WalkthroughPlacement,
  modalHeight = 230
): boolean {
  if (placement === 'center') return true;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
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
    return true;
  }

  const isInsidePageContent = Boolean(pageContent && pageContent.contains(el));
  const pageContentMaxScroll = pageContent
    ? Math.max(0, pageContent.scrollHeight - pageContent.clientHeight)
    : 0;
  const usePageContentScroll = isInsidePageContent && pageContentMaxScroll > 4;

  const containerRect = pageContent ? pageContent.getBoundingClientRect() : null;
  const elRect = el.getBoundingClientRect();
  const topHeaderBottom = isInsidePageContent
    ? Math.max(containerRect ? containerRect.top : 68, 70)
    : 70;

  const MODAL_HEIGHT = Math.max(180, Math.min(320, Math.ceil(modalHeight)));
  const SAFE_GAP = 16;
  const MARGIN = 16;
  const PAD = 8;
  const MODAL_WIDTH = 340;

  const currentScrollTop = usePageContentScroll
    ? pageContent!.scrollTop
    : window.scrollY || document.documentElement.scrollTop || 0;
  const maxScrollTop = usePageContentScroll
    ? pageContentMaxScroll
    : Math.max(0, document.documentElement.scrollHeight - vh);

  const applyScrollDelta = (delta: number): boolean => {
    if (Math.abs(delta) <= 6) return maxScrollTop > 0 || currentScrollTop > 0;
    const nextScroll = Math.max(0, Math.min(maxScrollTop, currentScrollTop + delta));
    if (usePageContentScroll) {
      pageContent!.scrollTop = nextScroll;
    } else {
      window.scrollTo({ top: nextScroll, behavior: 'auto' });
    }
    return maxScrollTop > 0 || nextScroll > 0;
  };

  // Check if space is available beside the element (left or right)
  const fitsRight = vw - elRect.right >= MODAL_WIDTH + SAFE_GAP + MARGIN;
  const fitsLeft = elRect.left >= MODAL_WIDTH + SAFE_GAP + MARGIN;
  const fitsBeside = fitsRight || fitsLeft;
  const usableHeight = (vh - MARGIN) - topHeaderBottom;
  const isTallElement = elRect.height + 2 * PAD > usableHeight - MODAL_HEIGHT - SAFE_GAP;

  // Case 1: Beside placement (explicitly requested 'left' or 'right')
  if ((placement === 'left' || placement === 'right') && fitsBeside && elRect.height < usableHeight) {
    if (elRect.top < topHeaderBottom + 12 || elRect.bottom > vh - 12) {
      const idealTop = topHeaderBottom + Math.max(16, (usableHeight - elRect.height) / 2);
      return applyScrollDelta(elRect.top - idealTop);
    }
    return maxScrollTop > 0 || currentScrollTop > 0;
  }

  // Case 2: Tall elements or explicit 'top' placement:
  // Reserve full clearance ABOVE the highlighted section so the modal sits cleanly above without overlapping.
  if (placement === 'top' || isTallElement) {
    const desiredTop = topHeaderBottom + MODAL_HEIGHT + SAFE_GAP + PAD + 8;
    const deltaForTop = elRect.top - desiredTop;
    const clampedTopScroll = Math.max(0, Math.min(maxScrollTop, currentScrollTop + deltaForTop));
    const resultingElTop = elRect.top - (clampedTopScroll - currentScrollTop);

    // If scrolling up gives enough space above the element, use it
    if (resultingElTop - PAD >= topHeaderBottom + MODAL_HEIGHT + SAFE_GAP - 4) {
      return applyScrollDelta(deltaForTop);
    }

    // Otherwise try scrolling down so the modal fits cleanly below the element
    const desiredBottom = vh - MARGIN - MODAL_HEIGHT - SAFE_GAP - PAD;
    const deltaForBottom = elRect.bottom - desiredBottom;
    const clampedBottomScroll = Math.max(0, Math.min(maxScrollTop, currentScrollTop + deltaForBottom));
    const resultingElBottom = elRect.bottom - (clampedBottomScroll - currentScrollTop);
    if (resultingElBottom + PAD + SAFE_GAP + MODAL_HEIGHT <= vh - MARGIN + 4) {
      return applyScrollDelta(deltaForBottom);
    }

    return applyScrollDelta(deltaForTop);
  }

  // Case 3: Elements with placement 'bottom' or 'auto' (that fit above a bottom modal):
  // Position element near sticky header so modal has maximum clearance below it.
  const minElTop = topHeaderBottom + 10;
  const maxElBottom = (vh - MARGIN) - MODAL_HEIGHT - SAFE_GAP - PAD;
  let desiredTop = minElTop;
  if (minElTop + elRect.height > maxElBottom && maxElBottom - elRect.height >= topHeaderBottom) {
    desiredTop = Math.max(topHeaderBottom, maxElBottom - elRect.height);
  }
  return applyScrollDelta(elRect.top - desiredTop);
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  step,
  moduleName,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onRestart,
  onFinish,
}) => {
  const handleFinish = onFinish ?? onSkip;
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<TooltipCoords>({ top: 120, left: 120 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const isFallbackRef = useRef<boolean>(false);
  const stepScrolledRef = useRef<string | null>(null);

  useEffect(() => {
    stepScrolledRef.current = null;
  }, [step.id]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isRouteReady = location.pathname === step.route;
  const isCenteredModal = isFirstStep || step.placement === 'center';

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
      const isCentered = isFirstStep || step.placement === 'center';
      const defaultCardW = isCentered ? Math.min(380, vw - 32) : Math.min(332, vw - 32);
      const cardH = cardRect && cardRect.height > 0 ? cardRect.height : 220;
      const MARGIN = 16;
      const SAFE_GAP = 16;

      if (!el || !document.body.contains(el) || !isElementVisible(el)) {
        setTargetRect((prev) => (prev === null ? null : null));
        const centeredTop = Math.max(MARGIN, Math.round((vh - cardH) / 2));
        const centeredLeft = Math.max(MARGIN, Math.round((vw - defaultCardW) / 2));
        setTooltipCoords((prev) => {
          if (
            Math.abs(prev.top - centeredTop) < 1 &&
            Math.abs(prev.left - centeredLeft) < 1 &&
            prev.width === undefined
          ) {
            return prev;
          }
          return { top: centeredTop, left: centeredLeft };
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

      // True, immutable target spotlight boundaries - NEVER crop or truncate
      const sTop = Math.max(minSpotlightTop, Math.min(vh - 16, rawTop));
      const sLeft = Math.max(6, Math.min(vw - 16, rawLeft));
      const sRight = Math.max(sLeft + 16, Math.min(vw - 6, rawRight));
      const sBottom = Math.max(sTop + 16, Math.min(vh - 10, rawBottom));
      const sHeight = sBottom - sTop;
      const sWidth = sRight - sLeft;

      // Keep tooltip below fixed top app header when inside the main content area
      const minTooltipTop = isInsidePageContent
        ? Math.max(pageContent ? pageContent.getBoundingClientRect().top : 68, 70)
        : MARGIN;

      // Determine horizontal alignment for top/bottom placements
      const preferredHorizontalLeft =
        sWidth > 520
          ? sLeft + Math.min(48, Math.max(0, (sWidth - defaultCardW) * 0.2))
          : sLeft + sWidth / 2 - defaultCardW / 2;
      const clampedHorizontalLeft = Math.max(MARGIN, Math.min(vw - defaultCardW - MARGIN, preferredHorizontalLeft));

      const preferredVerticalTop =
        sHeight > 360
          ? sTop + 24
          : sTop + sHeight / 2 - cardH / 2;
      const clampedVerticalTop = Math.max(minTooltipTop, Math.min(vh - cardH - MARGIN, preferredVerticalTop));

      // Helper to check if modal overlaps the highlighted spotlight bounding box
      const overlapsSpotlight = (top: number, left: number, width: number, gap = SAFE_GAP): boolean => {
        const mTop = top;
        const mBottom = top + cardH;
        const mLeft = left;
        const mRight = left + width;
        return !(
          mRight <= sLeft - gap ||
          mLeft >= sRight + gap ||
          mBottom <= sTop - gap ||
          mTop >= sBottom + gap
        );
      };

      let chosen: TooltipCoords | null = null;
      let effectiveCardW = defaultCardW;
      let effectiveMargin = MARGIN;

      if (isCentered) {
        // Center the walkthrough modal directly in the viewport
        const top = Math.max(MARGIN, Math.round((vh - cardH) / 2));
        const left = Math.max(MARGIN, Math.round((vw - defaultCardW) / 2));
        chosen = { top, left };
      } else {
        const spaceAbove = sTop - minTooltipTop;
        const spaceAboveFull = sTop - MARGIN;
        const spaceBelow = vh - sBottom - MARGIN;
        const spaceRight = vw - sRight - MARGIN;
        const spaceLeft = sLeft - MARGIN;

        const fitsRight = spaceRight >= defaultCardW + SAFE_GAP && vh - 2 * MARGIN >= cardH;
        const fitsLeft = spaceLeft >= defaultCardW + SAFE_GAP && vh - 2 * MARGIN >= cardH;
        const fitsBelow = spaceBelow >= cardH + SAFE_GAP;
        const fitsAbove = spaceAbove >= cardH + SAFE_GAP;
        const fitsAboveFull = spaceAboveFull >= cardH + SAFE_GAP;

        // Compact beside placement when full-width top/bottom/left/right cannot fit without clipping
        const COMPACT_MARGIN = 8;
        const COMPACT_GAP = 10;
        const MIN_COMPACT_W = 236;
        const compactLeftAvail = sLeft - COMPACT_MARGIN - COMPACT_GAP;
        const compactRightAvail = vw - sRight - COMPACT_MARGIN - COMPACT_GAP;
        const fitsCompactLeft = compactLeftAvail >= MIN_COMPACT_W && vh - 2 * COMPACT_MARGIN >= cardH;
        const fitsCompactRight = compactRightAvail >= MIN_COMPACT_W && vh - 2 * COMPACT_MARGIN >= cardH;

        type PlacementChoice = 'bottom' | 'top' | 'top-full' | 'right' | 'left' | 'compact-left' | 'compact-right';
        let chosenPlacement: PlacementChoice | null = null;

        if (step.placement === 'auto') {
          if (fitsAbove && spaceAbove >= spaceBelow) chosenPlacement = 'top';
          else if (fitsBelow) chosenPlacement = 'bottom';
          else if (fitsAbove) chosenPlacement = 'top';
          else if (fitsRight) chosenPlacement = 'right';
          else if (fitsLeft) chosenPlacement = 'left';
          else if (fitsAboveFull) chosenPlacement = 'top-full';
        } else if (step.placement === 'right') {
          if (fitsRight) chosenPlacement = 'right';
          else if (fitsLeft) chosenPlacement = 'left';
          else if (fitsBelow) chosenPlacement = 'bottom';
          else if (fitsAbove) chosenPlacement = 'top';
          else if (fitsAboveFull) chosenPlacement = 'top-full';
        } else if (step.placement === 'left') {
          if (fitsLeft) chosenPlacement = 'left';
          else if (fitsRight) chosenPlacement = 'right';
          else if (fitsBelow) chosenPlacement = 'bottom';
          else if (fitsAbove) chosenPlacement = 'top';
          else if (fitsAboveFull) chosenPlacement = 'top-full';
        } else if (step.placement === 'top') {
          if (fitsAbove) chosenPlacement = 'top';
          else if (fitsBelow) chosenPlacement = 'bottom';
          else if (fitsRight) chosenPlacement = 'right';
          else if (fitsLeft) chosenPlacement = 'left';
          else if (fitsAboveFull) chosenPlacement = 'top-full';
        } else {
          // Default or 'bottom'
          if (fitsBelow) chosenPlacement = 'bottom';
          else if (fitsAbove) chosenPlacement = 'top';
          else if (fitsRight) chosenPlacement = 'right';
          else if (fitsLeft) chosenPlacement = 'left';
          else if (fitsAboveFull) chosenPlacement = 'top-full';
        }

        // If no full-width placement fits cleanly inside the viewport, use beside compact placement if available
        if (!chosenPlacement) {
          if (fitsCompactLeft || fitsCompactRight) {
            chosenPlacement =
              fitsCompactRight && (!fitsCompactLeft || compactRightAvail >= compactLeftAvail)
                ? 'compact-right'
                : 'compact-left';
          } else {
            chosenPlacement = spaceBelow >= spaceAboveFull ? 'bottom' : 'top';
          }
        }

        if (chosenPlacement === 'compact-left') {
          const compactW = Math.min(defaultCardW, Math.floor(compactLeftAvail));
          effectiveCardW = compactW;
          effectiveMargin = COMPACT_MARGIN;
          const top = Math.max(
            COMPACT_MARGIN,
            Math.min(vh - cardH - COMPACT_MARGIN, Math.round(sTop + (sHeight - cardH) / 2))
          );
          const left = Math.max(COMPACT_MARGIN, sLeft - compactW - COMPACT_GAP);
          chosen = { top, left, width: compactW };
        } else if (chosenPlacement === 'compact-right') {
          const compactW = Math.min(defaultCardW, Math.floor(compactRightAvail));
          effectiveCardW = compactW;
          effectiveMargin = COMPACT_MARGIN;
          const top = Math.max(
            COMPACT_MARGIN,
            Math.min(vh - cardH - COMPACT_MARGIN, Math.round(sTop + (sHeight - cardH) / 2))
          );
          const left = Math.min(vw - compactW - COMPACT_MARGIN, sRight + COMPACT_GAP);
          chosen = { top, left, width: compactW };
        } else if (chosenPlacement === 'bottom') {
          const top = sBottom + SAFE_GAP;
          chosen = { top, left: clampedHorizontalLeft };

          // If modal extends below the viewport bottom, scroll pageContent down if possible
          if (pageContent && top + cardH > vh - MARGIN) {
            const overflow = top + cardH - (vh - MARGIN);
            const maxScroll = Math.max(0, pageContent.scrollHeight - pageContent.clientHeight);
            if (overflow > 4 && pageContent.scrollTop < maxScroll) {
              pageContent.scrollTop = Math.min(maxScroll, pageContent.scrollTop + overflow + 16);
            }
          }
        } else if (chosenPlacement === 'top' || chosenPlacement === 'top-full') {
          const top = sTop - cardH - SAFE_GAP;
          chosen = { top, left: clampedHorizontalLeft };

          // If modal extends above minTooltipTop, scroll pageContent up if possible
          if (chosenPlacement === 'top' && pageContent && top < minTooltipTop && pageContent.scrollTop > 0) {
            const underflow = minTooltipTop - top;
            if (underflow > 4) {
              pageContent.scrollTop = Math.max(0, pageContent.scrollTop - underflow - 16);
            }
          }
        } else if (chosenPlacement === 'right') {
          chosen = { top: clampedVerticalTop, left: sRight + SAFE_GAP };
        } else {
          chosen = { top: clampedVerticalTop, left: sLeft - defaultCardW - SAFE_GAP };
        }

        // Strict viewport clamping so tooltip & navigation buttons NEVER overflow off-screen
        if (chosen) {
          chosen.left = Math.max(effectiveMargin, Math.min(vw - effectiveCardW - effectiveMargin, chosen.left));
          chosen.top = Math.max(effectiveMargin, Math.min(vh - cardH - effectiveMargin, chosen.top));

          // Non-overlap check: try all non-overlapping sides that fit cleanly inside the viewport
          const usedGap = chosen.width ? COMPACT_GAP : SAFE_GAP;
          if (overlapsSpotlight(chosen.top, chosen.left, effectiveCardW, usedGap)) {
            const aboveTop = sTop - cardH - SAFE_GAP;
            const belowTop = sBottom + SAFE_GAP;
            const rightLeft = sRight + SAFE_GAP;
            const leftLeft = sLeft - defaultCardW - SAFE_GAP;

            if (aboveTop >= effectiveMargin && !overlapsSpotlight(aboveTop, chosen.left, effectiveCardW, SAFE_GAP)) {
              chosen.top = aboveTop;
            } else if (
              belowTop + cardH <= vh - effectiveMargin &&
              !overlapsSpotlight(belowTop, chosen.left, effectiveCardW, SAFE_GAP)
            ) {
              chosen.top = belowTop;
            } else if (
              rightLeft + defaultCardW <= vw - MARGIN &&
              !overlapsSpotlight(clampedVerticalTop, rightLeft, defaultCardW, SAFE_GAP)
            ) {
              chosen = { top: clampedVerticalTop, left: rightLeft };
            } else if (
              leftLeft >= MARGIN &&
              !overlapsSpotlight(clampedVerticalTop, leftLeft, defaultCardW, SAFE_GAP)
            ) {
              chosen = { top: clampedVerticalTop, left: leftLeft };
            } else if (fitsCompactLeft || fitsCompactRight) {
              const useRight = fitsCompactRight && (!fitsCompactLeft || compactRightAvail >= compactLeftAvail);
              const compactW = Math.min(defaultCardW, Math.floor(useRight ? compactRightAvail : compactLeftAvail));
              const compactTop = Math.max(
                COMPACT_MARGIN,
                Math.min(vh - cardH - COMPACT_MARGIN, Math.round(sTop + (sHeight - cardH) / 2))
              );
              const compactLeft = useRight
                ? Math.min(vw - compactW - COMPACT_MARGIN, sRight + COMPACT_GAP)
                : Math.max(COMPACT_MARGIN, sLeft - compactW - COMPACT_GAP);
              chosen = { top: compactTop, left: compactLeft, width: compactW };
            }
          }
        }
      }

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

      setTooltipCoords((prev) => {
        if (
          Math.abs(prev.top - chosen!.top) < 1 &&
          Math.abs(prev.left - chosen!.left) < 1 &&
          prev.width === chosen!.width
        ) {
          return prev;
        }
        return chosen!;
      });
    },
    [isFirstStep, step.id, step.placement]
  );

  // Resolve target element and scroll into view when step or route changes
  useEffect(() => {
    if (!isRouteReady) {
      setActiveElement(null);
      setTargetRect(null);
      return;
    }

    // Reset scroll position to top when starting at the first step or centered modal
    if (currentStepIndex === 0 || step.placement === 'center') {
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

      // If step targets an element inside a tab or subtab, trigger activateSelector first if not yet active
      if (step.activateSelector) {
        const selectors = step.activateSelector.split(',').map((s) => s.trim()).filter(Boolean);
        for (const selector of selectors) {
          const tabEl = document.querySelector<HTMLElement>(selector);
          if (
            tabEl &&
            !tabEl.classList.contains('sd-dash-tab--active') &&
            !tabEl.classList.contains('pm-tab-btn--active') &&
            !tabEl.classList.contains('MuiButton-contained') &&
            tabEl.getAttribute('aria-selected') !== 'true'
          ) {
            tabEl.click();
          }
        }
      }

      if (step.id === 'bitemap-markers') {
        window.dispatchEvent(new CustomEvent('abtc:bitemap-show-pins-popup'));
      }

      const primaryEl = queryPrioritySelector(step.targetSelector);
      if (primaryEl) {
        const wasDifferent = activeElementRef.current !== primaryEl || isFallbackRef.current;
        setActiveElement(primaryEl, false);
        if (wasDifferent || stepScrolledRef.current !== step.id) {
          const measuredCardH = cardRef.current?.getBoundingClientRect().height || 230;
          const didScroll = scrollElementIntoOptimalView(primaryEl, step.placement, measuredCardH);
          if (didScroll) stepScrolledRef.current = step.id;
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
        const isElementNew = activeElementRef.current !== primaryEl;
        setActiveElement(primaryEl, false);
        if (isElementNew || stepScrolledRef.current !== step.id) {
          const didScroll = scrollElementIntoOptimalView(primaryEl, step.placement);
          if (didScroll) stepScrolledRef.current = step.id;
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
    let observedTarget: HTMLElement | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        syncPosition();
      });
      resizeObserver.observe(document.body);
      const pageContent = document.querySelector('.page-content');
      if (pageContent) resizeObserver.observe(pageContent);
      if (activeElementRef.current) {
        observedTarget = activeElementRef.current;
        resizeObserver.observe(observedTarget);
      }
      if (cardRef.current) resizeObserver.observe(cardRef.current);
    }

    const syncWithTargetObserve = () => {
      syncPosition();
      if (resizeObserver && activeElementRef.current && activeElementRef.current !== observedTarget) {
        if (observedTarget) resizeObserver.unobserve(observedTarget);
        observedTarget = activeElementRef.current;
        resizeObserver.observe(observedTarget);
      }
    };

    const intervalId = setInterval(syncWithTargetObserve, 120);

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

  const handleSpotlightHoleClick = (e: React.MouseEvent) => {
    if (!targetRect) return;
    const x = e.clientX;
    const y = e.clientY;
    if (
      x >= targetRect.left &&
      x <= targetRect.left + targetRect.width &&
      y >= targetRect.top &&
      y <= targetRect.top + targetRect.height
    ) {
      const elements = document.elementsFromPoint(x, y);
      const target = elements.find(
        (el) =>
          !el.closest('[data-testid="walkthrough-overlay"]') &&
          !el.classList.contains('walkthrough-spotlight-glow') &&
          !el.classList.contains('walkthrough-backdrop-svg')
      );
      if (target && target instanceof HTMLElement) {
        target.click();
      }
      return;
    }
  };

  return (
    <div data-testid="walkthrough-overlay" role="dialog" aria-modal="true" aria-label={step.title}>
      {isCenteredModal ? (
        <div
          className="walkthrough-backdrop-blur"
          data-testid="walkthrough-backdrop-blur"
          aria-hidden="true"
        />
      ) : (
        <svg className="walkthrough-backdrop-svg" aria-hidden="true" onClick={handleSpotlightHoleClick}>
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

      {!isCenteredModal && targetRect && (
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
        className={`walkthrough-tooltip-card ${isCenteredModal ? 'walkthrough-tooltip-card--center' : ''} ${
          tooltipCoords.width && tooltipCoords.width < 310 ? 'walkthrough-tooltip-card--compact' : ''
        }`}
        data-testid="walkthrough-tooltip"
        data-walkthrough-module={step.module || moduleName}
        style={{
          top: `${tooltipCoords.top}px`,
          left: `${tooltipCoords.left}px`,
          ...(tooltipCoords.width ? { width: `${tooltipCoords.width}px` } : {}),
        }}
      >
        <div className="walkthrough-header">
          <span className="walkthrough-step-badge" data-testid="walkthrough-module-badge">
            {step.module || moduleName}
          </span>
          <div className="walkthrough-header-meta">
            <span className="walkthrough-step-count" data-testid="walkthrough-step-counter">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
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
        </div>
        {step.section && (
          <div className="walkthrough-section-row">
            <span className="walkthrough-section-badge">{step.section}</span>
          </div>
        )}
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
            {onRestart && currentStepIndex > 0 && (
              <button
                type="button"
                className="walkthrough-btn walkthrough-btn-restart-inline"
                onClick={onRestart}
                data-testid="walkthrough-btn-restart"
                title="Restart this guide from Step 1"
              >
                Restart
              </button>
            )}
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
