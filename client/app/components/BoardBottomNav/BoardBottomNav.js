'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './BoardBottomNav.css';

const COMING_SOON_MSG =
  'Inbox and Planner are on the roadmap and will be available in a future update.';

export default function BoardBottomNav({ onSwitchBoards }) {
  const [toast, setToast] = useState(null);
  const hideTimer = useRef(null);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const showComingSoon = useCallback(() => {
    setToast(COMING_SOON_MSG);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(dismissToast, 4200);
  }, [dismissToast]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!toast) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dismissToast();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toast, dismissToast]);

  return (
    <>
      {toast && (
        <div className="bbn-toast-backdrop" onClick={dismissToast} aria-hidden />
      )}
      {toast && (
        <div className="bbn-toast" role="status" aria-live="polite">
          <p className="bbn-toast-title">Coming soon</p>
          <p className="bbn-toast-body">{toast}</p>
          <button type="button" className="bbn-toast-dismiss" onClick={dismissToast}>
            OK
          </button>
        </div>
      )}
      <nav className="board-bottom-nav" aria-label="Workspace navigation">
      <button type="button" className="bbn-item" onClick={showComingSoon} aria-label="Inbox — coming soon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <span>Inbox</span>
      </button>
      <button type="button" className="bbn-item" onClick={showComingSoon} aria-label="Planner — coming soon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Planner</span>
      </button>
      <button type="button" className="bbn-item bbn-item-active" aria-current="page">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
        <span>Board</span>
      </button>
      <button
        type="button"
        className="bbn-item"
        onClick={() => onSwitchBoards?.()}
        aria-haspopup="dialog"
        aria-label="Switch boards"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="13" height="13" rx="2" />
          <rect x="3" y="3" width="13" height="13" rx="2" />
        </svg>
        <span>Switch boards</span>
      </button>
    </nav>
    </>
  );
}
