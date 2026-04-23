'use client';

import './PageLoader.css';

export default function PageLoader({
  message = 'Loading your boards…',
  compact = false,
  progress,
}) {
  const pct =
    typeof progress === 'number' && !Number.isNaN(progress)
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <div
      className={`page-loader${compact ? ' page-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="page-loader__mark" aria-hidden>
        <span className="page-loader__bar page-loader__bar--a" />
        <span className="page-loader__bar page-loader__bar--b" />
      </div>
      <p className="page-loader__message">{message}</p>
      {pct != null && (
        <div className="page-loader__progress" aria-hidden>
          <div className="page-loader__progress-track">
            <div className="page-loader__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="page-loader__pct">{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
}
