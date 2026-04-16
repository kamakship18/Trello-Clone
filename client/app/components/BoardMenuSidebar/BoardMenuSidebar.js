'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { updateBoard, uploadBoardBackground } from '../../api';
import { getFileUrl } from '../../lib/fileUrl';
import './BoardMenuSidebar.css';

/** Preset gradients (Photos) — stored as full CSS background string */
const PHOTO_GRADIENTS = [
  'linear-gradient(180deg, #1e3a5f 0%, #2d1f3d 50%, #4a1942 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(160deg, #8e6abf 0%, #cd8fbd 100%)',
];

/** Solid swatches (Colors section — smaller grid) */
const SOLID_COLORS = [
  '#0079bf', '#d29034', '#519839', '#b04632', '#89609e', '#cd5a91',
  '#4bbf6b', '#00aecc', '#838c91', '#ff991f', '#172b4d', '#602234',
];

/** Larger gradient tiles (Colors section — like Trello 2x2) */
const COLOR_GRADIENTS = [
  'linear-gradient(135deg, #135bec 0%, #7b2cbf 100%)',
  'linear-gradient(135deg, #ff6b35 0%, #f72585 100%)',
  'linear-gradient(135deg, #06d6a0 0%, #118ab2 100%)',
  'linear-gradient(135deg, #ffd166 0%, #ef476f 100%)',
];

function isGradient(bg) {
  return bg && (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient'));
}

function previewStyle(bg) {
  if (!bg) return { background: '#0079bf' };
  if (bg.startsWith('/uploads') || bg.startsWith('http')) {
    return { backgroundImage: `url(${bg.startsWith('http') ? bg : getFileUrl(bg)})`, backgroundSize: 'cover' };
  }
  if (isGradient(bg)) return { background: bg };
  return { background: bg };
}

export default function BoardMenuSidebar({ open, onClose, board, onBackgroundUpdated }) {
  const [view, setView] = useState('menu');
  const [busy, setBusy] = useState(false);
  const customFileRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setView('menu');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const applyBackground = useCallback(
    async (value) => {
      if (!board?.id) return;
      setBusy(true);
      try {
        await updateBoard(board.id, { background: value });
        onBackgroundUpdated?.();
      } catch (e) {
        console.error(e);
      } finally {
        setBusy(false);
      }
    },
    [board?.id, onBackgroundUpdated]
  );

  const onCustomUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !board?.id) return;
    setBusy(true);
    try {
      await uploadBoardBackground(board.id, f);
      onBackgroundUpdated?.();
      setView('menu');
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  if (!open) return null;

  const bg = board?.background || '';

  return (
    <>
      <div className="bms-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="bms-panel" role="dialog" aria-label={view === 'menu' ? 'Menu' : 'Change background'}>
        {view === 'menu' ? (
          <>
            <div className="bms-header">
              <span className="bms-header-title">Menu</span>
              <button type="button" className="bms-close" onClick={onClose} aria-label="Close menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bms-body">
              <button type="button" className="bms-row bms-row-share">
                <span className="bms-row-icon bms-avatar-sm">KP</span>
                <span>Share</span>
              </button>

              <div className="bms-divider" />

              <button type="button" className="bms-row bms-row-plain">
                <span>About this board</span>
              </button>
              <button type="button" className="bms-row bms-row-plain">
                <span>Visibility: Workspace</span>
              </button>
              <button type="button" className="bms-row bms-row-plain">
                <span>Print, export, and share</span>
              </button>
              <button type="button" className="bms-row bms-row-plain">
                <span>Star</span>
              </button>

              <div className="bms-divider" />

              <button type="button" className="bms-row bms-row-plain">
                <svg className="bms-row-lead-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                <span>Settings</span>
              </button>

              <button
                type="button"
                className="bms-row bms-row-change-bg"
                onClick={() => setView('background')}
              >
                <span className="bms-bg-preview-mini" style={previewStyle(bg)} />
                <span>Change background</span>
              </button>

              <button type="button" className="bms-row bms-row-plain">
                <span>Custom Fields</span>
              </button>

              <div className="bms-divider" />

              <button type="button" className="bms-row bms-row-plain">
                <span>Automation</span>
              </button>
              <button type="button" className="bms-row bms-row-plain">
                <span>Power-Ups</span>
              </button>
              <button type="button" className="bms-row bms-row-plain">
                <span>Labels</span>
              </button>
              <button type="button" className="bms-row bms-row-plain">
                <span>Activity</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bms-header bms-sub-header">
              <button type="button" className="bms-back" onClick={() => setView('menu')} aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="bms-header-title">Change background</span>
              <button type="button" className="bms-close" onClick={onClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bms-body bms-bg-body">
              <p className="bms-section-label">Photos</p>
              <div className="bms-grid bms-grid-photos">
                {PHOTO_GRADIENTS.slice(0, 4).map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`bms-tile ${bg === g ? 'selected' : ''}`}
                    style={{ background: g }}
                    onClick={() => applyBackground(g)}
                    disabled={busy}
                    aria-label={`Background ${i + 1}`}
                  >
                    {bg === g && <span className="bms-check">✓</span>}
                  </button>
                ))}
              </div>

              <p className="bms-section-label">Colors</p>
              <div className="bms-grid bms-grid-colors-lg">
                {COLOR_GRADIENTS.map((g, i) => (
                  <button
                    key={`cg-${i}`}
                    type="button"
                    className={`bms-tile bms-tile-lg ${bg === g ? 'selected' : ''}`}
                    style={{ background: g }}
                    onClick={() => applyBackground(g)}
                    disabled={busy}
                  >
                    {bg === g && <span className="bms-check">✓</span>}
                  </button>
                ))}
              </div>

              <div className="bms-grid bms-grid-solids">
                {SOLID_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`bms-swatch ${bg === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => applyBackground(c)}
                    disabled={busy}
                    aria-label={`Color ${c}`}
                  >
                    {bg === c && <span className="bms-check">✓</span>}
                  </button>
                ))}
              </div>

              <p className="bms-section-label">Custom</p>
              <input
                ref={customFileRef}
                type="file"
                accept="image/*"
                className="bms-file-hidden"
                onChange={onCustomUpload}
                disabled={busy}
              />
              <button
                type="button"
                className="bms-custom-upload"
                onClick={() => customFileRef.current?.click()}
                disabled={busy}
              >
                <span className="bms-custom-plus">+</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
