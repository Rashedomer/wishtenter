# Wishtenter Deployment Guide

**Architecture:** Vercel (Frontend) + Railway (Backend API)

---

## Overview

| Layer    | Platform | Notes                            |
|----------|----------|----------------------------------|
| Frontend | Vercel   | Static SPA + PWA, custom domain  |
| Backend  | Railway  | Node.js Express API, PostgreSQL  |
| Database | Railway  | Managed PostgreSQL plugin        |
| Storage  | Railway  | Volume mounted at `/app/server/uploads` |

---

## 1. Backend — Railway

### 1.1 Create a New Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub Repo** and connect your repository
3. Set the **Root Directory** to `server`
4. Railway will auto-detect Node.js and use `npm start`

### 1.2 Add a PostgreSQL Plugin

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically injects `DATABASE_URL` into your backend service

### 1.3 Add a Volume (for file uploads)

> [!IMPORTANT]
> Railway containers use an ephemeral file system. Without a Volume, uploaded profile images and avatars will be deleted when the service restarts.

1. Go to your backend service → **Volumes** tab
2. Click **Add Volume**
3. Set **Mount Path** to `/app/server/uploads`

### 1.4 Backend Environment Variables

Set these in Railway → Your Service → **Variables**:

```env
NODE_ENV=production
PORT=5000

# Auto-injected by Railway's PostgreSQL plugin:
DATABASE_URL=postgresql://...

# Your app secrets:
JWT_SECRET=your_long_random_secret_here

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Resend (email)
RESEND_API_KEY=re_...

# CORS — set this to your Vercel frontend URL
FRONTEND_URL=https://wishtenter.vercel.app
CORS_ORIGIN=https://wishtenter.com,https://www.wishtenter.com,https://wishtenter.vercel.app

# Public URL of THIS Railway service (where /api and /uploads are served)
BACKEND_URL=https://server-production-xxxx.up.railway.app

# Persistent uploads (match your Volume mount path)
UPLOADS_DIR=/app/server/uploads

# Sightengine — image moderation
SIGHTENGINE_API_USER=...
SIGHTENGINE_API_SECRET=...
```

### 1.5 Auto Migrations (preserves existing data)

Each deploy runs `prisma migrate deploy` — this **only applies new migrations** and does **not** delete your data. Never run `prisma migrate reset` on production.

The startup script also normalizes broken image URLs in the database (`localhost` → `/uploads/...`).

### 1.6 Migrate existing database to Railway

If you had data on a local or old server PostgreSQL:

```bash
# 1. Export from old database
pg_dump -h OLD_HOST -U postgres -d wishlist_db -F c -f wishlist_backup.dump

# 2. Import into Railway PostgreSQL (get URL from Railway → PostgreSQL → Connect)
pg_restore -h NEW_HOST -U postgres -d railway -F c --no-owner --no-acl wishlist_backup.dump

# 3. Redeploy backend — migrations run automatically and align schema
```

> Use the **same** `DATABASE_URL` on Railway that you restored into. Do not create a second empty Postgres plugin if you want to keep old users/wishes.

### 1.7 Migrate existing upload images

Profile and wish images are files on disk, not in PostgreSQL. Copy them into the Railway Volume:

1. Railway → Backend service → **Volumes** → mount at `/app/server/uploads`
2. Copy your old `server/uploads/*` files into the volume (Railway CLI, SFTP, or one-time deploy script)
3. Set `UPLOADS_DIR=/app/server/uploads` in Railway variables
4. Redeploy — startup runs `fix-upload-urls` so DB paths point to `/uploads/filename.jpg`

Verify: `GET https://your-railway-url/api/health` should show `"uploadFileCount": N` (N > 0 if files copied).

### 1.8 Get the Railway URL

After first deploy, Railway provides a URL like `https://server-production-xxxx.up.railway.app`. **Copy this** — you'll need it for the Vercel frontend environment.

---

## 2. Frontend — Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `.` (the project root)
4. Vercel auto-detects Vite — leave build settings as default

### 2.2 Frontend Environment Variables

Set these in Vercel → Your Project → **Settings** → **Environment Variables**:

```env
# Your Railway backend URL — REQUIRED for images to work
VITE_API_URL=https://server-production-xxxx.up.railway.app/api
VITE_BACKEND_URL=https://server-production-xxxx.up.railway.app
```

> **Images broken?** This is almost always because `VITE_BACKEND_URL` / `VITE_API_URL` are missing or point to the frontend domain instead of Railway. Rebuild Vercel after setting these.

### 2.3 SPA Routing

The included `vercel.json` handles all React Router routes. No additional configuration needed.

### 2.4 PWA (Progressive Web App)

The app is fully PWA-ready:
- Service worker auto-updates on each deploy
- Manifest is served at `/manifest.webmanifest`
- Install prompt appears automatically on supported browsers (Chrome, Edge, Android)
- iOS users see step-by-step Share → Add to Home Screen instructions
- A prominent **Download App** button is shown in the hero section and the app download section

---

## 3. Custom Domain (wishtenter.com)

### 3.1 Add Domain on Vercel

1. Vercel → Your Project → **Domains** → Add `wishtenter.com` and `www.wishtenter.com`
2. Vercel provides DNS records to add to your domain registrar

### 3.2 Update CORS on Railway

Once the domain is live, update Railway's `CORS_ORIGIN` variable:

```env
CORS_ORIGIN=https://wishtenter.com,https://www.wishtenter.com
```

### 3.3 Update Frontend API URL

Update Vercel's `VITE_API_URL` to point to your Railway URL (Railway also supports custom domains for the backend if needed).

---

## 4. Verify Deployment

After deploying both services:

1. **Health check**: `GET https://your-railway-url/api/health` → should return `200 OK`
2. **Frontend loads**: Visit your Vercel URL or custom domain
3. **PWA install**: Open the site in Chrome/Edge on Android — you should see an install prompt
4. **Auth works**: Try signing up and logging in
5. **Uploads**: Upload a profile photo and check that it persists after a Railway redeploy
6. **Images from old data**: Open a profile/wish that existed before deploy — photo should load from `https://your-railway-url/uploads/...`

---

## 5. Local Development

```bash
# Frontend
npm install
npm run dev       # starts on http://localhost:5173

# Backend
cd server
npm install
npm run dev       # starts on http://localhost:5000
```

The Vite dev server proxies `/uploads/*` requests to `http://localhost:5000`.

---

## 6. Re-deploying

- **Frontend**: Vercel auto-deploys on every push to your main branch
- **Backend**: Railway auto-deploys on every push to your main branch
- Migrations run automatically on backend deploy (`prisma migrate deploy`)
