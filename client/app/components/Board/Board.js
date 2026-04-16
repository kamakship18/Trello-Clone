'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useBoard } from '../../context/BoardContext';
import { updateBoard, createBoard as apiCreateBoard } from '../../api';
import List from '../List/List';
import AddForm from '../AddForm/AddForm';
import CardDetail from '../CardDetail/CardDetail';
import { CreateBoardModal } from '../BoardsHome/BoardsHome';
import BoardMenuSidebar from '../BoardMenuSidebar/BoardMenuSidebar';
import BoardBottomNav from '../BoardBottomNav/BoardBottomNav';
import SwitchBoardsModal from '../SwitchBoardsModal/SwitchBoardsModal';
import { getFileUrl } from '../../lib/fileUrl';
import './Board.css';

export default function Board({
  boardId,
  showCreateModal,
  onCloseCreateModal,
  onSelectBoard,
  boardMenuOpen,
  onCloseBoardMenu,
  onOpenBoardMenu,
}) {
  const {
    board,
    lists,
    labels,
    members,
    loading,
    error,
    loadBoard,
    addList,
    moveCard,
    moveList,
  } = useBoard();

  const [selectedCard, setSelectedCard] = useState(null);
  const [showAddList, setShowAddList] = useState(false);
  const [filterLabel, setFilterLabel] = useState(null);
  const [filterMember, setFilterMember] = useState(null);
  const [filterDueDate, setFilterDueDate] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(null);
  const [switchBoardsOpen, setSwitchBoardsOpen] = useState(false);
  const [boardStarred, setBoardStarred] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const filterRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    loadBoard(boardId);
  }, [boardId, loadBoard]);

  // Set board title when board loads
  useEffect(() => {
    if (board) setBoardTitle(board.title);
  }, [board]);

  // Listen for search→card-detail events from Header
  useEffect(() => {
    const handleOpenCard = (e) => {
      setSelectedCard(e.detail);
    };
    window.addEventListener('openCardDetail', handleOpenCard);
    return () => window.removeEventListener('openCardDetail', handleOpenCard);
  }, []);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragEnd = useCallback((result) => {
    const { type, source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'list') {
      moveList(source.index, destination.index);
    } else if (type === 'card') {
      const sourceListId = parseInt(source.droppableId);
      const destListId = parseInt(destination.droppableId);
      const cardId = parseInt(draggableId);
      moveCard(cardId, sourceListId, destListId, source.index, destination.index);
    }
  }, [moveCard, moveList]);

  const handleAddList = useCallback(async (title) => {
    await addList(boardId, title);
    setShowAddList(false);
  }, [addList, boardId]);

  const handleCardClick = useCallback((card) => {
    setSelectedCard(card);
  }, []);

  // Board title editing
  const handleTitleSubmit = useCallback(async () => {
    setIsEditingTitle(false);
    if (boardTitle.trim() && boardTitle.trim() !== board?.title) {
      try {
        await updateBoard(board.id, { title: boardTitle.trim() });
      } catch (err) {
        console.error('Failed to update board title:', err);
        setBoardTitle(board.title);
      }
    } else {
      setBoardTitle(board?.title || '');
    }
  }, [boardTitle, board]);

  const clearFilters = () => {
    setFilterLabel(null);
    setFilterMember(null);
    setFilterDueDate(null);
  };

  const hasActiveFilters = filterLabel || filterMember || filterDueDate;

  // Filter cards in lists
  const filteredLists = lists.map(list => {
    if (!hasActiveFilters) return list;

    const filteredCards = (list.cards || []).filter(card => {
      if (filterLabel) {
        const hasLabel = (card.labels || []).some(l => l.id === filterLabel);
        if (!hasLabel) return false;
      }
      if (filterMember) {
        const hasMember = (card.members || []).some(m => m.id === filterMember);
        if (!hasMember) return false;
      }
      if (filterDueDate === 'overdue') {
        if (!card.due_date || new Date(card.due_date) > new Date()) return false;
      } else if (filterDueDate === 'soon') {
        if (!card.due_date) return false;
        const dueDate = new Date(card.due_date);
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        if (dueDate < now || dueDate > threeDays) return false;
      } else if (filterDueDate === 'no-date') {
        if (card.due_date) return false;
      }
      return true;
    });

    return { ...list, cards: filteredCards };
  });

  // Handle board creation from modal
  const handleCreateBoard = useCallback(async (title, background) => {
    try {
      const res = await apiCreateBoard({ title, background });
      onCloseCreateModal?.();
      // Navigate to the newly created board
      onSelectBoard?.(res.data.id);
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  }, [onCloseCreateModal, onSelectBoard]);

  if (loading) {
    return (
      <div className="board-loading">
        <div style={{ textAlign: 'center' }}>
          <div className="board-loading-spinner" />
          <div>Loading board...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-error">
        <div>Failed to load board</div>
        <button className="board-error-btn" onClick={() => loadBoard(boardId)}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="board-wrapper"
      id="board-wrapper"
      style={boardBackgroundStyle(board?.background)}
    >
      <div className="board-starter-tab" title="Trello Starter Guide">
        <span className="board-starter-tab-label">Trello Starter Guide</span>
        <span className="board-starter-tab-badge">6</span>
      </div>

      {/* Board Top Bar */}
      <div className="board-topbar">
        <div className="board-title-section">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="board-title-input"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setBoardTitle(board?.title || '');
                  setIsEditingTitle(false);
                }
              }}
              id="board-title-input"
            />
          ) : (
            <>
              <h1
                className="board-title"
                onClick={() => setIsEditingTitle(true)}
                id="board-title"
              >
                {board?.title || 'Board'}
              </h1>
              <button
                type="button"
                className={`board-title-star ${boardStarred ? 'board-title-star-on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setBoardStarred((s) => !s);
                }}
                aria-label={boardStarred ? 'Unstar board' : 'Star board'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={boardStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                type="button"
                className="board-title-chevron"
                aria-label="Board menu"
                title="Board options"
                onClick={() => onOpenBoardMenu?.()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </>
          )}
        </div>
        <div className="board-topbar-actions">
          <div style={{ position: 'relative' }} ref={filterRef}>
            <button
              className={`board-topbar-btn ${hasActiveFilters ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(showFilterDropdown === 'label' ? null : 'label')}
              id="filter-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
            </button>

            {showFilterDropdown === 'label' && (
              <div className="filter-dropdown" id="filter-dropdown">
                <div style={{ padding: '4px 12px', fontWeight: 600, fontSize: '12px', color: '#5e6c84' }}>
                  Filter by label
                </div>
                {(labels || []).map(label => (
                  <div
                    key={label.id}
                    className="filter-dropdown-item"
                    onClick={() => {
                      setFilterLabel(filterLabel === label.id ? null : label.id);
                      setShowFilterDropdown(null);
                    }}
                  >
                    <div className="filter-label-color" style={{ background: label.color }} />
                    <span>{label.name || 'Unnamed'}</span>
                    {filterLabel === label.id && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </div>
                ))}
                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #dfe1e6' }} />
                <div style={{ padding: '4px 12px', fontWeight: 600, fontSize: '12px', color: '#5e6c84' }}>
                  Filter by member
                </div>
                {(members || []).map(member => (
                  <div
                    key={member.id}
                    className="filter-dropdown-item"
                    onClick={() => {
                      setFilterMember(filterMember === member.id ? null : member.id);
                      setShowFilterDropdown(null);
                    }}
                  >
                    <span>{member.name}</span>
                    {filterMember === member.id && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </div>
                ))}
                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #dfe1e6' }} />
                <div style={{ padding: '4px 12px', fontWeight: 600, fontSize: '12px', color: '#5e6c84' }}>
                  Filter by due date
                </div>
                {[
                  { key: 'overdue', label: 'Overdue' },
                  { key: 'soon', label: 'Due soon' },
                  { key: 'no-date', label: 'No date' },
                ].map(opt => (
                  <div
                    key={opt.key}
                    className="filter-dropdown-item"
                    onClick={() => {
                      setFilterDueDate(filterDueDate === opt.key ? null : opt.key);
                      setShowFilterDropdown(null);
                    }}
                  >
                    <span>{opt.label}</span>
                    {filterDueDate === opt.key && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </div>
                ))}
                {hasActiveFilters && (
                  <>
                    <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #dfe1e6' }} />
                    <div
                      className="filter-dropdown-item"
                      style={{ color: '#eb5a46', fontWeight: 500 }}
                      onClick={() => {
                        clearFilters();
                        setShowFilterDropdown(null);
                      }}
                    >
                      Clear all filters
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="filter-bar">
          {filterLabel && (
            <button className="filter-btn active" onClick={() => setFilterLabel(null)}>
              Label: {labels.find(l => l.id === filterLabel)?.name || 'Unknown'} ✕
            </button>
          )}
          {filterMember && (
            <button className="filter-btn active" onClick={() => setFilterMember(null)}>
              Member: {members.find(m => m.id === filterMember)?.name || 'Unknown'} ✕
            </button>
          )}
          {filterDueDate && (
            <button className="filter-btn active" onClick={() => setFilterDueDate(null)}>
              Due: {filterDueDate} ✕
            </button>
          )}
          <button className="filter-btn" onClick={clearFilters}>Clear all</button>
        </div>
      )}

      {/* Lists */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" type="list" direction="horizontal">
          {(provided) => (
            <div
              className="board-lists-container"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div className="board-lists">
                {filteredLists.map((list, index) => (
                  <List
                    key={list.id}
                    list={list}
                    index={index}
                    onCardClick={handleCardClick}
                  />
                ))}
                {provided.placeholder}

                {/* Add Another List */}
                <div className="add-list-wrapper">
                  {showAddList ? (
                    <AddForm
                      placeholder="Enter list title..."
                      onSubmit={handleAddList}
                      onCancel={() => setShowAddList(false)}
                      buttonText="Add list"
                      autoFocus
                    />
                  ) : (
                    <button
                      className="add-list-btn"
                      id="add-list-btn"
                      onClick={() => setShowAddList(true)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add another list
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {/* Create Board Modal (triggered from header) */}
      {showCreateModal && (
        <CreateBoardModal
          onSubmit={handleCreateBoard}
          onClose={onCloseCreateModal}
        />
      )}

      <BoardMenuSidebar
        open={!!boardMenuOpen && !!board}
        onClose={onCloseBoardMenu}
        board={board}
        onBackgroundUpdated={() => loadBoard(boardId, { silent: true })}
      />

      <BoardBottomNav onSwitchBoards={() => setSwitchBoardsOpen(true)} />

      <SwitchBoardsModal
        open={switchBoardsOpen}
        onClose={() => setSwitchBoardsOpen(false)}
        currentBoardId={boardId}
        onSelectBoard={onSelectBoard}
      />
    </div>
  );
}

function boardBackgroundStyle(bg) {
  if (!bg) return undefined;
  if (bg.startsWith('/uploads') || bg.startsWith('http')) {
    const url = bg.startsWith('http') ? bg : getFileUrl(bg);
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.28)), url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    };
  }
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
    return {
      background: bg,
      backgroundAttachment: 'fixed',
    };
  }
  if (bg.startsWith('#')) {
    return { background: `linear-gradient(160deg, ${bg}, ${adjustColor(bg, 40)})` };
  }
  return { background: bg };
}

function adjustColor(hex, amount) {
  try {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch {
    return hex;
  }
}
