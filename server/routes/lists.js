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

    // Get max position for this board
    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1000 as next_pos FROM lists WHERE board_id = $1',
      [board_id]
    );
    const position = posRes.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [board_id, title.trim(), position]
    );

    // Return list with empty cards array
    res.status(201).json({ ...result.rows[0], cards: [] });
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// PUT /api/lists/:id — Update list
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, position, is_archived } = req.body;

    const result = await pool.query(
      `UPDATE lists SET 
        title = COALESCE($1, title), 
        position = COALESCE($2, position),
        is_archived = COALESCE($3, is_archived)
      WHERE id = $4 RETURNING *`,
      [title, position, is_archived, id]
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

// PATCH /api/lists/reorder — Bulk reorder lists
router.patch('/reorder', async (req, res) => {
  try {
    const { lists } = req.body; // [{ id, position }]
    if (!lists || !Array.isArray(lists)) {
      return res.status(400).json({ error: 'lists array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const list of lists) {
        await client.query(
          'UPDATE lists SET position = $1 WHERE id = $2',
          [list.position, list.id]
        );
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

module.exports = router;
