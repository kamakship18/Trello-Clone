'use strict';

const TEMPLATE_IDS = ['project-management', 'marketing', 'design-sprint'];

const TEMPLATES = {
  'project-management': {
    defaultTitle: 'Project Management',
    labels: [
      { name: 'Blocked', color: '#eb5a46' },
      { name: 'At risk', color: '#ff9f1a' },
      { name: 'Milestone', color: '#0079bf' },
      { name: 'Docs', color: '#00c2e0' },
      { name: 'Needs review', color: '#c377e0' },
    ],
    lists: [
      {
        title: 'Backlog',
        position: 1000,
        header_color: null,
        cards: [
          {
            title: 'Write project charter',
            description: 'Scope, success metrics, and key stakeholders.',
            position: 1000,
            labelNames: ['Milestone'],
            assignMemberIndex: 0,
          },
          {
            title: 'Requirements & constraints',
            description: 'Functional and non-functional requirements; link to PRD when ready.',
            position: 2000,
            labelNames: ['Docs'],
          },
          {
            title: 'Stakeholder map & RACI',
            description: 'Who needs to be consulted vs informed for major decisions.',
            position: 3000,
          },
        ],
      },
      {
        title: 'Sprint planning',
        position: 2000,
        header_color: null,
        cards: [
          {
            title: 'Define sprint goal',
            description: 'One clear outcome for this sprint; align with roadmap.',
            position: 1000,
            due_date: '2026-04-28',
            assignMemberIndex: 1,
          },
          {
            title: 'Break work into stories',
            description: 'INVEST-sized cards with acceptance criteria.',
            position: 2000,
            labelNames: ['Needs review'],
          },
          {
            title: 'Estimate & pull into sprint',
            description: 'Capacity vs commitment; move cards to In progress when started.',
            position: 3000,
          },
        ],
      },
      {
        title: 'In progress',
        position: 3000,
        header_color: '#f2d600',
        cards: [
          {
            title: 'Implement core user flows',
            description: 'Happy path first; feature-flag risky pieces.',
            position: 1000,
            labelNames: ['At risk'],
            checklist: {
              title: 'Definition of ready',
              items: [
                { content: 'Acceptance criteria agreed', checked: true },
                { content: 'Design linked', checked: true },
                { content: 'API contract reviewed', checked: false },
              ],
            },
          },
          {
            title: 'Daily sync — blockers',
            description: 'Surface dependencies; escalate if Blocked.',
            position: 2000,
            labelNames: ['Blocked'],
          },
          {
            title: 'Telemetry & error handling',
            description: 'Basics for observability before wider rollout.',
            position: 3000,
          },
        ],
      },
      {
        title: 'Review / QA',
        position: 4000,
        header_color: null,
        cards: [
          {
            title: 'Test plan & regression scope',
            description: 'Smoke paths plus areas touched this sprint.',
            position: 1000,
            labelNames: ['Needs review', 'Milestone'],
          },
          {
            title: 'Accessibility pass',
            description: 'Keyboard, focus, contrast for new UI.',
            position: 2000,
          },
          {
            title: 'Release checklist',
            description: 'Version bump, changelog, rollback plan.',
            position: 3000,
            labelNames: ['Docs'],
            checklist: {
              title: 'Ship',
              items: [
                { content: 'Staging sign-off', checked: false },
                { content: 'Prod deploy', checked: false },
                { content: 'Smoke on prod', checked: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Done',
        position: 5000,
        header_color: '#61bd4f',
        cards: [
          {
            title: 'Kickoff workshop completed',
            description: 'Notes and decisions stored in team wiki.',
            position: 1000,
          },
          {
            title: 'Repo & CI baseline',
            description: 'Lint, tests, deploy pipeline green.',
            position: 2000,
          },
        ],
      },
    ],
  },

  marketing: {
    defaultTitle: 'Marketing',
    labels: [
      { name: 'Social', color: '#ff78cb' },
      { name: 'Email', color: '#ff9f1a' },
      { name: 'Paid ads', color: '#c377e0' },
      { name: 'Content', color: '#00c2e0' },
      { name: 'Analytics', color: '#61bd4f' },
    ],
    lists: [
      {
        title: 'Ideas & backlog',
        position: 1000,
        header_color: null,
        cards: [
          {
            title: 'Q2 campaign themes',
            description: 'Brainstorm angles; tie to product launches.',
            position: 1000,
            labelNames: ['Content'],
            assignMemberIndex: 0,
          },
          {
            title: 'Competitor messaging scan',
            description: 'What others emphasize — find whitespace.',
            position: 2000,
            labelNames: ['Analytics'],
          },
          {
            title: 'Customer quotes for site',
            description: 'Pull 3–5 testimonials from recent interviews.',
            position: 3000,
          },
        ],
      },
      {
        title: 'Planning',
        position: 2000,
        header_color: null,
        cards: [
          {
            title: 'Editorial calendar draft',
            description: 'Channels, owners, dates for next 4 weeks.',
            position: 1000,
            due_date: '2026-05-01',
            labelNames: ['Content', 'Social'],
          },
          {
            title: 'Landing page brief',
            description: 'Hero, proof points, CTA, tracking IDs.',
            position: 2000,
            labelNames: ['Paid ads'],
          },
          {
            title: 'Budget & channel mix',
            description: 'Allocate spend across paid vs organic experiments.',
            position: 3000,
            labelNames: ['Analytics'],
          },
        ],
      },
      {
        title: 'In production',
        position: 3000,
        header_color: '#f2d600',
        cards: [
          {
            title: 'Blog: product update post',
            description: 'Draft in CMS; SEO title + meta description.',
            position: 1000,
            labelNames: ['Content'],
            checklist: {
              title: 'Publish',
              items: [
                { content: 'Draft reviewed', checked: true },
                { content: 'Images optimized', checked: false },
                { content: 'Scheduled publish', checked: false },
              ],
            },
          },
          {
            title: 'LinkedIn & X announcement thread',
            description: 'Short hook + link; schedule across time zones.',
            position: 2000,
            labelNames: ['Social'],
            assignMemberIndex: 1,
          },
          {
            title: 'Lifecycle email #1',
            description: 'Welcome path — trigger after signup.',
            position: 3000,
            labelNames: ['Email'],
          },
        ],
      },
      {
        title: 'Distribution',
        position: 4000,
        header_color: null,
        cards: [
          {
            title: 'Newsletter send — May edition',
            description: 'Segment: active users; A/B subject lines.',
            position: 1000,
            labelNames: ['Email', 'Analytics'],
          },
          {
            title: 'Retargeting campaign setup',
            description: 'Pixels verified; creative variants uploaded.',
            position: 2000,
            labelNames: ['Paid ads'],
          },
        ],
      },
      {
        title: 'Results & learnings',
        position: 5000,
        header_color: '#61bd4f',
        cards: [
          {
            title: 'Weekly metrics snapshot',
            description: 'Traffic, conversions, cost per lead — dashboard link.',
            position: 1000,
            labelNames: ['Analytics'],
          },
          {
            title: 'Retro: what to scale',
            description: 'Winning experiments → backlog for next cycle.',
            position: 2000,
            labelNames: ['Content'],
          },
        ],
      },
    ],
  },

  'design-sprint': {
    defaultTitle: 'Design Sprint',
    labels: [
      { name: 'Research', color: '#0079bf' },
      { name: 'UX', color: '#61bd4f' },
      { name: 'Visual', color: '#ff78cb' },
      { name: 'Decision', color: '#ff9f1a' },
    ],
    lists: [
      {
        title: 'Map & align',
        position: 1000,
        header_color: null,
        cards: [
          {
            title: 'Sprint challenge (How might we…)',
            description: 'One sentence problem statement everyone agrees on.',
            position: 1000,
            labelNames: ['Decision'],
            assignMemberIndex: 0,
          },
          {
            title: 'User journey — current state',
            description: 'Pain points and workarounds on a single diagram.',
            position: 2000,
            labelNames: ['Research', 'UX'],
          },
          {
            title: 'Pick target moment',
            description: 'The riskiest moment in the journey to prototype.',
            position: 3000,
            labelNames: ['Decision'],
          },
        ],
      },
      {
        title: 'Sketch',
        position: 2000,
        header_color: null,
        cards: [
          {
            title: 'Lightning demos',
            description: 'Inspiration from other products (15 min each).',
            position: 1000,
            labelNames: ['Research'],
          },
          {
            title: 'Crazy 8s + solution sketch',
            description: 'Silent critique; dot voting next.',
            position: 2000,
            labelNames: ['Visual', 'UX'],
          },
          {
            title: 'Storyboard (6–8 panels)',
            description: 'End-to-end flow for the chosen concept.',
            position: 3000,
            due_date: '2026-05-03',
            checklist: {
              title: 'Sketch day',
              items: [
                { content: 'Notes from demos captured', checked: true },
                { content: '8 sketches done', checked: true },
                { content: 'Storyboard draft', checked: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Decide',
        position: 3000,
        header_color: '#f2d600',
        cards: [
          {
            title: 'Art museum & heat map',
            description: 'Silent review; consolidate strongest ideas.',
            position: 1000,
            labelNames: ['Decision'],
          },
          {
            title: 'Final storyboard + roles',
            description: 'Who prototypes what; assets needed.',
            position: 2000,
            labelNames: ['UX', 'Visual'],
          },
          {
            title: 'Prototype plan',
            description: 'Figma vs code prototype — pick fastest path.',
            position: 3000,
            labelNames: ['Decision'],
          },
        ],
      },
      {
        title: 'Prototype',
        position: 4000,
        header_color: null,
        cards: [
          {
            title: 'Build clickable prototype',
            description: 'Fake doors OK; focus on learning, not polish.',
            position: 1000,
            labelNames: ['Visual'],
            assignMemberIndex: 1,
          },
          {
            title: 'Interview script (5 users)',
            description: 'Tasks, prompts, what to observe.',
            position: 2000,
            labelNames: ['Research'],
          },
          {
            title: 'Dry run with teammate',
            description: 'Fix confusing copy and flows before real users.',
            position: 3000,
            labelNames: ['UX'],
          },
        ],
      },
      {
        title: 'Test & learn',
        position: 5000,
        header_color: '#61bd4f',
        cards: [
          {
            title: 'User interviews — session 1–3',
            description: 'Record notes; mark pass/fail per hypothesis.',
            position: 1000,
            labelNames: ['Research'],
          },
          {
            title: 'Synthesis wall',
            description: 'Patterns, surprises, recommended next step.',
            position: 2000,
            labelNames: ['Decision', 'UX'],
          },
          {
            title: 'Share-out to stakeholders',
            description: 'What we learned; what ships vs iterate.',
            position: 3000,
            labelNames: ['Decision'],
          },
        ],
      },
    ],
  },
};

/**
 * @param {import('pg').PoolClient} client
 * @param {number} boardId
 * @param {string} templateKey
 * @param {number[]} memberIds ordered member ids from DB
 */
async function applyTemplate(client, boardId, templateKey, memberIds) {
  const t = TEMPLATES[templateKey];
  if (!t) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  const nameToLabelId = {};
  for (const lb of t.labels) {
    const r = await client.query(
      'INSERT INTO labels (board_id, name, color) VALUES ($1, $2, $3) RETURNING id, name',
      [boardId, lb.name, lb.color]
    );
    nameToLabelId[r.rows[0].name] = r.rows[0].id;
  }

  for (const list of t.lists) {
    const lr = await client.query(
      'INSERT INTO lists (board_id, title, position, header_color) VALUES ($1, $2, $3, $4) RETURNING id',
      [boardId, list.title, list.position, list.header_color ?? null]
    );
    const listId = lr.rows[0].id;

    for (const card of list.cards) {
      const due =
        card.due_date != null && card.due_date !== ''
          ? new Date(`${card.due_date}T12:00:00`)
          : null;

      const cr = await client.query(
        'INSERT INTO cards (list_id, title, description, position, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [listId, card.title, card.description || '', card.position, due]
      );
      const cardId = cr.rows[0].id;

      for (const ln of card.labelNames || []) {
        const lid = nameToLabelId[ln];
        if (lid) {
          await client.query(
            'INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2) ON CONFLICT (card_id, label_id) DO NOTHING',
            [cardId, lid]
          );
        }
      }

      const mi = card.assignMemberIndex;
      if (mi != null && memberIds[mi] != null) {
        await client.query(
          'INSERT INTO card_members (card_id, member_id) VALUES ($1, $2) ON CONFLICT (card_id, member_id) DO NOTHING',
          [cardId, memberIds[mi]]
        );
      }

      if (card.checklist && Array.isArray(card.checklist.items) && card.checklist.items.length > 0) {
        const ch = await client.query(
          'INSERT INTO checklists (card_id, title, position) VALUES ($1, $2, $3) RETURNING id',
          [cardId, card.checklist.title || 'Checklist', 1000]
        );
        const chId = ch.rows[0].id;
        let pos = 1000;
        for (const item of card.checklist.items) {
          await client.query(
            'INSERT INTO checklist_items (checklist_id, content, is_checked, position) VALUES ($1, $2, $3, $4)',
            [chId, item.content, !!item.checked, pos]
          );
          pos += 1000;
        }
      }
    }
  }
}

function getDefaultTitle(templateKey) {
  return TEMPLATES[templateKey]?.defaultTitle || 'Board';
}

module.exports = {
  TEMPLATE_IDS,
  applyTemplate,
  getDefaultTitle,
};
