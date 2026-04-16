# Trello Clone — Project Management Tool

A full-stack Kanban-style project management web application replicating Trello's design and user experience.

**Implementation report** — For a full write-up of features (including screenshots), see: [Trello Clone — Implementation Report](https://docs.google.com/document/d/1Vnep8IxgUiAze0CZnxwXY9uXiwcB5Ih0Fi7zeL8zS0U/edit?usp=sharing).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router, JavaScript) |
| **Backend** | Node.js + Express.js |
| **Database** | PostgreSQL (Supabase) |
| **Drag & Drop** | @hello-pangea/dnd |
| **Styling** | Vanilla CSS |

## Features

- **Board Management** — Create and view boards
- **Lists Management** — Create, edit, delete, and drag-to-reorder lists
- **Cards Management** — Create, edit, delete cards with drag-and-drop between lists
- **Card Details** — Labels, due dates, checklists, member assignment
- **Search & Filter** — Search cards by title, filter by labels/members/due dates
- **Drag & Drop** — Smooth reordering of both lists and cards

## Setup Instructions

### Prerequisites
- Node.js v18+ (v20+ recommended)
- A Supabase project (free tier works)

### 1. Clone the repository
```bash
git clone <repo-url>
cd trello
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env: use Supabase Connect → Session pooler (or Transaction pooler), not Direct,
# unless you use IPv6 or Supabase IPv4 add-on — see server/.env.example
npm install
npm run seed    # Creates tables and seeds sample data
npm run dev     # Starts on http://localhost:5001
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev     # Starts on http://localhost:3000
```

### 4. Open the app
Visit `http://localhost:3000` in your browser.

## Database Schema

The schema consists of 9 tables:
- `boards` — Board data
- `lists` — Board columns with position ordering
- `cards` — Cards with position, description, due dates
- `labels` — Color-coded labels per board
- `card_labels` — Many-to-many junction
- `members` — Pre-seeded users (no auth)
- `card_members` — Many-to-many junction
- `checklists` — Checklists attached to cards
- `checklist_items` — Individual checklist items

Position fields use `REAL` (float) for efficient reordering without renumbering.

## Assumptions

- No authentication required — a default user is pre-seeded
- Sample data is seeded via `npm run seed`
- PostgreSQL hosted on Supabase (connection via `DATABASE_URL`)
- CORS configured for `http://localhost:3000` (Next.js dev server)
