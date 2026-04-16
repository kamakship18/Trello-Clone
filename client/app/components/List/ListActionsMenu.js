'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchBoards,
  updateList,
  copyList,
  moveListToBoard,
  moveAllCardsInList,
  sortListCards,
  archiveAllCardsInList,
} from '../../api';
import { useBoard } from '../../context/BoardContext';
import './ListActionsMenu.css';

const LIST_COLORS = [
  { hex: '#61bd4f' },
  { hex: '#f2d600' },
  { hex: '#ff9f1a' },
  { hex: '#eb5a46' },
  { hex: '#c377e0' },
  { hex: '#0079bf' },
  { hex: '#00c2e0' },
  { hex: '#51e898' },
  { hex: '#ff78cb' },
  { hex: '#b3bec5' },
];

const WATCH_PREFIX = 'trello_list_watch_';

function readWatch(listId) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(`${WATCH_PREFIX}${listId}`) === '1';
}

function writeWatch(listId, on) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${WATCH_PREFIX}${listId}`, on ? '1' : '0');
}

function normalizeAutomation(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return { ...raw };
}

const POPOVER_WIDTH = 304;

export default function ListActionsMenu({ list, boardId, lists, onAddCard }) {
  const { loadBoard, board } = useBoard();
  const [open, setOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(true);
  const [automationOpen, setAutomationOpen] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [watched, setWatched] = useState(false);
  const [modal, setModal] = useState(null);
  const wrapRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !open) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxPopHeight = Math.min(vh * 0.82, 640);

    // Prefer beside the list: open to the right of the trigger; if not enough room, open to the left
    let left = r.right + gap;
    if (left + POPOVER_WIDTH > vw - margin) {
      left = r.left - POPOVER_WIDTH - gap;
    }
    left = Math.max(margin, Math.min(left, vw - POPOVER_WIDTH - margin));

    // Align vertically with the header actions (beside the column), clamp so the menu stays in view
    let top = r.top;
    if (top + maxPopHeight > vh - margin) {
      top = Math.max(margin, vh - margin - maxPopHeight);
    }
    if (top < margin) top = margin;

    setPopoverPos({ top, left });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPos(null);
      return;
    }
    updatePopoverPosition();
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [open, updatePopoverPosition]);

  const refresh = useCallback(() => {
    if (board?.id) loadBoard(board.id, { silent: true });
  }, [board?.id, loadBoard]);

  useEffect(() => {
    setWatched(readWatch(list.id));
  }, [list.id]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      const t = e.target;
      if (typeof t?.closest === 'function' && t.closest('.list-actions-popover')) return;
      setOpen(false);
      setSortOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const automation = normalizeAutomation(list.automation);

  const handleSetColor = async (hex) => {
    try {
      await updateList(list.id, { header_color: hex });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveColor = async () => {
    try {
      await updateList(list.id, { header_color: '' });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleWatch = () => {
    const next = !watched;
    writeWatch(list.id, next);
    setWatched(next);
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('trelloListWatchChanged', { detail: { listId: list.id } })
      );
    }
  };

  const handleSort = async (sort_by) => {
    try {
      await sortListCards(list.id, { sort_by });
      setSortOpen(false);
      setOpen(false);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveList = async () => {
    if (!window.confirm(`Archive list "${list.title}"?`)) return;
    try {
      await updateList(list.id, { is_archived: true });
      setOpen(false);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveAllCards = async () => {
    if (!window.confirm('Archive all cards in this list?')) return;
    try {
      await archiveAllCardsInList(list.id);
      setOpen(false);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const openMoveListModal = () => {
    setOpen(false);
    setModal('moveList');
  };

  const openCopyModal = () => {
    setOpen(false);
    setModal('copy');
  };

  const openMoveAllModal = () => {
    setOpen(false);
    setModal('moveAll');
  };

  const openAutomationModal = (mode) => {
    setOpen(false);
    setModal(mode);
  };

  return (
    <>
      <div className="list-actions-outer" ref={wrapRef}>
        <button
          type="button"
          className="list-move-trigger"
          aria-label="Move list"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            setSortOpen(false);
            openMoveListModal();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>
        <button
          type="button"
          className={`list-actions-trigger ${open ? 'is-active' : ''}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

      </div>

      {mounted &&
        open &&
        popoverPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="list-actions-popover"
            role="dialog"
            aria-label="List actions"
            style={{
              position: 'fixed',
              top: popoverPos.top,
              left: popoverPos.left,
              width: POPOVER_WIDTH,
              zIndex: 10050,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="list-actions-popover-header">
              <span className="list-actions-popover-title">List actions</span>
              <button
                type="button"
                className="list-actions-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="list-actions-body">
              <button
                type="button"
                className="list-actions-row"
                onClick={() => {
                  onAddCard();
                  setOpen(false);
                }}
              >
                Add card
              </button>
              <button type="button" className="list-actions-row" onClick={openCopyModal}>
                Copy list
              </button>
              <button type="button" className="list-actions-row" onClick={openMoveListModal}>
                Move list
              </button>
              <button type="button" className="list-actions-row" onClick={openMoveAllModal}>
                Move all cards in this list
              </button>

              <div className="list-actions-sort-wrap">
                <button
                  type="button"
                  className="list-actions-row list-actions-row-with-chevron"
                  onClick={() => setSortOpen((s) => !s)}
                >
                  Sort by…
                  <span className="list-actions-chevron" aria-hidden>
                    ›
                  </span>
                </button>
                {sortOpen && (
                  <div className="list-actions-sort-inline">
                    <button type="button" className="list-actions-row" onClick={() => handleSort('name_asc')}>
                      Card name (A–Z)
                    </button>
                    <button type="button" className="list-actions-row" onClick={() => handleSort('created_desc')}>
                      Date created (Newest first)
                    </button>
                    <button type="button" className="list-actions-row" onClick={() => handleSort('created_asc')}>
                      Date created (Oldest first)
                    </button>
                    <button type="button" className="list-actions-row" onClick={() => handleSort('due_asc')}>
                      Due date
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className="list-actions-row" onClick={handleWatch}>
                Watch{watched ? ' ✓' : ''}
              </button>

              <div className="list-actions-section">
                <button
                  type="button"
                  className="list-actions-section-header"
                  onClick={() => setColorOpen((v) => !v)}
                >
                  <span>Change list color</span>
                  <span className={`list-actions-chevron-up ${colorOpen ? '' : 'is-collapsed'}`} aria-hidden>
                    ⌃
                  </span>
                </button>
                {colorOpen && (
                  <>
                    <div className="list-actions-color-grid">
                      {LIST_COLORS.map(({ hex }) => {
                        const selected =
                          list.header_color &&
                          String(list.header_color).toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            type="button"
                            className={`list-actions-color-swatch ${selected ? 'is-selected' : ''}`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                            onClick={() => handleSetColor(hex)}
                          >
                            {selected ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path
                                  d="M20 6L9 17l-5-5"
                                  stroke="white"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" className="list-actions-remove-color" onClick={handleRemoveColor}>
                      <span className="list-actions-remove-icon" aria-hidden>
                        ×
                      </span>
                      Remove color
                    </button>
                  </>
                )}
              </div>

              <div className="list-actions-section">
                <button
                  type="button"
                  className="list-actions-section-header"
                  onClick={() => setAutomationOpen((v) => !v)}
                >
                  <span>Automation</span>
                  <span className={`list-actions-chevron-up ${automationOpen ? '' : 'is-collapsed'}`} aria-hidden>
                    ⌃
                  </span>
                </button>
                {automationOpen && (
                  <div className="list-actions-automation-list">
                    <button
                      type="button"
                      className="list-actions-row list-actions-row-sub"
                      onClick={() => openAutomationModal('onCardAdded')}
                    >
                      When a card is added to the list…
                    </button>
                    <button
                      type="button"
                      className="list-actions-row list-actions-row-sub"
                      onClick={() => openAutomationModal('dailySort')}
                    >
                      Every day, sort list by…
                    </button>
                    <button
                      type="button"
                      className="list-actions-row list-actions-row-sub"
                      onClick={() => openAutomationModal('weeklyMondaySort')}
                    >
                      Every Monday, sort list by…
                    </button>
                    <button
                      type="button"
                      className="list-actions-row list-actions-row-sub"
                      onClick={() => openAutomationModal('onCardAdded')}
                    >
                      Create a rule
                    </button>
                  </div>
                )}
              </div>

              <div className="list-actions-divider" />

              <button type="button" className="list-actions-row" onClick={handleArchiveList}>
                Archive this list
              </button>
              <button type="button" className="list-actions-row" onClick={handleArchiveAllCards}>
                Archive all cards in this list
              </button>
            </div>
          </div>,
          document.body
        )}

      {modal === 'moveList' && (
        <MoveListModal
          list={list}
          boardId={boardId}
          onClose={() => setModal(null)}
          onMoved={refresh}
        />
      )}
      {modal === 'copy' && (
        <CopyListModal list={list} boardId={boardId} onClose={() => setModal(null)} onCopied={refresh} />
      )}
      {modal === 'moveAll' && (
        <MoveAllCardsModal
          list={list}
          lists={lists}
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}
      {(modal === 'onCardAdded' || modal === 'dailySort' || modal === 'weeklyMondaySort') && (
        <AutomationModal
          list={list}
          mode={modal}
          lists={lists}
          automation={automation}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}

function MoveListModal({ list, boardId, onClose, onMoved }) {
  const [boards, setBoards] = useState([]);
  const [target, setTarget] = useState(String(boardId));

  useEffect(() => {
    fetchBoards()
      .then((res) => setBoards(res.data))
      .catch(console.error);
  }, []);

  const submit = async () => {
    const id = parseInt(target, 10);
    if (id === boardId) {
      onClose();
      return;
    }
    try {
      await moveListToBoard(list.id, { board_id: id });
      onMoved();
      onClose();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Failed to move list');
    }
  };

  return (
    <div className="list-actions-modal-overlay" onMouseDown={onClose}>
      <div className="list-actions-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="list-actions-modal-title">Move list</h3>
        <label className="list-actions-modal-label">Board</label>
        <select className="list-actions-modal-select" value={target} onChange={(e) => setTarget(e.target.value)}>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <div className="list-actions-modal-actions">
          <button type="button" className="list-actions-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="list-actions-modal-btn primary" onClick={submit}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyListModal({ list, boardId, onClose, onCopied }) {
  const [boards, setBoards] = useState([]);
  const [target, setTarget] = useState(String(boardId));

  useEffect(() => {
    fetchBoards()
      .then((res) => setBoards(res.data))
      .catch(console.error);
  }, []);

  const submit = async () => {
    try {
      await copyList(list.id, { board_id: parseInt(target, 10), title_suffix: ' (copy)' });
      onCopied();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to copy list');
    }
  };

  return (
    <div className="list-actions-modal-overlay" onMouseDown={onClose}>
      <div className="list-actions-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="list-actions-modal-title">Copy list</h3>
        <label className="list-actions-modal-label">Copy to board</label>
        <select className="list-actions-modal-select" value={target} onChange={(e) => setTarget(e.target.value)}>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <div className="list-actions-modal-actions">
          <button type="button" className="list-actions-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="list-actions-modal-btn primary" onClick={submit}>
            Create list
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveAllCardsModal({ list, lists, onClose, onDone }) {
  const others = (lists || []).filter((l) => l.id !== list.id);
  const [target, setTarget] = useState(others[0] ? String(others[0].id) : '');

  const submit = async () => {
    if (!target) return;
    try {
      await moveAllCardsInList(list.id, { target_list_id: parseInt(target, 10) });
      onDone();
      onClose();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Failed to move cards');
    }
  };

  if (!others.length) {
    return (
      <div className="list-actions-modal-overlay" onMouseDown={onClose}>
        <div className="list-actions-modal" onMouseDown={(e) => e.stopPropagation()}>
          <p className="list-actions-modal-hint">Add another list to move cards into.</p>
          <button type="button" className="list-actions-modal-btn primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-actions-modal-overlay" onMouseDown={onClose}>
      <div className="list-actions-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="list-actions-modal-title">Move all cards in this list</h3>
        <label className="list-actions-modal-label">List</label>
        <select className="list-actions-modal-select" value={target} onChange={(e) => setTarget(e.target.value)}>
          {others.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <div className="list-actions-modal-actions">
          <button type="button" className="list-actions-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="list-actions-modal-btn primary" onClick={submit}>
            Move cards
          </button>
        </div>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Card name (A–Z)' },
  { value: 'created_desc', label: 'Date created (Newest first)' },
  { value: 'created_asc', label: 'Date created (Oldest first)' },
  { value: 'due_asc', label: 'Due date' },
];

function AutomationModal({ list, mode, lists, automation, onClose, onSaved }) {
  const [targetListId, setTargetListId] = useState(
    automation.onCardAdded?.targetListId
      ? String(automation.onCardAdded.targetListId)
      : ''
  );
  const [sortBy, setSortBy] = useState(
    mode === 'dailySort'
      ? automation.dailySort?.sortBy || 'name_asc'
      : mode === 'weeklyMondaySort'
        ? automation.weeklyMondaySort?.sortBy || 'name_asc'
        : 'name_asc'
  );

  const title =
    mode === 'onCardAdded'
      ? 'When a card is added to the list…'
      : mode === 'dailySort'
        ? 'Every day, sort list by…'
        : 'Every Monday, sort list by…';

  const save = async () => {
    const next = normalizeAutomation(automation);
    if (mode === 'onCardAdded') {
      const id = parseInt(targetListId, 10);
      if (!id || id === list.id) {
        delete next.onCardAdded;
      } else {
        next.onCardAdded = { targetListId: id };
      }
    } else if (mode === 'dailySort') {
      next.dailySort = { sortBy };
    } else if (mode === 'weeklyMondaySort') {
      next.weeklyMondaySort = { sortBy };
    }
    try {
      await updateList(list.id, { automation: next });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const clear = async () => {
    const next = normalizeAutomation(automation);
    if (mode === 'onCardAdded') delete next.onCardAdded;
    if (mode === 'dailySort') delete next.dailySort;
    if (mode === 'weeklyMondaySort') delete next.weeklyMondaySort;
    try {
      await updateList(list.id, { automation: next });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="list-actions-modal-overlay" onMouseDown={onClose}>
      <div className="list-actions-modal list-actions-modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="list-actions-modal-title">{title}</h3>
        {mode === 'onCardAdded' && (
          <>
            <label className="list-actions-modal-label">Move new card to</label>
            <select
              className="list-actions-modal-select"
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
            >
              <option value="">— No automation —</option>
              {(lists || [])
                .filter((l) => l.id !== list.id)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
            </select>
          </>
        )}
        {(mode === 'dailySort' || mode === 'weeklyMondaySort') && (
          <>
            <label className="list-actions-modal-label">Sort by</label>
            <select className="list-actions-modal-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="list-actions-modal-hint">
              {mode === 'dailySort'
                ? 'Runs once per day when you open this board.'
                : 'Runs on Mondays when you open this board.'}
            </p>
          </>
        )}
        <div className="list-actions-modal-actions">
          <button type="button" className="list-actions-modal-btn secondary" onClick={clear}>
            Clear
          </button>
          <button type="button" className="list-actions-modal-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="list-actions-modal-btn primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
