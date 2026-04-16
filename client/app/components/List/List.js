'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useBoard } from '../../context/BoardContext';
import Card from '../Card/Card';
import AddForm from '../AddForm/AddForm';
import './List.css';

export default function List({ list, index, onCardClick }) {
  const { editList, removeList, addCard } = useBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const titleInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleAddCard = useCallback(async (cardTitle) => {
    await addCard(list.id, cardTitle);
    setShowAddCard(false);
  }, [addCard, list.id]);

  const handleDeleteList = useCallback(() => {
    if (window.confirm(`Delete "${list.title}" and all its cards?`)) {
      removeList(list.id);
    }
    setShowMenu(false);
  }, [removeList, list.id, list.title]);

  const cards = list.cards || [];

  return (
    <Draggable draggableId={`list-${list.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          className="list-wrapper"
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div className={`list ${snapshot.isDragging ? 'is-dragging' : ''}`}>
            {/* List Header */}
            <div className="list-header" {...provided.dragHandleProps}>
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
                <div
                  className="list-title"
                  onClick={() => setIsEditing(true)}
                >
                  {list.title}
                </div>
              )}
              <span className="list-card-count">{cards.length}</span>
              <div className="list-header-actions" style={{ position: 'relative' }}>
                <button
                  className="list-menu-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  id={`list-menu-btn-${list.id}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>

                {showMenu && (
                  <div className="list-menu" ref={menuRef}>
                    <button
                      className="list-menu-item"
                      onClick={() => {
                        setShowAddCard(true);
                        setShowMenu(false);
                      }}
                    >
                      Add card
                    </button>
                    <button
                      className="list-menu-item"
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                    >
                      Edit title
                    </button>
                    <button
                      className="list-menu-item danger"
                      onClick={handleDeleteList}
                    >
                      Delete list
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cards */}
            <Droppable droppableId={String(list.id)} type="card">
              {(dropProvided, dropSnapshot) => (
                <div
                  className="list-cards"
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  style={{
                    background: dropSnapshot.isDraggingOver ? 'rgba(0,0,0,0.04)' : 'transparent',
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

            {/* Add Card Footer */}
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
                  <span className="add-card-plus" aria-hidden>+</span>
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
