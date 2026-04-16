'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useBoard } from '../../context/BoardContext';
import Card from '../Card/Card';
import AddForm from '../AddForm/AddForm';
import ListActionsMenu from './ListActionsMenu';
import './List.css';

/** Soft column wash: mix accent with default list gray (#ebecf0) — matches Trello-style full-list tint */
function listColumnBackground(hex) {
  const base = [235, 236, 240];
  const mix = 0.36;
  const h = String(hex).replace(/^#/, '');
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) return '#ebecf0';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${Math.round(r * mix + base[0] * (1 - mix))},${Math.round(g * mix + base[1] * (1 - mix))},${Math.round(b * mix + base[2] * (1 - mix))})`;
}

export default function List({ list, index, onCardClick, boardId }) {
  const { editList, addCard, board, lists } = useBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showAddCard, setShowAddCard] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTitle(list.title);
  }, [list.title]);

  const handleTitleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== list.title) {
      editList(list.id, { title: trimmed });
    } else {
      setTitle(list.title);
    }
    setIsEditing(false);
  }, [title, list.id, list.title, editList]);

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') {
      setTitle(list.title);
      setIsEditing(false);
    }
  };

  const handleAddCard = useCallback(
    async (cardTitle) => {
      await addCard(list.id, cardTitle);
      setShowAddCard(false);
    },
    [addCard, list.id]
  );

  const [watched, setWatched] = useState(false);

  useEffect(() => {
    setWatched(
      typeof window !== 'undefined' &&
        window.localStorage.getItem(`trello_list_watch_${list.id}`) === '1'
    );
  }, [list.id]);

  useEffect(() => {
    const onWatch = (e) => {
      if (e.detail?.listId === list.id) {
        setWatched(window.localStorage.getItem(`trello_list_watch_${list.id}`) === '1');
      }
    };
    window.addEventListener('trelloListWatchChanged', onWatch);
    return () => window.removeEventListener('trelloListWatchChanged', onWatch);
  }, [list.id]);

  const cards = list.cards || [];
  const bid = boardId ?? board?.id;
  const listAccent = list.header_color || null;

  return (
    <Draggable draggableId={`list-${list.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          className="list-wrapper"
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div
            className={`list ${snapshot.isDragging ? 'is-dragging' : ''} ${listAccent ? 'list--colored' : ''}`}
            style={listAccent ? { background: listColumnBackground(listAccent) } : undefined}
          >
            <div className="list-header">
              <div className="list-header-main" {...provided.dragHandleProps}>
                {isEditing ? (
                  <input
                    ref={titleInputRef}
                    className="list-title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={handleTitleKeyDown}
                  />
                ) : (
                  <div className="list-title" onClick={() => setIsEditing(true)}>
                    {list.title}
                    {watched ? (
                      <span className="list-watch-eye" title="Watching">
                        {' '}
                        👁
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              {bid && (
                <ListActionsMenu
                  list={list}
                  boardId={bid}
                  lists={lists}
                  onAddCard={() => setShowAddCard(true)}
                />
              )}
            </div>

            <Droppable droppableId={String(list.id)} type="card">
              {(dropProvided, dropSnapshot) => (
                <div
                  className="list-cards"
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  style={{
                    background: dropSnapshot.isDraggingOver
                      ? listAccent
                        ? 'rgba(0,0,0,0.07)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                    borderRadius: '8px',
                    transition: 'background 0.2s ease',
                  }}
                >
                  {cards.map((card, cardIndex) => (
                    <Card
                      key={card.id}
                      card={card}
                      index={cardIndex}
                      onClick={() => onCardClick(card)}
                    />
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>

            <div className="list-footer">
              {showAddCard ? (
                <AddForm
                  placeholder="Enter a title for this card..."
                  onSubmit={handleAddCard}
                  onCancel={() => setShowAddCard(false)}
                  buttonText="Add card"
                  autoFocus
                  isCard
                />
              ) : (
                <button
                  type="button"
                  className="add-card-btn"
                  id={`add-card-btn-${list.id}`}
                  onClick={() => setShowAddCard(true)}
                >
                  <span className="add-card-plus" aria-hidden>
                    +
                  </span>
                  Add a card
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
