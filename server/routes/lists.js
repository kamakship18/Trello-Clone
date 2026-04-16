const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/lists — Create a list (pass board_id in body)
router.post('/', async (req, res) => {
  try {
    const { board_id, title } = req.body;
    if (!board_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'board_id and title are required' });
    }

    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM lists WHERE board_id = $1',
      [board_id]
    );
    const position = posRes.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [board_id, title.trim(), position]
    );

    res.status(201).json({ ...result.rows[0], cards: [] });
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// PATCH /api/lists/reorder — Bulk reorder lists (before /:id routes)
router.patch('/reorder', async (req, res) => {
  try {
    const { lists } = req.body;
    if (!lists || !Array.isArray(lists)) {
      return res.status(400).json({ error: 'lists array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const list of lists) {
        await client.query('UPDATE lists SET position = $1 WHERE id = $2', [list.position, list.id]);
      }
      await client.query('COMMIT');
      res.json({ message: 'Lists reordered' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error reordering lists:', err);
    res.status(500).json({ error: 'Failed to reorder lists' });
  }
});

// POST /api/lists/:id/copy — Duplicate list (optionally onto another board)
router.post('/:id/copy', async (req, res) => {
  const listId = parseInt(req.params.id, 10);
  const { board_id: targetBoardIdBody, title_suffix } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const srcRes = await client.query('SELECT * FROM lists WHERE id = $1', [listId]);
    if (srcRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'List not found' });
    }
    const src = srcRes.rows[0];
    const targetBoardId = targetBoardIdBody != null ? Number(targetBoardIdBody) : src.board_id;

    const posRes = await client.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM lists WHERE board_id = $1',
      [targetBoardId]
    );
    const newPos = posRes.rows[0].next_pos;
    const newTitle = `${src.title}${title_suffix || ' (copy)'}`;

    const insList = await client.query(
      `INSERT INTO lists (board_id, title, position, header_color, automation)
       VALUES ($1, $2, $3, $4, '{}'::jsonb) RETURNING *`,
      [targetBoardId, newTitle, newPos, src.header_color]
    );
    const newList = insList.rows[0];

    const cardsRes = await client.query(
      'SELECT * FROM cards WHERE list_id = $1 AND is_archived = FALSE ORDER BY position',
      [listId]
    );

    for (const card of cardsRes.rows) {
      const insCard = await client.query(
        `INSERT INTO cards (list_id, title, description, position, due_date, cover_color, cover_image_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          newList.id,
          card.title,
          card.description,
          card.position,
          card.due_date,
          card.cover_color,
          card.cover_image_path,
        ]
      );
      const newCardId = insCard.rows[0].id;

      await client.query(
        `INSERT INTO card_labels (card_id, label_id)
         SELECT $1, label_id FROM card_labels WHERE card_id = $2`,
        [newCardId, card.id]
      );
      await client.query(
        `INSERT INTO card_members (card_id, member_id)
         SELECT $1, member_id FROM card_members WHERE card_id = $2`,
        [newCardId, card.id]
      );

      const chRes = await client.query(
        'SELECT * FROM checklists WHERE card_id = $1 ORDER BY position',
        [card.id]
      );
      for (const ch of chRes.rows) {
        const nch = await client.query(
          'INSERT INTO checklists (card_id, title, position) VALUES ($1, $2, $3) RETURNING id',
          [newCardId, ch.title, ch.position]
        );
        const items = await client.query(
          'SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY position',
          [ch.id]
        );
        for (const it of items.rows) {
          await client.query(
            'INSERT INTO checklist_items (checklist_id, content, is_checked, position) VALUES ($1, $2, $3, $4)',
            [nch.rows[0].id, it.content, it.is_checked, it.position]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newList);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error copying list:', err);
    res.status(500).json({ error: 'Failed to copy list' });
  } finally {
    client.release();
  }
});

// POST /api/lists/:id/move — Move list to another board (cards follow)
router.post('/:id/move', async (req, res) => {
  const listId = parseInt(req.params.id, 10);
  const { board_id: nextBoardId } = req.body;
  if (nextBoardId == null) {
    return res.status(400).json({ error: 'board_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT * FROM lists WHERE id = $1', [listId]);
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'List not found' });
    }
    const prevBoardId = cur.rows[0].board_id;
    const posRes = await client.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM lists WHERE board_id = $1',
      [nextBoardId]
    );
    const nextPos = posRes.rows[0].next_pos;

    const result = await client.query(
      'UPDATE lists SET board_id = $1, position = $2 WHERE id = $3 RETURNING *',
      [nextBoardId, nextPos, listId]
    );

    if (prevBoardId !== Number(nextBoardId)) {
      await client.query(
        `DELETE FROM card_labels cl
         USING cards c
         WHERE cl.card_id = c.id AND c.list_id = $1`,
        [listId]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error moving list:', err);
    res.status(500).json({ error: 'Failed to move list' });
  } finally {
    client.release();
  }
});

// POST /api/lists/:id/move-all-cards — Move every card to another list on the same board
router.post('/:id/move-all-cards', async (req, res) => {
  const sourceListId = parseInt(req.params.id, 10);
  const { target_list_id } = req.body;
  if (!target_list_id) {
    return res.status(400).json({ error: 'target_list_id is required' });
  }
  const targetListId = parseInt(String(target_list_id), 10);
  if (targetListId === sourceListId) {
    return res.status(400).json({ error: 'Choose a different list' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const l1 = await client.query('SELECT id, board_id FROM lists WHERE id = $1', [sourceListId]);
    const l2 = await client.query('SELECT id, board_id FROM lists WHERE id = $1', [targetListId]);
    if (l1.rows.length === 0 || l2.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'List not found' });
    }
    if (l1.rows[0].board_id !== l2.rows[0].board_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Lists must be on the same board' });
    }

    const maxRes = await client.query(
      'SELECT COALESCE(MAX(position), 0) as m FROM cards WHERE list_id = $1 AND is_archived = FALSE',
      [targetListId]
    );
    let pos = maxRes.rows[0].m;
    const cards = await client.query(
      'SELECT id FROM cards WHERE list_id = $1 AND is_archived = FALSE ORDER BY position',
      [sourceListId]
    );
    for (const row of cards.rows) {
      pos += 1000;
      await client.query(
        'UPDATE cards SET list_id = $1, position = $2, updated_at = NOW() WHERE id = $3',
        [targetListId, pos, row.id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Cards moved' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error moving all cards:', err);
    res.status(500).json({ error: 'Failed to move cards' });
  } finally {
    client.release();
  }
});

function sortCardsRows(rows, sortBy) {
  const sorted = [...rows];
  if (sortBy === 'name_asc') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } else if (sortBy === 'created_desc') {
    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortBy === 'created_asc') {
    sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sortBy === 'due_asc') {
    sorted.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }
  return sorted;
}

// PATCH /api/lists/:id/sort-cards — Reorder cards in a list by rule
router.patch('/:id/sort-cards', async (req, res) => {
  try {
    const listId = parseInt(req.params.id, 10);
    const { sort_by } = req.body;
    const allowed = ['name_asc', 'created_desc', 'created_asc', 'due_asc'];
    if (!sort_by || !allowed.includes(sort_by)) {
      return res.status(400).json({ error: 'sort_by must be one of: ' + allowed.join(', ') });
    }

    const cardsRes = await pool.query(
      'SELECT * FROM cards WHERE list_id = $1 AND is_archived = FALSE',
      [listId]
    );
    const sorted = sortCardsRows(cardsRes.rows, sort_by);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let idx = 0; idx < sorted.length; idx++) {
        await client.query('UPDATE cards SET position = $1, updated_at = NOW() WHERE id = $2', [
          (idx + 1) * 1000,
          sorted[idx].id,
        ]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: 'Cards sorted' });
  } catch (err) {
    console.error('Error sorting cards:', err);
    res.status(500).json({ error: 'Failed to sort cards' });
  }
});

// PATCH /api/lists/:id/archive-all-cards
router.patch('/:id/archive-all-cards', async (req, res) => {
  try {
    const listId = parseInt(req.params.id, 10);
    await pool.query(
      'UPDATE cards SET is_archived = TRUE, updated_at = NOW() WHERE list_id = $1 AND is_archived = FALSE',
      [listId]
    );
    res.json({ message: 'Cards archived' });
  } catch (err) {
    console.error('Error archiving cards:', err);
    res.status(500).json({ error: 'Failed to archive cards' });
  }
});

// PUT /api/lists/:id — Update list
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position, is_archived, header_color, automation } = req.body;

    const fields = [];
    const values = [];
    let n = 1;

    if (title !== undefined) {
      fields.push(`title = $${n++}`);
      values.push(title);
    }
    if (position !== undefined) {
      fields.push(`position = $${n++}`);
      values.push(position);
    }
    if (is_archived !== undefined) {
      fields.push(`is_archived = $${n++}`);
      values.push(is_archived);
    }
    if (header_color !== undefined) {
      fields.push(`header_color = $${n++}`);
      values.push(header_color === '' ? null : header_color);
    }
    if (automation !== undefined) {
      fields.push(`automation = $${n++}::jsonb`);
      values.push(JSON.stringify(automation));
    }

    if (fields.length === 0) {
      const existing = await pool.query('SELECT * FROM lists WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'List not found' });
      }
      return res.json(existing.rows[0]);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE lists SET ${fields.join(', ')} WHERE id = $${n} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating list:', err);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:id — Delete list
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM lists WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json({ message: 'List deleted', list: result.rows[0] });
  } catch (err) {
    console.error('Error deleting list:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

module.exports = router;
