# Deployment Guide

## Quick Start

This is a Vite + React + TypeScript application with Supabase backend.

## Prerequisites

- Node.js 18+ installed
- Supabase account with database configured
- Environment variables from `.env` file

## Option 1: Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Option 2: Deploy to Netlify

1. Push code to GitHub
2. Import project at [netlify.com](https://netlify.com)
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables (same as Vercel)
5. Deploy

## Option 3: Self-Host

### Build for Production

```bash
npm install
npm run build
```

This creates a `dist/` folder with optimized static files.

### Serve with NGINX

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Serve with Apache

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /path/to/dist

    <Directory /path/to/dist>
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

### Serve with Node.js (serve package)

```bash
npm install -g serve
serve -s dist -l 3000
```

## Environment Variables

Create `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**IMPORTANT:** Never commit `.env` to version control!

## Database Setup

Your Supabase database should already have:
- All tables created via migrations
- RLS policies enabled
- At least one organization and user

If starting fresh, run migrations in `supabase/migrations/` folder.

## Testing Deployment

1. Build locally: `npm run build`
2. Preview: `npm run preview`
3. Visit `http://localhost:4173`

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled on all tables
- [ ] HTTPS enabled (via Vercel/Netlify or Let's Encrypt)
- [ ] Error tracking configured (optional: Sentry)
- [ ] Analytics configured (optional: Google Analytics)

## Troubleshooting

### Blank Page After Deploy
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure Supabase URL is accessible

### Authentication Issues
- Verify Supabase anon key is correct
- Check RLS policies allow user access
- Confirm auth.users table has records

### Build Errors
- Run `npm run typecheck` locally first
- Check Node.js version matches deployment platform
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Support

For issues, check:
- Browser console (F12)
- Supabase dashboard logs
- Deployment platform logs (Vercel/Netlify)
