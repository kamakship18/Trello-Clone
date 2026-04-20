const express = require('express');
const router = express.Router();
const pool = require('../db');
const { uploadBoardBg } = require('../middleware/uploadCard');
const { TEMPLATE_IDS, applyTemplate, getDefaultTitle } = require('../services/boardTemplates');

// GET /api/boards — List all boards
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM boards ORDER BY updated_at DESC NULLS LAST, created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching boards:', err);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// POST /api/boards — Create a new board
router.post('/', async (req, res) => {
  try {
    const { title, background } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      'INSERT INTO boards (title, background) VALUES ($1, $2) RETURNING *',
      [title.trim(), background || '#7b68ee']
    );

    // Create default labels for the board
    const boardId = result.rows[0].id;
    await pool.query(`
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Urgent', '#ef5350'),
        ($1, 'Feature', '#66bb6a'),
        ($1, 'Bug', '#ffa726'),
        ($1, 'Design', '#42a5f5'),
        ($1, 'Backend', '#ab47bc'),
        ($1, 'Frontend', '#26c6da')
    `, [boardId]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating board:', err);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// POST /api/boards/from-template — Create board with lists, cards, labels (must be before /:id routes)
router.post('/from-template', async (req, res) => {
  const { templateId, title, background } = req.body;
  if (!templateId || !TEMPLATE_IDS.includes(templateId)) {
    return res.status(400).json({ error: 'Valid templateId is required' });
  }

  const trimmed = title != null && String(title).trim() ? String(title).trim() : '';
  const boardTitle = trimmed || `${getDefaultTitle(templateId)} board`;
  const bg = background != null && String(background).trim() ? String(background).trim() : '#7b68ee';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const boardRes = await client.query(
      'INSERT INTO boards (title, background) VALUES ($1, $2) RETURNING *',
      [boardTitle, bg]
    );
    const board = boardRes.rows[0];

    const memRes = await client.query('SELECT id FROM members ORDER BY id');
    const memberIds = memRes.rows.map((r) => r.id);

    await applyTemplate(client, board.id, templateId, memberIds);

    await client.query('COMMIT');
    res.status(201).json(board);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating board from template:', err);
    res.status(500).json({ error: 'Failed to create board from template' });
  } finally {
    client.release();
  }
});

// POST /api/boards/:id/background — upload background image (before GET :id if same path segment)
router.post('/:id/background', uploadBoardBg.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }
    const rel = `boards/${req.file.filename}`;
    const bg = `/uploads/${rel}`;
    const result = await pool.query(
      'UPDATE boards SET background = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [bg, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error uploading board background:', err);
    res.status(500).json({ error: 'Failed to upload background' });
  }
});

// POST /api/boards/:id/labels — Create a label on a board
router.post('/:id/labels', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    if (!color || typeof color !== 'string' || !color.trim()) {
      return res.status(400).json({ error: 'color is required' });
    }
    const boardCheck = await pool.query('SELECT id FROM boards WHERE id = $1', [id]);
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const nm = name != null && String(name).trim() ? String(name).trim().slice(0, 100) : '';
    const col = color.trim().slice(0, 30);
    const result = await pool.query(
      'INSERT INTO labels (board_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [id, nm, col]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating label:', err);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// GET /api/boards/:id — Get board with all lists, cards, labels, members
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the board
    const boardRes = await pool.query('SELECT * FROM boards WHERE id = $1', [id]);
    if (boardRes.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const board = boardRes.rows[0];

    // Get lists
    const listsRes = await pool.query(
      'SELECT * FROM lists WHERE board_id = $1 AND is_archived = FALSE ORDER BY position',
      [id]
    );

    // Get all cards for these lists
    const listIds = listsRes.rows.map(l => l.id);
    let cards = [];
    if (listIds.length > 0) {
      const cardsRes = await pool.query(
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
        WHERE c.list_id = ANY($1) AND c.is_archived = FALSE
        GROUP BY c.id
        ORDER BY c.position`,
        [listIds]
      );
      cards = cardsRes.rows;
    }

    // Get all labels for this board
    const labelsRes = await pool.query(
      'SELECT * FROM labels WHERE board_id = $1 ORDER BY id',
      [id]
    );

    // Get all members
    const membersRes = await pool.query('SELECT * FROM members ORDER BY name');

    // Nest cards into their lists
    const lists = listsRes.rows.map(list => ({
      ...list,
      cards: cards.filter(c => c.list_id === list.id),
    }));

    res.json({
      ...board,
      lists,
      labels: labelsRes.rows,
      members: membersRes.rows,
    });
  } catch (err) {
    console.error('Error fetching board:', err);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// PUT /api/boards/:id — Update board
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, background } = req.body;

    const result = await pool.query(
      `UPDATE boards SET 
        title = COALESCE($1, title), 
        background = COALESCE($2, background),
        updated_at = NOW()
      WHERE id = $3 RETURNING *`,
      [title, background, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating board:', err);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

// DELETE /api/boards/:id — Delete board
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM boards WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json({ message: 'Board deleted', board: result.rows[0] });
  } catch (err) {
    console.error('Error deleting board:', err);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

module.exports = router;
