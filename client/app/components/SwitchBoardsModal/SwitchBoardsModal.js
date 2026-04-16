'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchBoards } from '../../api';
import { getBoardThumbStyle } from '../../lib/boardThumbStyle';
import PageLoader from '../PageLoader/PageLoader';
import './SwitchBoardsModal.css';

const WORKSPACE_LABEL = 'Trello Workspace';

function BoardMiniTile({ board, isCurrent, onSelect }) {
  const thumbStyle = getBoardThumbStyle(board.background);

  return (
    <button
      type="button"
      className={`sb-tile ${isCurrent ? 'sb-tile--current' : ''}`}
      onClick={() => onSelect(board.id)}
    >
      <div className="sb-tile-thumb" style={thumbStyle} />
      <div className="sb-tile-footer">
        <span className="sb-tile-title">{board.title}</span>
      </div>
    </button>
  );
}

export default function SwitchBoardsModal({
  open,
  onClose,
  currentBoardId,
  onSelectBoard,
}) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const searchInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBoards();
      setBoards(res.data || []);
    } catch (e) {
      console.error(e);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setSearch('');
      setFilterTab('all');
    }
  }, [open, load]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = boards;
    if (filterTab === 'workspace') {
      list = boards;
    }
    if (!q) return list;
    return list.filter((b) => (b.title || '').toLowerCase().includes(q));
  }, [boards, search, filterTab]);

  const recentBoards = useMemo(() => filtered.slice(0, 6), [filtered]);

  const handlePick = (id) => {
    onSelectBoard(id);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="sb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="sb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sb-title" className="sb-sr-only">
          Switch boards
        </h2>

        <div className="sb-toolbar">
          <div className="sb-search-wrap">
            <svg className="sb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              className="sb-search-input"
              placeholder="Search your boards"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="sb-toolbar-actions">
            <button
              type="button"
              className={`sb-icon-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              title="List view"
              aria-label="List view"
              onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button type="button" className="sb-icon-btn" title="Pin" aria-label="Pin">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 17v5" />
                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2v3.76z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="sb-tabs">
          <button
            type="button"
            className={`sb-tab ${filterTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`sb-tab ${filterTab === 'workspace' ? 'is-active' : ''}`}
            onClick={() => setFilterTab('workspace')}
          >
            {WORKSPACE_LABEL}
          </button>
        </div>

        <div className={`sb-body ${viewMode === 'list' ? 'sb-body--list' : ''}`}>
          {loading ? (
            <PageLoader compact message="Loading boards…" />
          ) : (
            <>
              <section className="sb-section" aria-label="Recent boards">
                <div className="sb-section-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Recent</span>
                </div>
                {recentBoards.length === 0 ? (
                  <p className="sb-empty">No boards match your search.</p>
                ) : (
                  <div className="sb-grid">
                    {recentBoards.map((b) => (
                      <BoardMiniTile
                        key={`r-${b.id}`}
                        board={b}
                        isCurrent={b.id === currentBoardId}
                        onSelect={handlePick}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="sb-section sb-workspace" aria-label={WORKSPACE_LABEL}>
                <button
                  type="button"
                  className="sb-workspace-toggle"
                  onClick={() => setWorkspaceOpen((o) => !o)}
                  aria-expanded={workspaceOpen}
                >
                  <svg
                    className={`sb-chevron ${workspaceOpen ? 'open' : ''}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span>{WORKSPACE_LABEL}</span>
                </button>
                {workspaceOpen && (
                  <div className="sb-grid">
                    {filtered.map((b) => (
                      <BoardMiniTile
                        key={`w-${b.id}`}
                        board={b}
                        isCurrent={b.id === currentBoardId}
                        onSelect={handlePick}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
