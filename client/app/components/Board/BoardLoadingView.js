'use client';

import { useState, useEffect } from 'react';
import PageLoader from '../PageLoader/PageLoader';

/**
 * Full-height board route loader with simulated progress (single fetch has no real %).
 * Progress eases toward ~93% while waiting; view unmounts when the board loads.
 */
export default function BoardLoadingView() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 93) return p;
        return Math.min(93, p + Math.max(0.35, (93 - p) * 0.065));
      });
    }, 72);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="board-loading">
      <div className="board-loading-card">
        <PageLoader message="Loading your board…" progress={progress} />
      </div>
    </div>
  );
}
