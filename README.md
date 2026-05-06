# Evalis — ABA Assessment Platform

Evalis is a multi-tenant clinical assessment workflow app (React + TypeScript) for digitizing structured assessments (e.g. ABLLS-R, VB-MAPP style packs) with org-scoped data and Supabase-backed auth and storage.

## Quick start

### Prerequisites

- Node.js 20+
- A Supabase project (or local Supabase via Docker + CLI if you use it)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/<org>/ABA-Assessments-App.git
   cd ABA-Assessments-App
   ```

   (Use your GitHub path; the historical folder name `DomainA_Tool` may still appear on local clones.)

2. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

3. **Environment**

   Create `frontend/.env` (do not commit):

   ```env
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

4. **Development server**

   ```bash
   npm run dev
   ```

   Vite serves the SPA at **http://localhost:5173** by default (hash-based routes, e.g. `#/login`).

Further detail: [docs/guides/setup_guide.md](docs/guides/setup_guide.md).

## Documentation

- **[Guides](docs/guides/)** — setup, onboarding  
- **[Architecture](docs/architecture/)** — Supabase, data model notes  
- **[Specs](docs/specs/)** — product/engineering references  
- **`database/migrations/`** — canonical SQL snapshots and patches  
- **`frontend/supabase/migrations/`** — Supabase CLI migration chain  

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, **hash-based** client routing (`window.location.hash`, see `frontend/src/App.tsx`)  
- **Backend / data:** Supabase (Postgres, Auth, Row Level Security); browser uses `@supabase/supabase-js` with `VITE_*` env vars  

## Contributing

See `docs/specs/master_app_specification.md` and org privacy/compliance expectations before contributing.
