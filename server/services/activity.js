const pool = require('../db');

/**
 * Persist a card activity row (timeline).
 * action_type: card_created | card_moved | attachment_added | attachment_removed | comment_added | comment_edited | comment_deleted | cover_changed
 */
async function logActivity(cardId, memberId, actionType, metadata = {}) {
  await pool.query(
    `INSERT INTO card_activities (card_id, member_id, action_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [cardId, memberId || null, actionType, metadata]
  );
}

module.exports = { logActivity };
