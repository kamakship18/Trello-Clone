'use client';

import PageLoader from '../PageLoader/PageLoader';
import { useSimulatedLoadingProgress } from '../../hooks/useSimulatedLoadingProgress';

/**
 * Full-height board route loader with simulated progress (single fetch has no real %).
 * Progress eases toward ~93% while waiting; view unmounts when the board loads.
 */
export default function BoardLoadingView() {
  const progress = useSimulatedLoadingProgress(true);

  return (
    <div className="board-loading">
      <div className="board-loading-card">
        <PageLoader message="Loading your board…" progress={progress} />
      </div>
    </div>
  );
}
