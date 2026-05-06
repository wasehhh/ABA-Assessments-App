# Developer setup guide (Evalis)

This guide covers the **Evalis** SPA: **React + TypeScript + Vite**, talking to **Supabase** from the browser using **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**.

## 1. Prerequisites

- **Git**
- **Node.js** (v20 or higher) and **npm**
- **Supabase CLI** (optional — only if you run local Supabase or link projects)
- **VS Code** or similar (recommended)

## 2. Repository setup

```bash
git clone <your-repo-url>
cd ABA-Assessments-App   # or your local clone folder name
```

## 3. Supabase project

1. Create a Supabase project (hosted) **or** run Supabase locally (`supabase start`) if you use the CLI.
2. Apply database DDL/RLS following **`docs/architecture/supabase_setup.md`**:
   - **`database/migrations/`** — canonical dated SQL bundle (snapshots and patches)
   - **`frontend/supabase/migrations/`** — CLI migration chain (may differ; do not mix blindly with the full snapshot on one DB)

Optional CLI workflow from repo root or `frontend` (match where your `supabase/config.toml` lives — this repo keeps CLI migrations under `frontend/supabase/`):

```bash
cd frontend
supabase login          # if using remote
supabase link --project-ref <your-project-id>   # optional
```

## 4. Frontend setup (Vite + React)

```bash
cd frontend
npm install
```

### Environment variables

Create **`frontend/.env`** (already gitignored):

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

These are read in `frontend/src/lib/supabase.ts`. **Do not use `NEXT_PUBLIC_*`** — this app is not Next.js.

### Run the dev server

```bash
npm run dev
```

Open **http://localhost:5173** (Vite default). Routes use the hash, e.g. `http://localhost:5173/#/login`.

### Production build

```bash
npm run build
npm run preview    # optional local preview of dist/
```

## 5. Tests (optional)

Vitest is configured for unit tests (e.g. `src/utils/exportUtils.test.ts`):

```bash
cd frontend
npm run test
```

## 6. Verification

- Open the app at **port 5173** (or the URL Vite prints).
- Sign in against your Supabase Auth users.
- Confirm clients/assessments load without Supabase config errors in the browser console.

## Troubleshooting

- **Blank app / Supabase errors:** Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env` and restart `npm run dev`.
- **`supabase start` fails:** Ensure Docker is running if using local Supabase.
- **`npm install` errors:** Check Node version with `node -v` (use 20+).
