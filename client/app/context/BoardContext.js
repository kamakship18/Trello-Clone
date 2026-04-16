'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';
import {
  fetchBoard as apiFetchBoard,
  createList as apiCreateList,
  updateList as apiUpdateList,
  deleteList as apiDeleteList,
  reorderLists as apiReorderLists,
  createCard as apiCreateCard,
  updateCard as apiUpdateCard,
  deleteCard as apiDeleteCard,
  reorderCards as apiReorderCards,
} from '../api';
import { computeCardMoveUpdates } from '../utils/cardMove';

const BoardContext = createContext(null);

const initialState = {
  board: null,
  lists: [],
  labels: [],
  members: [],
  loading: true,
  error: null,
};

function boardReducer(state, action) {
  switch (action.type) {
    case 'SET_BOARD':
      return {
        ...state,
        board: {
          id: action.payload.id,
          title: action.payload.title,
          background: action.payload.background,
        },
        lists: action.payload.lists || [],
        labels: action.payload.labels || [],
        members: action.payload.members || [],
        loading: false,
        error: null,
      };

    case 'UPDATE_BOARD':
      return {
        ...state,
        board: state.board ? { ...state.board, ...action.payload } : state.board,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, action.payload] };

    case 'UPDATE_LIST':
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload } : l
        ),
      };

    case 'DELETE_LIST':
      return {
        ...state,
        lists: state.lists.filter((l) => l.id !== action.payload),
      };

    case 'SET_LISTS':
      return { ...state, lists: action.payload };

    case 'ADD_CARD': {
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.payload.list_id
            ? { ...l, cards: [...(l.cards || []), action.payload] }
            : l
        ),
      };
    }

    case 'UPDATE_CARD': {
      return {
        ...state,
        lists: state.lists.map((l) => ({
          ...l,
          cards: (l.cards || []).map((c) =>
            c.id === action.payload.id ? { ...c, ...action.payload } : c
          ),
        })),
      };
    }

    case 'DELETE_CARD': {
      return {
        ...state,
        lists: state.lists.map((l) => ({
          ...l,
          cards: (l.cards || []).filter((c) => c.id !== action.payload),
        })),
      };
    }

    case 'MOVE_CARD': {
      const { cardId, sourceListId, destListId, sourceIndex, destIndex } = action.payload;
      const newLists = state.lists.map((l) => ({ ...l, cards: [...(l.cards || [])] }));

      const sourceList = newLists.find((l) => l.id === sourceListId);
      const destList = newLists.find((l) => l.id === destListId);

      if (!sourceList || !destList) return state;

      const [movedCard] = sourceList.cards.splice(sourceIndex, 1);
      movedCard.list_id = destListId;
      destList.cards.splice(destIndex, 0, movedCard);

      // Recalculate positions
      destList.cards.forEach((card, idx) => {
        card.position = (idx + 1) * 1000;
      });

      if (sourceListId !== destListId) {
        sourceList.cards.forEach((card, idx) => {
          card.position = (idx + 1) * 1000;
        });
      }

      return { ...state, lists: newLists };
    }

    case 'REORDER_LISTS': {
      const { sourceIndex, destIndex } = action.payload;
      const newLists = [...state.lists];
      const [moved] = newLists.splice(sourceIndex, 1);
      newLists.splice(destIndex, 0, moved);

      newLists.forEach((list, idx) => {
        list.position = (idx + 1) * 1000;
      });

      return { ...state, lists: newLists };
    }

    default:
      return state;
  }
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const { lists, members, board } = state;

  /**
   * Load board from API. Use `{ silent: true }` after card/actions so the board view
   * does not swap to the full-page "Loading board..." spinner (SPA-style refresh).
   */
  const loadBoard = useCallback(async (boardId, options = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      dispatch({ type: 'SET_LOADING', payload: true });
    }
    try {
      const res = await apiFetchBoard(boardId);
      dispatch({ type: 'SET_BOARD', payload: res.data });
    } catch (err) {
      if (!silent) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      } else {
        console.error('Silent board refresh failed:', err);
      }
    }
  }, []);

  const addList = useCallback(async (boardId, title) => {
    try {
      const res = await apiCreateList({ board_id: boardId, title });
      dispatch({ type: 'ADD_LIST', payload: res.data });
      return res.data;
    } catch (err) {
      console.error('Failed to add list:', err);
    }
  }, []);

  const editList = useCallback(async (listId, data) => {
    try {
      const res = await apiUpdateList(listId, data);
      dispatch({ type: 'UPDATE_LIST', payload: res.data });
    } catch (err) {
      console.error('Failed to update list:', err);
    }
  }, []);

  const removeList = useCallback(async (listId) => {
    try {
      await apiDeleteList(listId);
      dispatch({ type: 'DELETE_LIST', payload: listId });
    } catch (err) {
      console.error('Failed to delete list:', err);
    }
  }, []);

  const addCard = useCallback(async (listId, title) => {
    try {
      const res = await apiCreateCard({
        list_id: listId,
        title,
        member_id: members?.[0]?.id,
      });
      dispatch({ type: 'ADD_CARD', payload: res.data });
      return res.data;
    } catch (err) {
      console.error('Failed to add card:', err);
    }
  }, [members]);

  const editCard = useCallback(async (cardId, data) => {
    try {
      const res = await apiUpdateCard(cardId, data);
      dispatch({ type: 'UPDATE_CARD', payload: res.data });
    } catch (err) {
      console.error('Failed to update card:', err);
    }
  }, []);

  const removeCard = useCallback(async (cardId) => {
    try {
      await apiDeleteCard(cardId);
      dispatch({ type: 'DELETE_CARD', payload: cardId });
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  }, []);

  const moveCard = useCallback(
    async (cardId, sourceListId, destListId, sourceIndex, destIndex) => {
      const updates = computeCardMoveUpdates(lists, sourceListId, destListId, sourceIndex, destIndex);
      const sourceList = lists.find((l) => l.id === sourceListId);
      const destList = lists.find((l) => l.id === destListId);
      const activity = {
        member_id: members?.[0]?.id,
        card_id: cardId,
        from_list_id: sourceListId,
        to_list_id: destListId,
        from_list_title: sourceList?.title,
        to_list_title: destList?.title,
      };

      dispatch({
        type: 'MOVE_CARD',
        payload: { cardId, sourceListId, destListId, sourceIndex, destIndex },
      });

      try {
        await apiReorderCards(updates, activity);
      } catch (err) {
        console.error('Failed to move card:', err);
        if (board?.id) loadBoard(board.id, { silent: true });
      }
    },
    [lists, members, board?.id, loadBoard]
  );

  const moveList = useCallback(
    async (sourceIndex, destIndex) => {
      dispatch({
        type: 'REORDER_LISTS',
        payload: { sourceIndex, destIndex },
      });

      try {
        const listsToUpdate = [];
        const tempLists = [...lists];
        const [moved] = tempLists.splice(sourceIndex, 1);
        tempLists.splice(destIndex, 0, moved);
        tempLists.forEach((list, idx) => {
          listsToUpdate.push({ id: list.id, position: (idx + 1) * 1000 });
        });

        await apiReorderLists(listsToUpdate);
      } catch (err) {
        console.error('Failed to reorder lists:', err);
      }
    },
    [lists]
  );

  const updateBoardState = useCallback((partial) => {
    dispatch({ type: 'UPDATE_BOARD', payload: partial });
  }, []);

  /** Merge fields into a single card across lists — no network (for labels/members after API). */
  const mergeCardInBoard = useCallback((cardId, partial) => {
    dispatch({ type: 'UPDATE_CARD', payload: { id: cardId, ...partial } });
  }, []);

  const value = {
    ...state,
    dispatch,
    loadBoard,
    updateBoardState,
    mergeCardInBoard,
    addList,
    editList,
    removeList,
    addCard,
    editCard,
    removeCard,
    moveCard,
    moveList,
    currentMemberId: members?.[0]?.id ?? null,
  };

  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
}

export default BoardContext;
