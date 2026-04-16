'use client';

import { Draggable } from '@hello-pangea/dnd';
import { getFileUrl } from '../../lib/fileUrl';
import './Card.css';

export default function Card({ card, index, onClick }) {
  const labels = card.labels || [];
  const members = card.members || [];
  const hasDescription = card.description && card.description.trim();

  // Due date logic
  let dueBadgeClass = '';
  let dueBadgeText = '';
  if (card.due_date) {
    const dueDate = new Date(card.due_date);
    const now = new Date();
    const diffMs = dueDate - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const month = dueDate.toLocaleDateString('en-US', { month: 'short' });
    const day = dueDate.getDate();
    dueBadgeText = `${month} ${day}`;

    if (diffMs < 0) {
      dueBadgeClass = 'overdue';
    } else if (diffDays <= 3) {
      dueBadgeClass = 'due-soon';
    }
  }

  return (
    <Draggable draggableId={String(card.id)} index={index}>
      {(provided, snapshot) => (
        <div
          className={`card ${snapshot.isDragging ? 'is-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          id={`card-${card.id}`}
        >
          <div className="card-inner">
            {(card.cover_image_path || card.cover_color) && (
              <div
                className="card-cover-preview"
                style={
                  card.cover_image_path
                    ? { backgroundImage: `url(${getFileUrl(card.cover_image_path)})` }
                    : { background: card.cover_color }
                }
              />
            )}
            <div className="card-content">
              {/* Labels */}
              {labels.length > 0 && (
                <div className="card-labels">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className="card-label-chip"
                      style={{ background: label.color }}
                      title={label.name}
                    />
                  ))}
                </div>
              )}

              {/* Title */}
              <div className="card-title">{card.title}</div>

              {/* Badges & Members */}
              {(card.due_date || hasDescription || members.length > 0) && (
                <div className="card-bottom">
                  <div className="card-badges">
                    {/* Due Date Badge */}
                    {card.due_date && (
                      <span className={`card-badge ${dueBadgeClass}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {dueBadgeText}
                      </span>
                    )}

                    {/* Description Badge */}
                    {hasDescription && (
                      <span className="card-badge" title="Has description">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="15" y2="12" />
                          <line x1="3" y1="18" x2="18" y2="18" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Members */}
                  {members.length > 0 && (
                    <div className="card-members">
                      {members.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="card-member-avatar"
                          title={member.name}
                        >
                          {member.initials || member.name?.charAt(0)}
                        </div>
                      ))}
                      {members.length > 3 && (
                        <div className="card-member-avatar" title={`+${members.length - 3} more`}>
                          +{members.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Edit Button (hover) */}
            <button
              className="card-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              title="Edit card"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
