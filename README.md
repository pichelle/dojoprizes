# DojoPrizes

Internal staff tool for Code Ninjas Yorba Linda's prize program: a shared
prize catalog, request log, checkout tracker, and filament inventory, in
place of tracking everything on paper/memory. See [docs/PRD.md](./docs/PRD.md)
for the full PRD, current scope, and open questions.

Stack: Next.js (App Router) + Supabase (Postgres) + Vercel, with a simple
shared-password gate instead of individual staff logins (MVP scope per the
PRD — single shared login for 2 staff).

## Features (MVP)

- **Prize Catalog** (`/catalog`) — add/edit/view prizes: photo, name,
  franchise, tags, coin tier, MakerWorld link, stock count, status.
- **Request Log** (`/requests`) — log a student's prize request in seconds;
  status flows Pending → Printed → Fulfilled (or Cancelled).
- **Checkout Tracking** (`/checkouts`, plus a one-click button on each
  catalog card) — log what actually left the shelf, separate from requests.
  Automatically decrements the prize's stock count.
- **Filament Inventory** (`/filament`) — track filament colors/spools, a
  low-stock threshold, and which prizes use which colors (many-to-many).

Not built (explicitly out of scope for MVP per the PRD): the analytics
dashboard (5.7), student/parent self-service, individual staff logins, coin
balance tracking, and MakerWorld API sync. The data model supports adding
the dashboard later without schema changes.

## 1. Local setup

```bash
npm install
```

Copy `.env.local.example` to `.env.local` if you don't already have one, and
fill in your Supabase project URL + anon key (Supabase dashboard → Project
Settings → API), plus a password for the staff gate:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
GATE_PASSWORD=...
GATE_SESSION_SECRET=...   # any random string, e.g. `openssl rand -hex 24`
```

A `.env.local` with your real values (from this setup session) should
already be sitting in the project root — just double check it before
running `npm run dev`.

## 2. Set up the database

In the Supabase dashboard, open **SQL Editor → New query**, paste in the
contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This
creates the `prizes`, `requests`, `checkouts`, `filaments`, and
`prize_filament` tables, plus Row Level Security policies.

Note on RLS: this app has no per-user Supabase Auth — it talks to Supabase
using the anon key from server-only code (Server Components/Server
Actions), never from the browser, and access is gated by the shared
password in `src/proxy.ts`. The RLS policies in the migration allow full
read/write for the anon role so the app works. If you ever add a
client-side Supabase call, revisit those policies first.

## 3. Run it locally

```bash
npm run dev
```

Visit `http://localhost:3000`, enter the staff password, and you're in.

## 4. Deploy to Vercel

1. Push this repo to GitHub (see below).
2. In Vercel, "Add New Project" → import the GitHub repo.
3. Add the same environment variables from `.env.local`
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GATE_PASSWORD`,
   `GATE_SESSION_SECRET`) under Project Settings → Environment Variables.
4. Deploy. Every push to `main` will auto-deploy.

## 5. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial commit: Digital Prize Bin MVP"
git branch -M main
gh repo create dojoprizes --private --source=. --remote=origin --push
```

If you don't have the `gh` CLI, create an empty repo named `dojoprizes` at
https://github.com/new (don't initialize it with a README), then:

```bash
git remote add origin https://github.com/<your-username>/dojoprizes.git
git push -u origin main
```

## Project structure

```
src/
  app/
    catalog/       Prize Catalog (list, add, edit, quick checkout)
    requests/       Request Log (log + status updates)
    checkouts/      Checkout Tracking (log + history)
    filament/       Filament Inventory (list, add, edit, link to prizes)
    login/          Password gate login form
    api/login, api/logout   Session cookie handling
  lib/
    supabase/server.ts   Server-only Supabase client
    types.ts             Shared TypeScript types
    coins.ts              Silver/Gold/Obsidian conversion helpers
    auth.ts                Password-gate token helpers
  proxy.ts           Route protection (formerly "middleware" in Next.js)
supabase/
  schema.sql          Full DB schema + RLS policies
```

## Coin tiers

Fixed conversion per the PRD: 5 Silver = 1 Gold, 5 Gold = 1 Obsidian.
Prizes store a silver-equivalent value internally for consistent
sorting/filtering, while the UI always shows the Silver/Gold/Obsidian label.
