'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBoard } from '../../context/BoardContext';
import {
  fetchCard,
  addCardLabel,
  removeCardLabel,
  addCardMember,
  removeCardMember,
  createChecklist,
  deleteChecklist,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  uploadCardAttachment,
  deleteCardAttachment,
  patchCardCover,
  postComment,
  updateComment,
  deleteComment,
} from '../../api';
import { getFileUrl } from '../../lib/fileUrl';
import { formatRelativeTime } from '../../utils/relativeTime';
import './CardDetail.css';

const COVER_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0', '#0079bf',
  '#00c2e0', '#51e898', '#ff78cb', '#344563', '#b3bec4', '#596773',
];

export default function CardDetail({ card: initialCard, onClose }) {
  const {
    editCard,
    removeCard,
    lists,
    labels: boardLabels,
    members: boardMembers,
    loadBoard,
    mergeCardInBoard,
    board,
    currentMemberId,
    createBoardLabel,
  } = useBoard();
  const [card, setCard] = useState(initialCard);
  const [title, setTitle] = useState(initialCard.title);
  const [description, setDescription] = useState(initialCard.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [checklists, setChecklists] = useState([]);
  const [activePopover, setActivePopover] = useState(null);
  const [dueDate, setDueDate] = useState(initialCard.due_date ? new Date(initialCard.due_date).toISOString().split('T')[0] : '');
  const [addingItemTo, setAddingItemTo] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [labelSearch, setLabelSearch] = useState('');
  const [labelCreateOpen, setLabelCreateOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(COVER_COLORS[0]);
  const [labelCreateSaving, setLabelCreateSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Load full card details
  useEffect(() => {
    const loadCardDetails = async () => {
      try {
        const res = await fetchCard(initialCard.id);
        setCard(res.data);
        setTitle(res.data.title);
        setDescription(res.data.description || '');
        setChecklists(res.data.checklists || []);
        setComments(res.data.comments || []);
        setActivities(res.data.activities || []);
        setAttachments(res.data.attachments || []);
        if (res.data.due_date) {
          setDueDate(new Date(res.data.due_date).toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error('Failed to load card:', err);
      }
    };
    loadCardDetails();
  }, [initialCard.id]);

  const timeline = useMemo(() => {
    const rows = [];
    (comments || []).forEach((c) =>
      rows.push({ kind: 'comment', data: c, t: new Date(c.created_at).getTime() })
    );
    (activities || []).forEach((a) =>
      rows.push({ kind: 'activity', data: a, t: new Date(a.created_at).getTime() })
    );
    return rows.sort((a, b) => a.t - b.t);
  }, [comments, activities]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (activePopover) {
          setActivePopover(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, activePopover]);

  useEffect(() => {
    if (activePopover !== 'labels') {
      setLabelCreateOpen(false);
      setNewLabelName('');
      setNewLabelColor(COVER_COLORS[0]);
    }
  }, [activePopover]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Title update
  const handleTitleBlur = useCallback(() => {
    if (title.trim() && title.trim() !== card.title) {
      editCard(card.id, { title: title.trim() });
      setCard(prev => ({ ...prev, title: title.trim() }));
    }
  }, [title, card, editCard]);

  // Description update
  const handleDescSave = useCallback(() => {
    editCard(card.id, { description });
    setCard(prev => ({ ...prev, description }));
    setIsEditingDesc(false);
  }, [description, card.id, editCard]);

  // Label toggle
  const handleLabelToggle = useCallback(async (labelId) => {
    const hasLabel = (card.labels || []).some(l => l.id === labelId);
    try {
      if (hasLabel) {
        await removeCardLabel(card.id, labelId);
        const labels = (card.labels || []).filter(l => l.id !== labelId);
        setCard(prev => ({ ...prev, labels }));
        mergeCardInBoard(card.id, { labels });
      } else {
        await addCardLabel(card.id, labelId);
        const label = boardLabels.find(l => l.id === labelId);
        const labels = [...(card.labels || []), label].filter(Boolean);
        setCard(prev => ({ ...prev, labels }));
        mergeCardInBoard(card.id, { labels });
      }
    } catch (err) {
      console.error('Failed to toggle label:', err);
    }
  }, [card, boardLabels, mergeCardInBoard]);

  const handleCreateNewLabel = useCallback(async () => {
    if (!board?.id || labelCreateSaving) return;
    try {
      setLabelCreateSaving(true);
      const label = await createBoardLabel(board.id, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      await addCardLabel(card.id, label.id);
      const labels = [...(card.labels || []), label];
      setCard((prev) => ({ ...prev, labels }));
      mergeCardInBoard(card.id, { labels });
      setLabelCreateOpen(false);
      setNewLabelName('');
    } catch (err) {
      console.error('Failed to create label:', err);
    } finally {
      setLabelCreateSaving(false);
    }
  }, [
    board?.id,
    labelCreateSaving,
    createBoardLabel,
    newLabelName,
    newLabelColor,
    card.id,
    card.labels,
    mergeCardInBoard,
  ]);

  // Member toggle
  const handleMemberToggle = useCallback(async (memberId) => {
    const hasMember = (card.members || []).some(m => m.id === memberId);
    try {
      if (hasMember) {
        await removeCardMember(card.id, memberId);
        const members = (card.members || []).filter(m => m.id !== memberId);
        setCard(prev => ({ ...prev, members }));
        mergeCardInBoard(card.id, { members });
      } else {
        await addCardMember(card.id, memberId);
        const member = boardMembers.find(m => m.id === memberId);
        const members = [...(card.members || []), member].filter(Boolean);
        setCard(prev => ({ ...prev, members }));
        mergeCardInBoard(card.id, { members });
      }
    } catch (err) {
      console.error('Failed to toggle member:', err);
    }
  }, [card, boardMembers, mergeCardInBoard]);

  // Due date
  const handleDueDateSave = useCallback(async () => {
    try {
      await editCard(card.id, { due_date: dueDate || null });
      setCard(prev => ({ ...prev, due_date: dueDate || null }));
      setActivePopover(null);
    } catch (err) {
      console.error('Failed to update due date:', err);
    }
  }, [dueDate, card.id, editCard]);

  const handleRemoveDueDate = useCallback(async () => {
    try {
      await editCard(card.id, { due_date: null });
      setCard(prev => ({ ...prev, due_date: null }));
      setDueDate('');
      setActivePopover(null);
    } catch (err) {
      console.error('Failed to remove due date:', err);
    }
  }, [card.id, editCard]);

  // Checklist handlers
  const handleAddChecklist = useCallback(async () => {
    try {
      const res = await createChecklist(card.id, 'Checklist');
      setChecklists(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Failed to create checklist:', err);
    }
  }, [card.id]);

  const handleDeleteChecklist = useCallback(async (checklistId) => {
    try {
      await deleteChecklist(checklistId);
      setChecklists(prev => prev.filter(cl => cl.id !== checklistId));
    } catch (err) {
      console.error('Failed to delete checklist:', err);
    }
  }, []);

  const handleAddChecklistItem = useCallback(async (checklistId) => {
    if (!newItemText.trim()) return;
    try {
      const res = await createChecklistItem(checklistId, newItemText.trim());
      setChecklists(prev => prev.map(cl =>
        cl.id === checklistId ? { ...cl, items: [...(cl.items || []), res.data] } : cl
      ));
      setNewItemText('');
      setAddingItemTo(null);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  }, [newItemText]);

  const handleToggleChecklistItem = useCallback(async (itemId, isChecked) => {
    try {
      await updateChecklistItem(itemId, { is_checked: !isChecked });
      setChecklists(prev => prev.map(cl => ({
        ...cl,
        items: (cl.items || []).map(item =>
          item.id === itemId ? { ...item, is_checked: !isChecked } : item
        ),
      })));
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  }, []);

  const handleDeleteChecklistItem = useCallback(async (itemId) => {
    try {
      await deleteChecklistItem(itemId);
      setChecklists(prev => prev.map(cl => ({
        ...cl,
        items: (cl.items || []).filter(item => item.id !== itemId),
      })));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }, []);

  const handleDeleteCard = useCallback(() => {
    if (window.confirm('Delete this card?')) {
      removeCard(card.id);
      onClose();
    }
  }, [card.id, removeCard, onClose]);

  const handleArchiveCard = useCallback(() => {
    editCard(card.id, { is_archived: true });
    onClose();
    if (board) loadBoard(board.id, { silent: true });
  }, [card.id, editCard, onClose, board, loadBoard]);

  const refreshCardFromServer = useCallback(async () => {
    try {
      const res = await fetchCard(initialCard.id);
      setCard(res.data);
      setTitle(res.data.title);
      setDescription(res.data.description || '');
      setChecklists(res.data.checklists || []);
      setComments(res.data.comments || []);
      setActivities(res.data.activities || []);
      setAttachments(res.data.attachments || []);
      if (res.data.due_date) {
        setDueDate(new Date(res.data.due_date).toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error('refreshCardFromServer', e);
    }
  }, [initialCard.id]);

  const handleUploadFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const res = await uploadCardAttachment(card.id, file, currentMemberId);
        setAttachments((prev) => [...prev, res.data]);
        await refreshCardFromServer();
        if (board?.id) await loadBoard(board.id, { silent: true });
      } catch (err) {
        console.error('Upload failed:', err);
      }
      e.target.value = '';
    },
    [card.id, currentMemberId, board?.id, loadBoard, refreshCardFromServer]
  );

  const handleDeleteAttachment = useCallback(
    async (att) => {
      try {
        await deleteCardAttachment(card.id, att.id, currentMemberId);
        await refreshCardFromServer();
        if (board?.id) await loadBoard(board.id, { silent: true });
      } catch (e) {
        console.error(e);
      }
    },
    [card.id, currentMemberId, board?.id, loadBoard, refreshCardFromServer]
  );

  const applyCover = useCallback(
    async (payload) => {
      try {
        const res = await patchCardCover(card.id, { ...payload, member_id: currentMemberId });
        setCard((c) => ({ ...c, ...res.data }));
        setActivePopover(null);
        mergeCardInBoard(card.id, {
          cover_color: res.data.cover_color,
          cover_image_path: res.data.cover_image_path,
        });
      } catch (e) {
        console.error(e);
      }
    },
    [card.id, currentMemberId, mergeCardInBoard]
  );

  const handlePostComment = useCallback(async () => {
    if (!commentBody.trim() || !currentMemberId) return;
    try {
      const res = await postComment(card.id, { member_id: currentMemberId, body: commentBody.trim() });
      setComments((prev) => [...prev, res.data]);
      setCommentBody('');
      await refreshCardFromServer();
    } catch (e) {
      console.error(e);
    }
  }, [commentBody, card.id, currentMemberId, refreshCardFromServer]);

  const handleSaveEditComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await updateComment(card.id, commentId, {
        body: editCommentText.trim(),
        member_id: currentMemberId,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...res.data, member: res.data.member || c.member } : c
        )
      );
      setEditingComment(null);
      await refreshCardFromServer();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(card.id, commentId, currentMemberId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      await refreshCardFromServer();
    } catch (e) {
      console.error(e);
    }
  };

  // Computed values
  const currentList = lists.find(l => l.id === card.list_id);
  let dueBadgeClass = '';
  if (card.due_date) {
    const due = new Date(card.due_date);
    const now = new Date();
    if (due < now) dueBadgeClass = 'overdue';
    else if ((due - now) / (1000*60*60*24) <= 3) dueBadgeClass = 'due-soon';
  }

  // Filtered labels for search
  const filteredLabels = (boardLabels || []).filter(l =>
    !labelSearch || (l.name || '').toLowerCase().includes(labelSearch.toLowerCase())
  );

  return (
    <div className="card-detail-overlay" onClick={handleOverlayClick} id="card-detail-overlay">
      <div className="card-detail-modal" ref={modalRef} id="card-detail-modal">
        <input
          ref={fileInputRef}
          type="file"
          className="cd-file-input-hidden"
          onChange={handleUploadFile}
          accept="image/*,application/pdf,text/plain"
        />

        {(card.cover_image_path || card.cover_color) && (
          <div
            className="cd-modal-cover"
            style={
              card.cover_image_path
                ? { backgroundImage: `url(${getFileUrl(card.cover_image_path)})` }
                : { background: card.cover_color }
            }
          >
            <button
              type="button"
              className="cd-remove-cover"
              onClick={() => applyCover({ cover_color: null, cover_image_path: null })}
            >
              Remove cover
            </button>
          </div>
        )}

        {/* Top-right: cover, menu, close (matches Trello chrome) */}
        <div className="cd-top-actions">
          <button
            type="button"
            className="cd-top-btn"
            title="Cover"
            aria-label="Cover"
            onClick={() => setActivePopover('cover')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button type="button" className="cd-top-btn" title="More options" aria-label="More options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          <button type="button" className="cd-top-btn" title="Close" onClick={onClose} id="card-detail-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ---- Header ---- */}
        <div className="cd-header">
          {/* List badge */}
          {currentList && (
            <div className="cd-list-badge" style={{ background: '#4bce97' }}>
              {currentList.title}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            </div>
          )}

          {/* Title */}
          <div className="cd-title-row">
            <svg className="cd-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <textarea
              className="cd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
              rows={1}
              id="card-detail-title-input"
            />
          </div>
        </div>

        {/* ---- Action bar (horizontal pills) ---- */}
        <div className="cd-action-bar">
          <button type="button" className="cd-action-pill" onClick={() => setActivePopover('labels')}>
            <span className="cd-action-pill-plus" aria-hidden>+</span>
            <span>Add</span>
          </button>
          <button type="button" className="cd-action-pill" onClick={() => setActivePopover('dates')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span>Dates</span>
          </button>
          <button type="button" className="cd-action-pill" onClick={handleAddChecklist}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            <span>Checklist</span>
          </button>
          <button type="button" className="cd-action-pill" onClick={() => setActivePopover('members')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span>Members</span>
          </button>
          <button type="button" className="cd-action-pill" onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span>Attachment</span>
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="cd-body">
          {/* Main content */}
          <div className="cd-main">

            {/* Labels — always show row like Trello */}
            <div className="cd-section cd-section-compact">
              <div className="cd-label-title">Labels</div>
              <div className="cd-labels-row">
                {(card.labels || []).map(label => (
                  <button
                    key={label.id}
                    type="button"
                    className="cd-label-chip"
                    style={{ background: label.color }}
                    title={label.name}
                  >
                    {label.name}
                  </button>
                ))}
                <button type="button" className="cd-label-add-btn" onClick={() => setActivePopover('labels')} aria-label="Add label">+</button>
              </div>
            </div>

            {/* Members */}
            {(card.members || []).length > 0 && (
              <div className="cd-section">
                <div className="cd-label-title">Members</div>
                <div className="cd-members-row">
                  {card.members.map(member => (
                    <div key={member.id} className="cd-member-avatar" style={{ background: '#c377e0' }} title={member.name}>
                      {member.initials || member.name?.charAt(0)}
                    </div>
                  ))}
                  <button className="cd-member-add-btn" onClick={() => setActivePopover('members')}>+</button>
                </div>
              </div>
            )}

            {/* Due Date */}
            {card.due_date && (
              <div className="cd-section">
                <div className="cd-label-title">Due date</div>
                <div className={`cd-due-badge ${dueBadgeClass}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {dueBadgeClass === 'overdue' && ' (overdue)'}
                  {dueBadgeClass === 'due-soon' && ' (due soon)'}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="cd-section">
              <div className="cd-section-header">
                <svg className="cd-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                </svg>
                <h3 className="cd-section-title">Description</h3>
              </div>
              <textarea
                className="cd-description"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setIsEditingDesc(true); }}
                onFocus={() => setIsEditingDesc(true)}
                placeholder="Add a more detailed description..."
                rows={3}
                id="card-detail-description"
              />
              {isEditingDesc && (
                <div className="cd-desc-actions">
                  <button className="cd-btn-primary" onClick={handleDescSave}>Save</button>
                  <button className="cd-btn-cancel" onClick={() => { setDescription(card.description || ''); setIsEditingDesc(false); }}>Cancel</button>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="cd-section">
              <div className="cd-section-header cd-attachments-header">
                <svg className="cd-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <h3 className="cd-section-title">Attachments</h3>
                <button type="button" className="cd-attachment-add-btn" onClick={() => fileInputRef.current?.click()}>
                  Add
                </button>
              </div>
              <div className="cd-attachments-list">
                {attachments.map((att) => {
                  const href = getFileUrl(att.url || `/uploads/${att.stored_path}`);
                  const isImg = (att.mime_type || '').startsWith('image/');
                  return (
                    <div key={att.id} className="cd-attachment-row">
                      <a href={href} target="_blank" rel="noopener noreferrer" className="cd-attachment-thumb-wrap">
                        {isImg ? (
                          <img src={href} alt="" className="cd-attachment-thumb" />
                        ) : (
                          <div className="cd-attachment-doc">{att.mime_type === 'application/pdf' ? 'PDF' : 'FILE'}</div>
                        )}
                      </a>
                      <div className="cd-attachment-meta">
                        <div className="cd-attachment-name">{att.filename}</div>
                        <div className="cd-attachment-date">
                          Added {new Date(att.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="cd-attachment-row-actions">
                        {isImg && (
                          <button
                            type="button"
                            className="cd-attachment-link"
                            onClick={() =>
                              applyCover({
                                cover_color: null,
                                cover_image_path: att.url || `/uploads/${att.stored_path}`,
                              })
                            }
                          >
                            Make cover
                          </button>
                        )}
                        <button
                          type="button"
                          className="cd-attachment-link danger"
                          onClick={() => handleDeleteAttachment(att)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklists */}
            {checklists.map(checklist => {
              const items = checklist.items || [];
              const checked = items.filter(i => i.is_checked).length;
              const total = items.length;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

              return (
                <div key={checklist.id} className="cd-checklist">
                  <div className="cd-checklist-header">
                    <svg className="cd-checklist-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span className="cd-checklist-title">{checklist.title}</span>
                    <div className="cd-checklist-actions">
                      <button className="cd-checklist-btn">Hide checked items</button>
                      <button className="cd-checklist-btn" onClick={() => handleDeleteChecklist(checklist.id)}>Delete</button>
                    </div>
                  </div>

                  {total > 0 && (
                    <div className="cd-progress">
                      <span className="cd-progress-text">{pct}%</span>
                      <div className="cd-progress-track">
                        <div className={`cd-progress-fill ${pct === 100 ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {items.map(item => (
                    <div key={item.id} className="cd-check-item">
                      <input
                        type="checkbox"
                        className="cd-check-checkbox"
                        checked={item.is_checked}
                        onChange={() => handleToggleChecklistItem(item.id, item.is_checked)}
                      />
                      <span className={`cd-check-text ${item.is_checked ? 'checked' : ''}`}>
                        {item.content}
                      </span>
                      <div className="cd-check-hover-actions">
                        <button className="cd-check-hover-btn" title="Delete" onClick={() => handleDeleteChecklistItem(item.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add item */}
                  <div>
                    {addingItemTo === checklist.id ? (
                      <>
                        <input
                          className="cd-add-item-input"
                          placeholder="Add an item"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddChecklistItem(checklist.id);
                            if (e.key === 'Escape') { setAddingItemTo(null); setNewItemText(''); }
                          }}
                          autoFocus
                        />
                        <div className="cd-add-item-actions">
                          <button className="cd-btn-primary" onClick={() => handleAddChecklistItem(checklist.id)}>Add</button>
                          <button className="cd-btn-cancel" onClick={() => { setAddingItemTo(null); setNewItemText(''); }}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <button className="cd-add-item-btn" onClick={() => setAddingItemTo(checklist.id)}>
                        Add an item
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          </div>

          {/* ---- Sidebar: Comments & Activity ---- */}
          <div className="cd-sidebar">
            <div className="cd-sidebar-header">
              <div className="cd-sidebar-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Comments and activity
              </div>
              <button type="button" className="cd-show-details-btn">
                Show details
              </button>
            </div>
            <textarea
              className="cd-comment-input"
              placeholder="Write a comment..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
              rows={3}
            />
            <button type="button" className="cd-btn-primary cd-comment-save" onClick={handlePostComment}>
              Save
            </button>

            <div className="cd-timeline">
              {timeline.map((row) => {
                if (row.kind === 'comment') {
                  const c = row.data;
                  const m = c.member || {};
                  const initials = m.initials || m.name?.charAt(0) || '?';
                  return (
                    <div key={`c-${c.id}`} className="cd-timeline-item cd-comment-bubble">
                      <div className="cd-activity-avatar">{initials}</div>
                      <div className="cd-timeline-body">
                        <div className="cd-comment-head">
                          <span className="cd-comment-author">{m.name || 'Member'}</span>
                          <button type="button" className="cd-comment-time-link" title={new Date(c.created_at).toString()}>
                            {formatRelativeTime(c.created_at)}
                            {c.updated_at && c.updated_at !== c.created_at && ' (edited)'}
                          </button>
                          <span className="cd-comment-time-meta" aria-hidden>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          </span>
                        </div>
                        {editingComment === c.id ? (
                          <>
                            <textarea
                              className="cd-comment-edit"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              rows={3}
                            />
                            <div className="cd-comment-edit-actions">
                              <button type="button" className="cd-btn-primary" onClick={() => handleSaveEditComment(c.id)}>
                                Save
                              </button>
                              <button
                                type="button"
                                className="cd-btn-cancel"
                                onClick={() => {
                                  setEditingComment(null);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="cd-comment-bubble-box">
                              <p className="cd-comment-text">{c.body}</p>
                            </div>
                            <div className="cd-comment-links">
                              <button type="button" className="cd-comment-emoji" aria-label="Add reaction">
                                😊
                              </button>
                              <span className="cd-comment-dot">·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingComment(c.id);
                                  setEditCommentText(c.body);
                                }}
                              >
                                Edit
                              </button>
                              <span className="cd-comment-dot">·</span>
                              <button type="button" onClick={() => handleDeleteComment(c.id)}>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                const a = row.data;
                const meta = a.metadata || {};
                const name = a.member?.name || 'Someone';
                const initials = a.member?.initials || name.charAt(0);
                let activityBody = null;
                if (a.action_type === 'card_created') {
                  activityBody = (
                    <p className="cd-activity-text">
                      <strong>{name}</strong> added this card to {meta.list_title || 'a list'}
                    </p>
                  );
                } else if (a.action_type === 'card_moved') {
                  activityBody = (
                    <p className="cd-activity-text">
                      <strong>{name}</strong> moved this card from &quot;{meta.from_list_title || ''}&quot; to &quot;
                      {meta.to_list_title || ''}&quot;
                    </p>
                  );
                } else if (a.action_type === 'attachment_added') {
                  activityBody = (
                    <p className="cd-activity-text">
                      <strong>{name}</strong> attached &quot;{meta.filename || 'a file'}&quot;
                    </p>
                  );
                } else if (a.action_type === 'attachment_removed') {
                  activityBody = (
                    <p className="cd-activity-text">
                      <strong>{name}</strong> removed an attachment
                    </p>
                  );
                } else if (a.action_type === 'cover_changed') {
                  activityBody = (
                    <p className="cd-activity-text">
                      <strong>{name}</strong> updated the cover
                    </p>
                  );
                } else {
                  activityBody = (
                    <p className="cd-activity-text">
                      <strong>{name}</strong> updated this card
                    </p>
                  );
                }
                return (
                  <div key={`a-${a.id}`} className="cd-timeline-item cd-activity-row">
                    <div className="cd-activity-avatar">{initials}</div>
                    <div className="cd-timeline-body">
                      {activityBody}
                      <button type="button" className="cd-activity-time-link" title={new Date(a.created_at).toString()}>
                        {formatRelativeTime(a.created_at)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cd-sidebar-actions">
              <button type="button" className="cd-sidebar-action-btn" onClick={handleArchiveCard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                Archive
              </button>
              <button type="button" className="cd-sidebar-action-btn cd-sidebar-action-btn-danger" onClick={handleDeleteCard}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* ---- Popovers ---- */}

        {/* Labels Popover — Trello exact */}
        {activePopover === 'labels' && (
          <>
            <div className="cd-popover-overlay" onClick={() => setActivePopover(null)} />
            <div className="cd-popover">
              <div className="cd-popover-header">
                <span className="cd-popover-title">Labels</span>
                <button
                  type="button"
                  className="cd-popover-close"
                  onClick={() => {
                    setActivePopover(null);
                    setLabelSearch('');
                    setLabelCreateOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="cd-popover-body">
                <input
                  className="cd-labels-search"
                  placeholder="Search labels..."
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                  autoFocus
                />
                <div className="cd-labels-subtitle">Labels</div>
                {filteredLabels.map(label => {
                  const isActive = (card.labels || []).some(l => l.id === label.id);
                  return (
                    <div key={label.id} className="cd-label-option">
                      <input
                        type="checkbox"
                        className="cd-label-checkbox"
                        checked={isActive}
                        onChange={() => handleLabelToggle(label.id)}
                      />
                      <div
                        className="cd-label-bar"
                        style={{ background: label.color }}
                        onClick={() => handleLabelToggle(label.id)}
                      >
                        {label.name}
                      </div>
                      <button className="cd-label-edit-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {labelCreateOpen ? (
                  <div className="cd-create-label-form">
                    <label className="cd-create-label-field-label" htmlFor="cd-new-label-name">
                      Name
                    </label>
                    <input
                      id="cd-new-label-name"
                      className="cd-create-label-input"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Add a title (optional)"
                      maxLength={100}
                      disabled={labelCreateSaving}
                    />
                    <div className="cd-create-label-colors" role="group" aria-label="Label color">
                      {COVER_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`cd-create-label-swatch ${newLabelColor === c ? 'is-selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setNewLabelColor(c)}
                          disabled={labelCreateSaving}
                          title={c}
                          aria-label={`Select color ${c}`}
                          aria-pressed={newLabelColor === c}
                        />
                      ))}
                    </div>
                    <div className="cd-create-label-actions">
                      <button
                        type="button"
                        className="cd-btn-primary"
                        onClick={handleCreateNewLabel}
                        disabled={labelCreateSaving}
                      >
                        {labelCreateSaving ? 'Creating…' : 'Create'}
                      </button>
                      <button
                        type="button"
                        className="cd-btn-cancel"
                        onClick={() => {
                          setLabelCreateOpen(false);
                          setNewLabelName('');
                        }}
                        disabled={labelCreateSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cd-create-label-btn"
                    onClick={() => setLabelCreateOpen(true)}
                  >
                    Create a new label
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Members Popover */}
        {activePopover === 'members' && (
          <>
            <div className="cd-popover-overlay" onClick={() => setActivePopover(null)} />
            <div className="cd-popover">
              <div className="cd-popover-header">
                <span className="cd-popover-title">Members</span>
                <button className="cd-popover-close" onClick={() => setActivePopover(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="cd-popover-body">
                {(boardMembers || []).map(member => {
                  const isActive = (card.members || []).some(m => m.id === member.id);
                  return (
                    <div key={member.id} className="cd-member-option" onClick={() => handleMemberToggle(member.id)}>
                      <div className="cd-member-option-avatar">
                        {member.initials || member.name?.charAt(0)}
                      </div>
                      <span>{member.name}</span>
                      {isActive && <span className="cd-member-option-check">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Cover Popover */}
        {activePopover === 'cover' && (
          <>
            <div className="cd-popover-overlay" onClick={() => setActivePopover(null)} />
            <div className="cd-popover cd-popover-cover">
              <div className="cd-popover-header">
                <span className="cd-popover-title">Cover</span>
                <button type="button" className="cd-popover-close" onClick={() => setActivePopover(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="cd-popover-body">
                <button
                  type="button"
                  className="cd-cover-remove-full"
                  onClick={() => applyCover({ cover_color: null, cover_image_path: null })}
                >
                  Remove cover
                </button>
                <div className="cd-cover-label">Colors</div>
                <div className="cd-cover-colors">
                  {COVER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="cd-cover-swatch"
                      style={{ background: color }}
                      title={color}
                      onClick={() => applyCover({ cover_color: color, cover_image_path: null })}
                    />
                  ))}
                </div>
                {attachments.some((a) => (a.mime_type || '').startsWith('image/')) && (
                  <>
                    <div className="cd-cover-label">Attachments</div>
                    <div className="cd-cover-attachments">
                      {attachments
                        .filter((a) => (a.mime_type || '').startsWith('image/'))
                        .map((att) => {
                          const src = getFileUrl(att.url || `/uploads/${att.stored_path}`);
                          return (
                            <button
                              key={att.id}
                              type="button"
                              className="cd-cover-att-thumb"
                              onClick={() =>
                                applyCover({
                                  cover_color: null,
                                  cover_image_path: att.url || `/uploads/${att.stored_path}`,
                                })
                              }
                            >
                              <img src={src} alt="" />
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="cd-btn-primary cd-cover-upload-btn"
                  onClick={() => {
                    setActivePopover(null);
                    fileInputRef.current?.click();
                  }}
                >
                  Upload a cover image
                </button>
              </div>
            </div>
          </>
        )}

        {/* Dates Popover */}
        {activePopover === 'dates' && (
          <>
            <div className="cd-popover-overlay" onClick={() => setActivePopover(null)} />
            <div className="cd-popover">
              <div className="cd-popover-header">
                <span className="cd-popover-title">Due Date</span>
                <button className="cd-popover-close" onClick={() => setActivePopover(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="cd-popover-body">
                <input
                  type="date"
                  className="cd-date-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <div className="cd-date-actions">
                  <button className="cd-date-save" onClick={handleDueDateSave}>Save</button>
                  <button className="cd-date-remove" onClick={handleRemoveDueDate}>Remove</button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
