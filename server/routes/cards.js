const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pool = require('../db');
const { logActivity } = require('../services/activity');
const { uploadCardFile, uploadsRoot } = require('../middleware/uploadCard');

function publicUploadUrl(relPath) {
  return `/uploads/${relPath.replace(/^\//, '')}`;
}

// POST /api/cards — Create a card
router.post('/', async (req, res) => {
  try {
    const { list_id, title, member_id } = req.body;
    if (!list_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'list_id and title are required' });
    }

    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM cards WHERE list_id = $1',
      [list_id]
    );
    const position = posRes.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO cards (list_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [list_id, title.trim(), position]
    );
    const card = result.rows[0];

    const listRes = await pool.query('SELECT title FROM lists WHERE id = $1', [list_id]);
    const listTitle = listRes.rows[0]?.title || '';

    await logActivity(card.id, member_id || null, 'card_created', { list_title: listTitle });

    res.status(201).json({ ...card, labels: [], members: [] });
  } catch (err) {
    console.error('Error creating card:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, board_id } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const result = await pool.query(
      `SELECT c.*, l.title as list_title
      FROM cards c 
      JOIN lists l ON c.list_id = l.id
      WHERE l.board_id = $1 
        AND c.is_archived = FALSE 
        AND c.title ILIKE $2
      ORDER BY c.updated_at DESC`,
      [board_id, `%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error searching cards:', err);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

router.patch('/reorder', async (req, res) => {
  try {
    const { cards, activity } = req.body;
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'cards array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const card of cards) {
        await client.query(
          'UPDATE cards SET list_id = $1, position = $2, updated_at = NOW() WHERE id = $3',
          [card.list_id, card.position, card.id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (activity && activity.card_id) {
      await logActivity(activity.card_id, activity.member_id || null, 'card_moved', {
        from_list_id: activity.from_list_id,
        to_list_id: activity.to_list_id,
        from_list_title: activity.from_list_title,
        to_list_title: activity.to_list_title,
      });
    }

    res.json({ message: 'Cards reordered' });
  } catch (err) {
    console.error('Error reordering cards:', err);
    res.status(500).json({ error: 'Failed to reorder cards' });
  }
});

// --- Attachments (before /:id GET) ---
router.post('/:id/attachments', uploadCardFile.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const member_id = req.body.member_id ? parseInt(req.body.member_id, 10) : null;

    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const relPath = `cards/${req.file.filename}`;
    const ins = await pool.query(
      `INSERT INTO attachments (card_id, filename, stored_path, mime_type, file_size, member_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        id,
        req.file.originalname || req.file.filename,
        relPath,
        req.file.mimetype,
        req.file.size,
        member_id,
      ]
    );

    const row = ins.rows[0];
    await logActivity(parseInt(id, 10), member_id, 'attachment_added', {
      filename: row.filename,
      attachment_id: row.id,
    });

    res.status(201).json({
      ...row,
      url: publicUploadUrl(row.stored_path),
    });
  } catch (err) {
    console.error('Error uploading attachment:', err);
    res.status(500).json({ error: err.message || 'Failed to upload' });
  }
});

router.delete('/:cardId/attachments/:attachmentId', async (req, res) => {
  try {
    const { cardId, attachmentId } = req.params;
    const member_id = req.query.member_id ? parseInt(req.query.member_id, 10) : null;

    const attRes = await pool.query(
      'SELECT * FROM attachments WHERE id = $1 AND card_id = $2',
      [attachmentId, cardId]
    );
    if (attRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    const att = attRes.rows[0];

    const diskPath = path.join(uploadsRoot, att.stored_path);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (e) {
        console.warn('Could not delete file', diskPath, e.message);
      }
    }

    await pool.query(
      `UPDATE cards SET cover_image_path = NULL, updated_at = NOW()
       WHERE id = $1 AND cover_image_path = $2`,
      [cardId, publicUploadUrl(att.stored_path)]
    );

    await pool.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

    await logActivity(parseInt(cardId, 10), member_id, 'attachment_removed', {
      filename: att.filename,
      attachment_id: parseInt(attachmentId, 10),
    });

    res.json({ message: 'Attachment removed' });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// --- Comments ---
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id, body } = req.body;
    if (!member_id || !body || !String(body).trim()) {
      return res.status(400).json({ error: 'member_id and body are required' });
    }

    const ins = await pool.query(
      `INSERT INTO comments (card_id, member_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [id, member_id, String(body).trim()]
    );

    const comment = ins.rows[0];
    const mem = await pool.query('SELECT id, name, initials, avatar_url FROM members WHERE id = $1', [member_id]);

    res.status(201).json({ ...comment, member: mem.rows[0] });
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.put('/:cardId/comments/:commentId', async (req, res) => {
  try {
    const { cardId, commentId } = req.params;
    const { body, member_id } = req.body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'body is required' });
    }

    const own = await pool.query('SELECT * FROM comments WHERE id = $1 AND card_id = $2', [commentId, cardId]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (member_id && own.rows[0].member_id !== parseInt(member_id, 10)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const result = await pool.query(
      `UPDATE comments SET body = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [String(body).trim(), commentId]
    );

    const mem = await pool.query('SELECT id, name, initials, avatar_url FROM members WHERE id = $1', [
      result.rows[0].member_id,
    ]);

    res.json({ ...result.rows[0], member: mem.rows[0] });
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.delete('/:cardId/comments/:commentId', async (req, res) => {
  try {
    const { cardId, commentId } = req.params;
    const { member_id } = req.query;

    const own = await pool.query('SELECT * FROM comments WHERE id = $1 AND card_id = $2', [commentId, cardId]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (member_id && own.rows[0].member_id !== parseInt(member_id, 10)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// --- Cover ---
router.patch('/:id/cover', async (req, res) => {
  try {
    const { id } = req.params;
    const { cover_color, cover_image_path, member_id } = req.body;

    const result = await pool.query(
      `UPDATE cards SET
        cover_color = $1,
        cover_image_path = $2,
        updated_at = NOW()
      WHERE id = $3 RETURNING *`,
      [cover_color || null, cover_image_path || null, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Card not found' });

    await logActivity(parseInt(id, 10), member_id || null, 'cover_changed', {
      cover_color: result.rows[0].cover_color,
      cover_image_path: result.rows[0].cover_image_path,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating cover:', err);
    res.status(500).json({ error: 'Failed to update cover' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cardRes = await pool.query(
      `SELECT c.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color))
            FILTER (WHERE l.id IS NOT NULL), '[]'
        ) as labels,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', m.id, 'name', m.name, 'initials', m.initials, 'avatar_url', m.avatar_url))
            FILTER (WHERE m.id IS NOT NULL), '[]'
        ) as members
      FROM cards c
      LEFT JOIN card_labels cl ON c.id = cl.card_id
      LEFT JOIN labels l ON cl.label_id = l.id
      LEFT JOIN card_members cm ON c.id = cm.card_id
      LEFT JOIN members m ON cm.member_id = m.id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );

    if (cardRes.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cardRes.rows[0];

    const attRes = await pool.query(
      'SELECT * FROM attachments WHERE card_id = $1 ORDER BY created_at ASC',
      [id]
    );
    card.attachments = attRes.rows.map((a) => ({
      ...a,
      url: publicUploadUrl(a.stored_path),
    }));

    const comRes = await pool.query(
      `SELECT c.*, json_build_object('id', m.id, 'name', m.name, 'initials', m.initials, 'avatar_url', m.avatar_url) as member
       FROM comments c
       JOIN members m ON c.member_id = m.id
       WHERE c.card_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    card.comments = comRes.rows.map((row) => ({
      ...row,
      member: row.member,
    }));

    const actRes = await pool.query(
      `SELECT a.*, json_build_object('id', m.id, 'name', m.name, 'initials', m.initials) as member
       FROM card_activities a
       LEFT JOIN members m ON a.member_id = m.id
       WHERE a.card_id = $1
       ORDER BY a.created_at ASC`,
      [id]
    );
    card.activities = actRes.rows;

    const checklistsRes = await pool.query(
      `SELECT ch.*,
        COALESCE(
          json_agg(
            json_build_object('id', ci.id, 'content', ci.content, 'is_checked', ci.is_checked, 'position', ci.position)
            ORDER BY ci.position
          ) FILTER (WHERE ci.id IS NOT NULL), '[]'
        ) as items
      FROM checklists ch
      LEFT JOIN checklist_items ci ON ch.id = ci.checklist_id
      WHERE ch.card_id = $1
      GROUP BY ch.id
      ORDER BY ch.position`,
      [id]
    );

    card.checklists = checklistsRes.rows;
    res.json(card);
  } catch (err) {
    console.error('Error fetching card:', err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let paramIdx = 1;

    const allowedFields = [
      'title',
      'description',
      'position',
      'list_id',
      'due_date',
      'is_archived',
      'cover_color',
      'cover_image_path',
    ];
    for (const field of allowedFields) {
      if (field in req.body) {
        fields.push(`${field} = $${paramIdx}`);
        values.push(req.body[field]);
        paramIdx++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE cards SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cards WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card deleted', card: result.rows[0] });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

router.post('/:id/labels', async (req, res) => {
  try {
    const { id } = req.params;
    const { label_id } = req.body;

    await pool.query('INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, label_id]);

    res.json({ message: 'Label added' });
  } catch (err) {
    console.error('Error adding label:', err);
    res.status(500).json({ error: 'Failed to add label' });
  }
});

router.delete('/:id/labels/:labelId', async (req, res) => {
  try {
    const { id, labelId } = req.params;

    await pool.query('DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2', [id, labelId]);

    res.json({ message: 'Label removed' });
  } catch (err) {
    console.error('Error removing label:', err);
    res.status(500).json({ error: 'Failed to remove label' });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id } = req.body;

    await pool.query(
      'INSERT INTO card_members (card_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, member_id]
    );

    res.json({ message: 'Member added' });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params;

    await pool.query('DELETE FROM card_members WHERE card_id = $1 AND member_id = $2', [id, memberId]);

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

router.post('/:id/checklists', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM checklists WHERE card_id = $1',
      [id]
    );

    const result = await pool.query(
      'INSERT INTO checklists (card_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [id, title || 'Checklist', posRes.rows[0].next_pos]
    );

    res.status(201).json({ ...result.rows[0], items: [] });
  } catch (err) {
    console.error('Error creating checklist:', err);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

router.delete('/checklists/:checklistId', async (req, res) => {
  try {
    const { checklistId } = req.params;
    await pool.query('DELETE FROM checklists WHERE id = $1', [checklistId]);
    res.json({ message: 'Checklist deleted' });
  } catch (err) {
    console.error('Error deleting checklist:', err);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

router.post('/checklists/:checklistId/items', async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { content } = req.body;

    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM checklist_items WHERE checklist_id = $1',
      [checklistId]
    );

    const result = await pool.query(
      'INSERT INTO checklist_items (checklist_id, content, position) VALUES ($1, $2, $3) RETURNING *',
      [checklistId, content, posRes.rows[0].next_pos]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating checklist item:', err);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

router.put('/checklist-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { content, is_checked } = req.body;

    const result = await pool.query(
      `UPDATE checklist_items SET
        content = COALESCE($1, content),
        is_checked = COALESCE($2, is_checked)
      WHERE id = $3 RETURNING *`,
      [content, is_checked, itemId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating checklist item:', err);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

router.delete('/checklist-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await pool.query('DELETE FROM checklist_items WHERE id = $1', [itemId]);
    res.json({ message: 'Checklist item deleted' });
  } catch (err) {
    console.error('Error deleting checklist item:', err);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

module.exports = router;
