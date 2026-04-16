'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBoards, createBoard, deleteBoard } from '../../api';
import { getBoardThumbStyle } from '../../lib/boardThumbStyle';
import PageLoader from '../PageLoader/PageLoader';
import './BoardsHome.css';

const BOARD_COLORS = [
  '#0079bf', '#d29034', '#519839', '#b04632',
  '#89609e', '#cd5a91', '#4bbf6b', '#00aecc',
  '#838c91',
];

const WORKSPACE_NAME = 'Trello Workspace';

function BoardTile({ board, onOpen, onDelete }) {
  const thumbStyle = getBoardThumbStyle(board.background);

  return (
    <div
      className="bh-board-tile"
      onClick={() => onOpen(board.id)}
      id={`board-card-${board.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(board.id);
        }
      }}
    >
      <div className="bh-board-tile-thumb" style={thumbStyle}>
        <button
          type="button"
          className="bh-board-tile-delete"
          onClick={(e) => onDelete(e, board.id)}
          title="Delete board"
          aria-label="Delete board"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="bh-board-tile-footer">
        <span className="bh-board-tile-title">{board.title}</span>
      </div>
    </div>
  );
}

export default function BoardsHome({
  onSelectBoard,
  showCreateModal,
  onCloseCreateModal,
  filterQuery = '',
}) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sidebarNav, setSidebarNav] = useState('boards');
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);

  const isCreateOpen = showCreate || showCreateModal;
  const handleCloseCreate = useCallback(() => {
    setShowCreate(false);
    onCloseCreateModal?.();
  }, [onCloseCreateModal]);

  const loadBoards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBoards();
      setBoards(res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const filteredBoards = useMemo(() => {
    const q = (filterQuery || '').trim().toLowerCase();
    if (!q) return boards;
    return boards.filter((b) => (b.title || '').toLowerCase().includes(q));
  }, [boards, filterQuery]);

  const recentBoards = useMemo(() => filteredBoards.slice(0, 6), [filteredBoards]);

  const handleCreateBoard = useCallback(
    async (title, background) => {
      try {
        const res = await createBoard({ title, background });
        setBoards((prev) => [res.data, ...prev]);
        setShowCreate(false);
        onCloseCreateModal?.();
        onSelectBoard(res.data.id);
      } catch (err) {
        console.error('Failed to create board:', err);
      }
    },
    [onSelectBoard, onCloseCreateModal]
  );

  const handleDeleteBoard = useCallback(async (e, boardId) => {
    e.stopPropagation();
    if (window.confirm('Delete this board and all its data?')) {
      try {
        await deleteBoard(boardId);
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
      } catch (err) {
        console.error('Failed to delete board:', err);
      }
    }
  }, []);

  const createFromTemplate = useCallback(
    async (title, bg) => {
      await handleCreateBoard(title, bg);
    },
    [handleCreateBoard]
  );

  if (loading) {
    return (
      <div className="bh-layout">
        <aside className="bh-sidebar bh-sidebar--skeleton" aria-hidden />
        <div className="bh-main bh-main--loading">
          <PageLoader message="Loading your boards…" />
        </div>
      </div>
    );
  }

  return (
    <div className="bh-layout">
      <aside className="bh-sidebar">
        <nav className="bh-side-nav" aria-label="Primary">
          <button
            type="button"
            className={`bh-side-link ${sidebarNav === 'boards' ? 'is-active' : ''}`}
            onClick={() => setSidebarNav('boards')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Boards
          </button>
          <button
            type="button"
            className={`bh-side-link ${sidebarNav === 'templates' ? 'is-active' : ''}`}
            onClick={() => setSidebarNav('templates')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
            Templates
          </button>
          <button
            type="button"
            className={`bh-side-link ${sidebarNav === 'home' ? 'is-active' : ''}`}
            onClick={() => setSidebarNav('home')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>
        </nav>

        <div className="bh-workspace-block">
          <div className="bh-workspace-head">
            <span className="bh-workspace-label">Workspaces</span>
            <button
              type="button"
              className="bh-workspace-add"
              title="Create board"
              aria-label="Create board"
              onClick={() => setShowCreate(true)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="bh-workspace-toggle"
            onClick={() => setWorkspaceOpen((o) => !o)}
            aria-expanded={workspaceOpen}
          >
            <span className="bh-workspace-icon">T</span>
            <span className="bh-workspace-name">{WORKSPACE_NAME}</span>
            <svg
              className={`bh-chevron ${workspaceOpen ? 'open' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {workspaceOpen && (
            <ul className="bh-workspace-sub">
              <li>
                <button type="button" className="bh-sub-link is-active" onClick={() => setSidebarNav('boards')}>
                  Boards
                </button>
              </li>
              <li>
                <button type="button" className="bh-sub-link" onClick={() => setMembersOpen(true)}>
                  Members
                  <span className="bh-sub-plus">+</span>
                </button>
              </li>
              <li>
                <button type="button" className="bh-sub-link" onClick={() => setMembersOpen(true)}>
                  Settings
                </button>
              </li>
              <li>
                <button type="button" className="bh-sub-link">
                  Billing
                </button>
              </li>
            </ul>
          )}
        </div>
      </aside>

      <main className="bh-main">
        {sidebarNav === 'templates' && (
          <div className="bh-section">
            <h1 className="bh-page-title">Templates</h1>
            <p className="bh-muted">Start faster with a template — pick one to create a new board.</p>
            <div className="bh-template-grid">
              {[
                { title: 'Project Management', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                { title: 'Marketing', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
                { title: 'Design Sprint', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
              ].map((t) => (
                <button
                  key={t.title}
                  type="button"
                  className="bh-template-card"
                  onClick={() => createFromTemplate(`${t.title} board`, t.bg)}
                >
                  <div className="bh-template-thumb" style={{ background: t.bg }} />
                  <span>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sidebarNav === 'home' && (
          <div className="bh-section">
            <h1 className="bh-page-title">Home</h1>
            <p className="bh-muted">Welcome back. Jump into a workspace board or create something new.</p>
            <button type="button" className="bh-primary-btn" onClick={() => setShowCreate(true)}>
              Create board
            </button>
          </div>
        )}

        {sidebarNav === 'boards' && (
          <>
            <section className="bh-section" aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="bh-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Recently viewed
              </h2>
              {recentBoards.length === 0 ? (
                <p className="bh-muted">{filterQuery.trim() ? 'No boards match your search.' : 'No boards yet.'}</p>
              ) : (
                <div className="bh-board-grid">
                  {recentBoards.map((board) => (
                    <BoardTile key={board.id} board={board} onOpen={onSelectBoard} onDelete={handleDeleteBoard} />
                  ))}
                </div>
              )}
            </section>

            <section className="bh-section bh-workspace-section" id="workspace-boards" aria-labelledby="ws-heading">
              <div className="bh-workspace-bar">
                <h2 id="ws-heading" className="bh-workspace-section-title">
                  <span className="bh-ws-badge">T</span>
                  YOUR WORKSPACES
                </h2>
                <div className="bh-workspace-actions">
                  <button type="button" className="bh-ws-action" onClick={() => setSidebarNav('boards')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                    Boards
                  </button>
                  <button type="button" className="bh-ws-action" onClick={() => setMembersOpen(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Members
                  </button>
                  <button type="button" className="bh-ws-action" onClick={() => setMembersOpen(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Settings
                  </button>
                </div>
              </div>

              <div className="bh-board-grid">
                {filteredBoards.map((board) => (
                  <BoardTile key={`ws-${board.id}`} board={board} onOpen={onSelectBoard} onDelete={handleDeleteBoard} />
                ))}
                <button
                  type="button"
                  className="bh-board-create"
                  onClick={() => setShowCreate(true)}
                  id="create-board-card"
                >
                  Create new board
                </button>
              </div>

              <button type="button" className="bh-closed-link">
                View all closed boards
              </button>
            </section>
          </>
        )}
      </main>

      {isCreateOpen && (
        <CreateBoardModal onSubmit={handleCreateBoard} onClose={handleCloseCreate} />
      )}

      {membersOpen && (
        <div className="bh-modal-overlay" onClick={(e) => e.target === e.currentTarget && setMembersOpen(false)}>
          <div className="bh-modal" role="dialog" aria-labelledby="members-title">
            <h3 id="members-title">Workspace members</h3>
            <p className="bh-muted">Invite teammates and manage roles. Full workspace controls ship in a later iteration — your boards stay shared from here.</p>
            <button type="button" className="bh-primary-btn" onClick={() => setMembersOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBoardModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [background, setBackground] = useState(BOARD_COLORS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim(), background);
    }
  };

  return (
    <div className="create-board-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="create-board-modal">
        <div className="create-board-preview" style={getBoardThumbStyle(background)}>
          <div className="create-board-preview-title">{title || 'Board title'}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="create-board-label">Board title *</div>
          <input
            className="create-board-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter board title…"
            autoFocus
            id="create-board-title-input"
          />

          <div className="create-board-label">Background</div>
          <div className="create-board-colors">
            {BOARD_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`create-board-color-btn ${background === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setBackground(color)}
              />
            ))}
          </div>

          <div className="create-board-actions">
            <button type="submit" className="create-board-submit" disabled={!title.trim()} id="create-board-submit">
              Create board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CreateBoardModal };
