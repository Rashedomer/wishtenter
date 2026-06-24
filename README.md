# Wishtenter — Virtual Wishlist & Creator Support Platform

Wishtenter connects creators with fans who want to fund their dreams. Receive virtual gifts, set funding goals, and withdraw when you're ready.

**Live:** [wishtenter.com](https://wishtenter.com)

---

## Tech Stack

| Layer    | Technology                     |
|----------|--------------------------------|
| Frontend | React 19, TypeScript, Vite     |
| Styling  | TailwindCSS v4, Framer Motion  |
| Backend  | Node.js, Express v5            |
| Database | PostgreSQL + Prisma ORM        |
| Auth     | JWT + Supabase                 |
| Payments | Stripe                         |
| Email    | Resend                         |
| PWA      | vite-plugin-pwa + Workbox      |

---

## Local Development

### Frontend

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. API requests to `/uploads` are proxied to the backend.

### Backend

```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:5000`.

Copy `server/.env.example` to `server/.env` and fill in your credentials.

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup instructions on:
- **Railway** — Backend API + PostgreSQL + file storage volumes
- **Vercel** — Frontend SPA with PWA support and custom domain

---

## PWA (Install as App)

Wishtenter is a fully installable Progressive Web App:

- **Android / Desktop (Chrome/Edge):** A "Download App" button appears on the landing page. Click it to install.
- **iOS (Safari):** Tap the Share button → "Add to Home Screen".

The service worker caches assets for fast offline-capable loading.
