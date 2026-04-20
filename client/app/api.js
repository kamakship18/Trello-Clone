import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** For multipart uploads (no default JSON Content-Type) */
const formApi = axios.create({
  baseURL: API_BASE,
});

// === Board APIs ===
export const fetchBoards = () => api.get('/boards');
export const fetchBoard = (id) => api.get(`/boards/${id}`);
export const createBoard = (data) => api.post('/boards', data);
export const createBoardFromTemplate = (data) => api.post('/boards/from-template', data);
export const updateBoard = (id, data) => api.put(`/boards/${id}`, data);
export const deleteBoard = (id) => api.delete(`/boards/${id}`);
export const createBoardLabel = (boardId, data) => api.post(`/boards/${boardId}/labels`, data);
export const uploadBoardBackground = (boardId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return formApi.post(`/boards/${boardId}/background`, fd);
};

// === List APIs ===
export const createList = (data) => api.post('/lists', data);
export const updateList = (id, data) => api.put(`/lists/${id}`, data);
export const deleteList = (id) => api.delete(`/lists/${id}`);
export const reorderLists = (lists) => api.patch('/lists/reorder', { lists });
export const copyList = (id, data) => api.post(`/lists/${id}/copy`, data || {});
export const moveListToBoard = (id, data) => api.post(`/lists/${id}/move`, data);
export const moveAllCardsInList = (id, data) => api.post(`/lists/${id}/move-all-cards`, data);
export const sortListCards = (id, data) => api.patch(`/lists/${id}/sort-cards`, data);
export const archiveAllCardsInList = (id) => api.patch(`/lists/${id}/archive-all-cards`);

// === Card APIs ===
export const createCard = (data) => api.post('/cards', data);
export const fetchCard = (id) => api.get(`/cards/${id}`);
export const updateCard = (id, data) => api.put(`/cards/${id}`, data);
export const deleteCard = (id) => api.delete(`/cards/${id}`);
export const reorderCards = (cards, activity) =>
  api.patch('/cards/reorder', activity ? { cards, activity } : { cards });

export const uploadCardAttachment = (cardId, file, memberId) => {
  const fd = new FormData();
  fd.append('file', file);
  if (memberId) fd.append('member_id', String(memberId));
  return formApi.post(`/cards/${cardId}/attachments`, fd);
};

export const deleteCardAttachment = (cardId, attachmentId, memberId) =>
  api.delete(`/cards/${cardId}/attachments/${attachmentId}`, {
    params: memberId ? { member_id: memberId } : {},
  });

export const patchCardCover = (cardId, data) => api.patch(`/cards/${cardId}/cover`, data);

export const postComment = (cardId, body) => api.post(`/cards/${cardId}/comments`, body);
export const updateComment = (cardId, commentId, body) =>
  api.put(`/cards/${cardId}/comments/${commentId}`, body);
export const deleteComment = (cardId, commentId, memberId) =>
  api.delete(`/cards/${cardId}/comments/${commentId}`, {
    params: memberId ? { member_id: memberId } : {},
  });

// === Card Detail APIs ===
export const addCardLabel = (cardId, labelId) => api.post(`/cards/${cardId}/labels`, { label_id: labelId });
export const removeCardLabel = (cardId, labelId) => api.delete(`/cards/${cardId}/labels/${labelId}`);
export const addCardMember = (cardId, memberId) => api.post(`/cards/${cardId}/members`, { member_id: memberId });
export const removeCardMember = (cardId, memberId) => api.delete(`/cards/${cardId}/members/${memberId}`);

// === Checklist APIs ===
export const createChecklist = (cardId, title) => api.post(`/cards/${cardId}/checklists`, { title });
export const deleteChecklist = (checklistId) => api.delete(`/cards/checklists/${checklistId}`);
export const createChecklistItem = (checklistId, content) => api.post(`/cards/checklists/${checklistId}/items`, { content });
export const updateChecklistItem = (itemId, data) => api.put(`/cards/checklist-items/${itemId}`, data);
export const deleteChecklistItem = (itemId) => api.delete(`/cards/checklist-items/${itemId}`);

// === Search ===
export const searchCards = (boardId, query) =>
  api.get(`/cards/search?board_id=${boardId}&q=${encodeURIComponent(query)}`);

export default api;
