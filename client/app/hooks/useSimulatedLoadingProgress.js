import { useState, useEffect } from 'react';

/**
 * Eases progress toward ~93% while `active` (single fetch / cold start has no real %).
 * When loading completes, the view typically unmounts; progress resets when `active` is false.
 */
export function useSimulatedLoadingProgress(active) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return undefined;
    }

    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 93) return p;
        return Math.min(93, p + Math.max(0.35, (93 - p) * 0.065));
      });
    }, 72);

    return () => window.clearInterval(id);
  }, [active]);

  return progress;
}
