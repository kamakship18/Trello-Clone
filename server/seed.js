const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function seed() {
  const client = await pool.connect();

  try {
    // Run schema first
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✓ Schema created successfully');

    // Seed members
    await client.query(`
      INSERT INTO members (name, email, initials) VALUES
        ('Kamakshi Pandoh', 'kamakshi@example.com', 'KP'),
        ('Alex Johnson', 'alex@example.com', 'AJ'),
        ('Sarah Chen', 'sarah@example.com', 'SC'),
        ('Mike Rivera', 'mike@example.com', 'MR')
    `);
    console.log('✓ Members seeded');

    // Seed a board
    const boardRes = await client.query(`
      INSERT INTO boards (title, background) VALUES ('My Trello Board', '#7b68ee')
      RETURNING id
    `);
    const boardId = boardRes.rows[0].id;
    console.log('✓ Board created:', boardId);

    // Seed labels for the board
    await client.query(`
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Urgent', '#ef5350'),
        ($1, 'Feature', '#66bb6a'),
        ($1, 'Bug', '#ffa726'),
        ($1, 'Design', '#42a5f5'),
        ($1, 'Backend', '#ab47bc'),
        ($1, 'Frontend', '#26c6da')
    `, [boardId]);
    console.log('✓ Labels seeded');

    // Seed lists
    const listRes = await client.query(`
      INSERT INTO lists (board_id, title, position) VALUES
        ($1, 'To Do', 1000),
        ($1, 'In Progress', 2000),
        ($1, 'Review', 3000),
        ($1, 'Done', 4000)
      RETURNING id, title
    `, [boardId]);
    const lists = listRes.rows;
    console.log('✓ Lists seeded');

    // Seed cards into each list
    const todoId = lists[0].id;
    const inProgressId = lists[1].id;
    const reviewId = lists[2].id;
    const doneId = lists[3].id;

    const cardRes = await client.query(`
      INSERT INTO cards (list_id, title, description, position, due_date) VALUES
        ($1, 'Set up project structure', 'Initialize the repository with frontend and backend folders', 1000, NULL),
        ($1, 'Design database schema', 'Create tables for boards, lists, cards, labels, and members', 2000, '2026-04-20'),
        ($1, 'Create API endpoints', 'Build REST API for all CRUD operations', 3000, '2026-04-22'),
        ($2, 'Build board UI', 'Create the main board view with horizontal scrolling lists', 1000, '2026-04-18'),
        ($2, 'Implement drag and drop', 'Add drag and drop for cards and lists using @hello-pangea/dnd', 2000, NULL),
        ($3, 'Style card detail modal', 'Match Trello''s card detail overlay design', 1000, '2026-04-19'),
        ($4, 'Project kickoff', 'Initial planning and requirements gathering completed', 1000, NULL),
        ($4, 'Environment setup', 'Dev environment configured with Node.js, PostgreSQL, and Next.js', 2000, NULL)
      RETURNING id, title
    `, [todoId, inProgressId, reviewId, doneId]);
    const cards = cardRes.rows;
    console.log('✓ Cards seeded');

    // Assign some labels to cards
    const labelsRes = await client.query('SELECT id FROM labels WHERE board_id = $1 ORDER BY id', [boardId]);
    const labelIds = labelsRes.rows.map(r => r.id);

    await client.query(`
      INSERT INTO card_labels (card_id, label_id) VALUES
        ($1, $5),
        ($2, $6),
        ($3, $7),
        ($4, $8),
        ($4, $9)
    `, [cards[0].id, cards[1].id, cards[2].id, cards[3].id,
        labelIds[0], labelIds[1], labelIds[2], labelIds[3], labelIds[5]]);
    console.log('✓ Card labels assigned');

    // Assign some members to cards
    const membersRes = await client.query('SELECT id FROM members ORDER BY id');
    const memberIds = membersRes.rows.map(r => r.id);

    await client.query(`
      INSERT INTO card_members (card_id, member_id) VALUES
        ($1, $4),
        ($2, $5),
        ($3, $4),
        ($3, $6)
    `, [cards[0].id, cards[1].id, cards[3].id,
        memberIds[0], memberIds[1], memberIds[2]]);
    console.log('✓ Card members assigned');

    // Seed a checklist on one card
    const checklistRes = await client.query(`
      INSERT INTO checklists (card_id, title, position) VALUES
        ($1, 'Setup Tasks', 1000)
      RETURNING id
    `, [cards[0].id]);
    const checklistId = checklistRes.rows[0].id;

    await client.query(`
      INSERT INTO checklist_items (checklist_id, content, is_checked, position) VALUES
        ($1, 'Install Node.js dependencies', true, 1000),
        ($1, 'Configure ESLint', true, 2000),
        ($1, 'Set up Git repository', false, 3000),
        ($1, 'Create .env file', false, 4000)
    `, [checklistId]);
    console.log('✓ Checklists seeded');

    console.log('\n🎉 Database seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
