/**
 * Compute full { id, list_id, position } updates for all cards affected by a drag-and-drop move.
 * Mirrors the optimistic MOVE_CARD reducer logic.
 */
export function computeCardMoveUpdates(lists, sourceListId, destListId, sourceIndex, destIndex) {
  const newLists = lists.map((l) => ({
    ...l,
    cards: (l.cards || []).map((c) => ({ ...c })),
  }));
  const sourceList = newLists.find((l) => l.id === sourceListId);
  const destList = newLists.find((l) => l.id === destListId);
  if (!sourceList || !destList) return [];

  const [movedCard] = sourceList.cards.splice(sourceIndex, 1);
  movedCard.list_id = destListId;
  destList.cards.splice(destIndex, 0, movedCard);

  destList.cards.forEach((card, idx) => {
    card.position = (idx + 1) * 1000;
  });
  if (sourceListId !== destListId) {
    sourceList.cards.forEach((card, idx) => {
      card.position = (idx + 1) * 1000;
    });
  }

  const updates = [];
  destList.cards.forEach((c) => {
    updates.push({ id: c.id, list_id: destList.id, position: c.position });
  });
  if (sourceListId !== destListId) {
    sourceList.cards.forEach((c) => {
      updates.push({ id: c.id, list_id: sourceList.id, position: c.position });
    });
  }
  return updates;
}
