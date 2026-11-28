import { useEffect, useRef, useState } from 'react';

/**
 * Triggers chart animations when the chart container scrolls into the viewport.
 * Respects `prefers-reduced-motion`: if reduced motion is preferred, stays visible immediately.
 */
export function useChartInView<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; replayOnReenter?: boolean } = {}
) {
  const { threshold = 0.2, replayOnReenter = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return true;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            setInView(true);
            if (!replayOnReenter) {
              observer.unobserve(entry.target);
            }
          } else if (replayOnReenter && !entry.isIntersecting) {
            setInView(false);
          }
        }
      },
      { threshold: [0, threshold] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, replayOnReenter]);

  return { ref, inView };
}
