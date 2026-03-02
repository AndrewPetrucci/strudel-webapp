# Strudel Webapp

A [Strudel](https://strudel.cc) live coding app built with the [react-template](https://github.com/AndrewPetrucci/react-template/tree/feature-nextjs) layout: **Next.js** (App Router, static export) on the frontend and **Express + PostgreSQL** on the backend. Palette buttons are stored in a `buttons` table and loaded via the API instead of a CSV file.

## Structure

- **`client/`** — Next.js app (static export in `client/out`). In production the Express server serves it.
- **`server/`** — Express API and PostgreSQL:
  - `server/src/schema/buttons/` — Buttons table schema and seed CSV. Table is created and seeded from `seed.csv` on startup.
- **`public/`** — Legacy static assets; `pallet-buttons.csv` includes a `group` column and is the source for the buttons seed data (copied into `server/src/schema/buttons/seed.csv`).

## Prerequisites

- **Node.js** and **npm**
- **PostgreSQL** (local or remote)

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. PostgreSQL

The server creates the database and `buttons` table (and seeds from the CSV) on startup. Set connection via env.

**Option A — separate vars** (recommended). Copy and edit:

```bash
cp server/.env.example server/.env
```

Set `PG_USER`, `PG_PASSWORD`, `PG_HOST`, `PG_PORT`, `PG_DATABASE` (default DB name: `strudel_webapp`).

**Option B — full URL**

```bash
# in server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/strudel_webapp
```

### 3. Run

**Development** (client on 3000, API on 3001; Next.js proxies `/api` to the server):

```bash
npm run dev
```

- Frontend: **http://localhost:3000**
- API: **http://localhost:3001**

**Production**

```bash
npm run build
npm run start
```

Then open **http://localhost:3001** — the server serves both the API and the built Next.js app from `client/out`.

## API

- **GET /api/buttons** — Returns all palette buttons (from the `buttons` table). Response shape: `{ id, name, code, cursor_end_of_line_offset, insert_index, imports, consts, group }`.
- **GET /api/health** — `{ "status": "ok" }`.

## Buttons CSV and `group` column

`public/pallet-buttons.csv` has columns: `id`, `name`, `code`, `cursorEndOfLineOffset`, `insertIndex`, `imports`, `consts`, **`group`**. The `group` column is used to categorize buttons (e.g. `drums`, `synth`, `samples`, `fx`). The same data is kept in `server/src/schema/buttons/seed.csv` for seeding the database; update both if you change button data.

## Tests

Pallet logic tests (Node):

```bash
npm test
```

(Requires the existing test setup and `public/pallet-logic.js`.)
