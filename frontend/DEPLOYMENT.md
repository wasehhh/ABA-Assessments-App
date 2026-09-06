# Deployment Guide

## Quick Start

This is a Vite + React + TypeScript application with Supabase backend.

## Repository layout

The deployable application is **`frontend/`**, not the repository root. There is no `package.json` at the repo root.

On **Vercel** or **Netlify**, set the project's **Root Directory** to `frontend`. Build command: `npm run build`. Output directory: `dist`.

Self-host and local production commands in this guide are run from `frontend/`.

## Routing

The application uses hash-based routing (`window.location.hash` in `frontend/src/App.tsx`). Paths look like `/#/login`, `/#/assessments`. The host always serves `index.html` for the document URL; the client reads the hash.

**No SPA rewrite or fallback rule is required on any host.** The NGINX `try_files` and Apache rewrite blocks in Option 3 are harmless but not necessary.

## Prerequisites

- Node.js 18+ installed
- Supabase account with database already provisioned (this frontend deploy does not change the database)
- Environment variables from `.env` file (local) or the host's environment settings (Vercel / Netlify / self-host)

## Option 1: Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Confirm build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy

## Option 2: Deploy to Netlify

1. Push code to GitHub
2. Import project at [netlify.com](https://netlify.com)
3. Set **Root Directory** to `frontend`
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables (same as Vercel)
6. Deploy

## Option 3: Self-Host

### Build for Production

```bash
cd frontend
npm install
npm run build
```

This creates a `frontend/dist/` folder with optimized static files.

### Serve with NGINX

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`try_files` is harmless but not necessary (see Routing).

### Serve with Apache

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /path/to/frontend/dist

    <Directory /path/to/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

The rewrite block is harmless but not necessary (see Routing).

### Serve with Node.js (serve package)

```bash
cd frontend
npm install -g serve
serve -s dist -l 3000
```

## Environment Variables

Create `frontend/.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

On Vercel or Netlify, set the same names in the host's environment-variable UI (not a committed file).

`VITE_SUPABASE_ANON_KEY` is compiled into the client bundle by design and is not a secret; Row-Level Security is the tenant boundary.

**IMPORTANT:** Never commit `.env` to version control!

## Supabase Auth configuration

**Manual dashboard step** (same class of operation as every other live-Supabase change in this project: founder-run in the dashboard; nothing in this repository applies it).

Before the first production origin is used, in the Supabase dashboard:

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to the deployed origin (scheme + host, no hash), e.g. `https://your-production-host`.
3. Add that same origin to the **redirect allowlist**.

Skipping this leaves password-reset and other emailed links resolving to an origin the user cannot reach.

## Database Setup

`database/migrations/` is the **authoritative migration ledger** for this project (18 SQL files). `frontend/supabase/migrations/` is a **legacy divergent history** (14 files, Supabase-CLI shaped, dated 2025) retained for reference only. The two directories are **not** the same history: they each contain a version of at least one already-applied change (`assessment_scores.score` → `numeric`).

**Migrations are MANUAL-APPLY ONLY.** The founder applies each file by hand in the Supabase SQL editor, **one at a time**, and verifies the result with a **catalogue query** after each file. A successful-looking run in the SQL editor is **not** verification.

**No Supabase CLI command is run against this project.** Do not `supabase link`. Do not `supabase db push`. There is no `supabase/config.toml` in this repository.

**`frontend/supabase/migrations/` MUST NOT be applied.** Linking the CLI and pushing that directory would attempt a conflicting history against the live database.

**Deploying the frontend requires NO database change.** The database is already provisioned. Do not re-run ledger files against the live project as part of this deploy.

## Testing Deployment

From `frontend/`:

1. Build locally: `npm run build`
2. Preview: `npm run preview`
3. Visit `http://localhost:4173`

## Production Checklist

- [ ] Host **Root Directory** set to `frontend` (Vercel / Netlify)
- [ ] Environment variables set on the host (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Supabase Auth URL configuration set (Site URL + redirect allowlist = deployed origin)
- [ ] Manual migration ledger verified already applied; **do not** apply `frontend/supabase/migrations/`; **do not** `supabase db push`
- [ ] HTTPS enabled (via Vercel/Netlify or Let's Encrypt)
- [ ] Error tracking configured (optional: Sentry)
- [ ] Analytics configured (optional: Google Analytics)

## Troubleshooting

### Blank Page After Deploy
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure Supabase URL is accessible
- Confirm the host Root Directory is `frontend` (a root-level build will not find `package.json`)

### Authentication Issues
- Verify Supabase anon key is correct
- Check RLS policies allow user access
- Confirm auth.users table has records
- If emailed links open the wrong origin, check Authentication → URL Configuration (Site URL and redirect allowlist)

### Build Errors
- Run `npm run typecheck` locally first (from `frontend/`)
- Check Node.js version matches deployment platform
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Support

For issues, check:
- Browser console (F12)
- Supabase dashboard logs
- Deployment platform logs (Vercel/Netlify)
