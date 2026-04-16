/**
 * Demo seed — rich enough for evaluators (labels, members, due dates, checklists, comments,
 * activities), small enough for fast loads (~3 boards, ~50 cards). Re-run anytime: npm run seed
 */
const pool = require('./db');
const fs = require('fs');
const path = require('path');

function sqlPairs(n, cols) {
  const per = cols;
  return Array.from({ length: n }, (_, i) => {
    const o = i * per;
    return `(${Array.from({ length: per }, (_, j) => `$${o + j + 1}`).join(', ')})`;
  }).join(', ');
}

async function seed() {
  const client = await pool.connect();

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✓ Schema created successfully');

    await client.query('BEGIN');

    await client.query(`
      INSERT INTO members (name, email, initials) VALUES
        ('Kamakshi Pandoh', 'kamakshi@example.com', 'KP'),
        ('Alex Johnson', 'alex@example.com', 'AJ'),
        ('Sarah Chen', 'sarah@example.com', 'SC'),
        ('Mike Rivera', 'mike@example.com', 'MR'),
        ('Jordan Lee', 'jordan@example.com', 'JL'),
        ('Priya Nair', 'priya@example.com', 'PN')
    `);
    const membersRes = await client.query('SELECT id FROM members ORDER BY id');
    const M = membersRes.rows.map((r) => r.id);

    // ——— Board 1: primary demo (most content) ———
    const b1 = await client.query(
      `INSERT INTO boards (title, background) VALUES ($1, $2) RETURNING id`,
      ['Product launch — Q2 2026', '#0079bf']
    );
    const id1 = b1.rows[0].id;

    await client.query(
      `
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Urgent', '#ef5350'),
        ($1, 'Feature', '#66bb6a'),
        ($1, 'Bug', '#ffa726'),
        ($1, 'Design', '#42a5f5'),
        ($1, 'Backend', '#ab47bc'),
        ($1, 'Frontend', '#26c6da'),
        ($1, 'Docs', '#b3bec5')
    `,
      [id1]
    );
    const L1 = (await client.query('SELECT id FROM labels WHERE board_id = $1 ORDER BY id', [id1])).rows.map(
      (r) => r.id
    );

    const lists1 = await client.query(
      `
      INSERT INTO lists (board_id, title, position, header_color) VALUES
        ($1, 'Ideas & discovery', 1000, NULL),
        ($1, 'Prioritized', 2000, NULL),
        ($1, 'In development', 3000, '#f2d600'),
        ($1, 'QA & review', 4000, NULL),
        ($1, 'Shipped', 5000, '#61bd4f'),
        ($1, 'Later', 6000, NULL)
      RETURNING id
    `,
      [id1]
    );
    const l1 = lists1.rows.map((r) => r.id);

    const cardRows = await client.query(
      `
      INSERT INTO cards (list_id, title, description, position, due_date) VALUES
        ($1, 'Interview 12 power users', 'Synthesize themes for onboarding pain points.', 1000, '2026-05-02'),
        ($1, 'Competitive scan: Notion vs Linear', 'Pricing + sharing model notes.', 2000, NULL),
        ($1, 'Define “activation” metric', 'Align with analytics — single north-star for v1.', 3000, '2026-05-05'),
        ($1, 'Draft problem statement', 'One paragraph for leadership review.', 4000, NULL),
        ($2, 'Finalize MVP scope doc', 'Cut scope to 6 weeks; link roadmap.', 1000, '2026-04-28'),
        ($2, 'API contract for boards/lists', 'OpenAPI stub + error codes.', 2000, '2026-04-30'),
        ($2, 'Design review: board shell', 'Figma + redlines for dev handoff.', 3000, NULL),
        ($2, 'Risk register update', 'Top 5 risks with owners.', 4000, NULL),
        ($3, 'Implement list reorder endpoint', 'PATCH batch + transaction.', 1000, '2026-04-25'),
        ($3, 'Board menu: background upload', 'Multer + size limits.', 2000, NULL),
        ($3, 'Card detail: comments thread', 'Optimistic UI + silent refresh.', 3000, '2026-04-26'),
        ($3, 'E2E: drag card across lists', 'Playwright smoke path.', 4000, NULL),
        ($4, 'Regression pass on Safari', 'D&D + modals.', 1000, '2026-04-24'),
        ($4, 'Accessibility spot check', 'Focus traps in card modal.', 2000, NULL),
        ($4, 'Copy review for empty states', 'Board + list zero states.', 3000, NULL),
        ($5, 'v1.0 release notes', 'Published to Notion + email draft.', 1000, NULL),
        ($5, 'Postmortem: launch', 'What we shipped vs planned.', 2000, NULL),
        ($6, 'Dark mode exploration', 'Out of scope for Q2; park here.', 1000, NULL),
        ($6, 'Mobile native shell', 'Future — keep research links.', 2000, NULL),
        ($6, 'Integrations backlog', 'Slack, calendar — prioritize later.', 3000, NULL)
      RETURNING id, list_id
    `,
      [l1[0], l1[1], l1[2], l1[3], l1[4], l1[5]]
    );
    const c1 = cardRows.rows.map((r) => r.id);

    const b1LabelPairs = [
      [c1[0], L1[0]],
      [c1[1], L1[1]],
      [c1[2], L1[2]],
      [c1[3], L1[3]],
      [c1[4], L1[0]],
      [c1[4], L1[5]],
      [c1[5], L1[4]],
      [c1[6], L1[3]],
      [c1[7], L1[5]],
      [c1[8], L1[4]],
      [c1[9], L1[2]],
      [c1[10], L1[4]],
      [c1[11], L1[5]],
      [c1[12], L1[0]],
      [c1[13], L1[1]],
      [c1[14], L1[3]],
      [c1[15], L1[6]],
      [c1[16], L1[1]],
      [c1[17], L1[2]],
      [c1[18], L1[0]],
      [c1[19], L1[3]],
    ];
    await client.query(
      `INSERT INTO card_labels (card_id, label_id) VALUES ${sqlPairs(b1LabelPairs.length, 2)}`,
      b1LabelPairs.flat()
    );

    const b1MemPairs = [
      [c1[0], M[0]],
      [c1[0], M[1]],
      [c1[1], M[2]],
      [c1[4], M[0]],
      [c1[4], M[3]],
      [c1[8], M[0]],
      [c1[8], M[1]],
      [c1[9], M[2]],
      [c1[12], M[4]],
      [c1[13], M[0]],
    ];
    await client.query(
      `INSERT INTO card_members (card_id, member_id) VALUES ${sqlPairs(b1MemPairs.length, 2)}`,
      b1MemPairs.flat()
    );

    const ch1 = await client.query(
      `INSERT INTO checklists (card_id, title, position) VALUES ($1, 'Discovery checklist', 1000) RETURNING id`,
      [c1[0]]
    );
    await client.query(
      `
      INSERT INTO checklist_items (checklist_id, content, is_checked, position) VALUES
        ($1, 'Recruit participants', true, 1000),
        ($1, 'Send consent forms', true, 2000),
        ($1, 'Schedule calls', false, 3000),
        ($1, 'Export notes to doc', false, 4000)
    `,
      [ch1.rows[0].id]
    );

    const ch2 = await client.query(
      `INSERT INTO checklists (card_id, title, position) VALUES ($1, 'Release checklist', 1000) RETURNING id`,
      [c1[15]]
    );
    await client.query(
      `
      INSERT INTO checklist_items (checklist_id, content, is_checked, position) VALUES
        ($1, 'Tag release in Git', true, 1000),
        ($1, 'Deploy to production', true, 2000),
        ($1, 'Smoke test board load', false, 3000)
    `,
      [ch2.rows[0].id]
    );

    const b1Comments = [
      [c1[0], M[0], "Let's prioritize the top 5 quotes for the deck."],
      [c1[0], M[1], 'Agreed — I will add a column for "severity".'],
      [c1[4], M[0], 'Scope doc link is in the drive — please comment by EOD.'],
      [c1[8], M[2], 'Using pg batch updates — see PR #112.'],
      [c1[9], M[0], 'Can we cap uploads at 4MB?'],
      [c1[12], M[4], 'Safari 17 only for this pass.'],
    ];
    await client.query(
      `INSERT INTO comments (card_id, member_id, body) VALUES ${sqlPairs(b1Comments.length, 3)}`,
      b1Comments.flat()
    );

    await client.query(
      `INSERT INTO card_activities (card_id, member_id, action_type, metadata) VALUES ${sqlPairs(4, 4)}`,
      [
        c1[0],
        M[0],
        'card_created',
        JSON.stringify({ list_title: 'Ideas & discovery' }),
        c1[4],
        M[0],
        'card_created',
        JSON.stringify({ list_title: 'Prioritized' }),
        c1[8],
        M[0],
        'card_created',
        JSON.stringify({ list_title: 'In development' }),
        c1[8],
        M[0],
        'card_moved',
        JSON.stringify({
          from_list_title: 'Prioritized',
          to_list_title: 'In development',
        }),
      ]
    );

    // ——— Board 2: second board (lighter) ———
    const b2 = await client.query(
      `INSERT INTO boards (title, background) VALUES ($1, $2) RETURNING id`,
      ['Engineering sprint', '#5e4db2']
    );
    const id2 = b2.rows[0].id;

    await client.query(
      `
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Tech debt', '#ef5350'),
        ($1, 'Spike', '#66bb6a'),
        ($1, 'Infra', '#42a5f5'),
        ($1, 'Security', '#ffa726')
    `,
      [id2]
    );
    const L2 = (await client.query('SELECT id FROM labels WHERE board_id = $1 ORDER BY id', [id2])).rows.map(
      (r) => r.id
    );

    const lists2 = await client.query(
      `
      INSERT INTO lists (board_id, title, position) VALUES
        ($1, 'This sprint', 1000),
        ($1, 'Next up', 2000),
        ($1, 'Blocked', 3000),
        ($1, 'Done', 4000)
      RETURNING id
    `,
      [id2]
    );
    const l2 = lists2.rows.map((r) => r.id);

    const c2res = await client.query(
      `
      INSERT INTO cards (list_id, title, description, position, due_date) VALUES
        ($1, 'Reduce N+1 on board fetch', 'Single query or batched labels.', 1000, '2026-04-27'),
        ($1, 'Connection pool tuning', 'Supabase pooler settings doc.', 2000, NULL),
        ($1, 'Add request ID middleware', 'Pass to logs.', 3000, NULL),
        ($2, 'Evaluate Redis cache for sessions', 'Spike — 2 days max.', 1000, NULL),
        ($2, 'Upgrade pg client', 'Minor version bump.', 2000, NULL),
        ($3, 'Waiting on legal for export', 'Blocked external.', 1000, NULL),
        ($4, 'CI: lint + test on PR', 'GitHub Actions green.', 1000, NULL),
        ($4, 'Seed script for demo data', 'Rich but fast load.', 2000, NULL),
        ($4, 'CORS allowlist for prod', 'Render + Vercel URLs.', 3000, NULL)
      RETURNING id
    `,
      [l2[0], l2[1], l2[2], l2[3]]
    );
    const c2 = c2res.rows.map((r) => r.id);

    await client.query(
      `INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10)`,
      [c2[0], L2[0], c2[1], L2[2], c2[3], L2[1], c2[5], L2[3], c2[7], L2[0]]
    );
    await client.query(
      `INSERT INTO card_members (card_id, member_id) VALUES ($1, $2), ($3, $4), ($5, $6)`,
      [c2[0], M[1], c2[2], M[2], c2[6], M[0]]
    );
    await client.query(`INSERT INTO comments (card_id, member_id, body) VALUES ($1, $2, $3)`, [
      c2[0],
      M[1],
      'I can pair on the query plan tomorrow morning.',
    ]);

    // ——— Board 3: third board ———
    const b3 = await client.query(
      `INSERT INTO boards (title, background) VALUES ($1, $2) RETURNING id`,
      ['Marketing & content', '#c377e0']
    );
    const id3 = b3.rows[0].id;

    await client.query(
      `
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Blog', '#66bb6a'),
        ($1, 'Social', '#42a5f5'),
        ($1, 'Webinar', '#ffa726')
    `,
      [id3]
    );
    const L3 = (await client.query('SELECT id FROM labels WHERE board_id = $1 ORDER BY id', [id3])).rows.map(
      (r) => r.id
    );

    const lists3 = await client.query(
      `
      INSERT INTO lists (board_id, title, position, header_color) VALUES
        ($1, 'Planned', 1000, '#00c2e0'),
        ($1, 'In review', 2000, NULL),
        ($1, 'Published', 3000, NULL)
      RETURNING id
    `,
      [id3]
    );
    const l3 = lists3.rows.map((r) => r.id);

    const c3res = await client.query(
      `
      INSERT INTO cards (list_id, title, description, position, due_date) VALUES
        ($1, 'Blog: “Why we chose Kanban”', 'Outline + draft — 1200 words.', 1000, '2026-05-10'),
        ($1, 'Case study: onboarding redesign', 'Customer quotes pending.', 2000, NULL),
        ($1, 'April newsletter', 'Ship via Mailchimp.', 3000, '2026-04-29'),
        ($2, 'Review landing page copy', 'Legal + brand.', 1000, '2026-05-01'),
        ($2, 'Social thread: feature roundup', '5 tweets scheduled.', 2000, NULL),
        ($3, 'Launch post on LinkedIn', 'Posted — link in analytics doc.', 1000, NULL),
        ($3, 'Webinar recording uploaded', 'YouTube unlisted.', 2000, NULL)
      RETURNING id
    `,
      [l3[0], l3[1], l3[2]]
    );
    const c3 = c3res.rows.map((r) => r.id);

    const b3LabelPairs = [
      [c3[0], L3[0]],
      [c3[1], L3[1]],
      [c3[2], L3[0]],
      [c3[3], L3[2]],
      [c3[4], L3[1]],
    ];
    await client.query(
      `INSERT INTO card_labels (card_id, label_id) VALUES ${sqlPairs(b3LabelPairs.length, 2)}`,
      b3LabelPairs.flat()
    );
    await client.query(
      `INSERT INTO card_members (card_id, member_id) VALUES ($1, $2), ($3, $4)`,
      [c3[0], M[5], c3[1], M[3]]
    );

    const ch3 = await client.query(
      `INSERT INTO checklists (card_id, title, position) VALUES ($1, 'Publishing steps', 1000) RETURNING id`,
      [c3[0]]
    );
    await client.query(
      `
      INSERT INTO checklist_items (checklist_id, content, is_checked, position) VALUES
        ($1, 'SEO title + meta', true, 1000),
        ($1, 'Hero image', false, 2000),
        ($1, 'CTA link', false, 3000)
    `,
      [ch3.rows[0].id]
    );

    await client.query('COMMIT');

    console.log('✓ Members:', M.length);
    console.log('✓ Board 1 (Product launch):', id1, '— 20 cards, lists with sample colors');
    console.log('✓ Board 2 (Engineering sprint):', id2, '— 9 cards');
    console.log('✓ Board 3 (Marketing & content):', id3, '— 7 cards');
    console.log('\n🎉 Database seeded successfully — ~36 cards across 3 boards (fast API payloads).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
