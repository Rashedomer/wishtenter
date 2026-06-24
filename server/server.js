require('./config/loadEnv');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { UPLOADS_DIR } = require('./config/paths');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS for production
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    'https://wishtenter.com',
    'https://www.wishtenter.com',
  ].filter(Boolean);

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Enable gzip compression for responses
app.use(compression({
  level: 6, // Balance between speed and compression ratio
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Webhook must be before express.json() for raw body
const { handleWebhook } = require('./controllers/stripeController');
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

// Cache middleware — do not override Cache-Control with no-cache on public GETs
app.use((req, res, next) => {
  if (req.path.includes('/api/auth/') || req.path.includes('/admin')) {
    res.set('Cache-Control', 'private, no-store');
  } else if (req.method === 'GET' && req.path.startsWith('/api/')) {
    if (req.path.startsWith('/api/media/')) {
      res.set('Cache-Control', 'public, max-age=604800, immutable');
    } else {
      const privatePaths = ['/me', '/my-history', '/my', '/notifications'];
      const isPrivate = privatePaths.some((p) => req.path.includes(p));
      res.set('Cache-Control', isPrivate ? 'private, no-store' : 'public, max-age=60, stale-while-revalidate=120');
    }
  }
  next();
});

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);

const { getFrontendBase } = require('./utils/siteUrl');
const { injectShareFixIntoHtml } = require('../lib/shareFixScript.cjs');

function injectShareFixHtml(html) {
  return injectShareFixIntoHtml(html, getFrontendBase());
}

/** Permanent redirect: Railway /share/:user → wishtenter.com/:user */
function railwayShareRedirect(req, res, next) {
  const host = (req.get('host') || '').toLowerCase();
  if (!host.includes('railway.app')) return next();
  const match = req.path.match(/^\/share\/([^/]+)\/?$/);
  if (!match) return next();
  const username = match[1];
  const wishId = typeof req.query.wish === 'string' ? req.query.wish : null;
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';
  const target = `${getFrontendBase()}/${encodeURIComponent(username)}${wishQuery}`;
  res.set('Cache-Control', 'public, max-age=86400');
  return res.redirect(301, target);
}

const shareFixCandidates = [
  path.join(__dirname, '..', 'public', 'wishtenter-share-fix.js'),
  path.join(__dirname, 'dist', 'wishtenter-share-fix.js'),
];
const shareFixPath = shareFixCandidates.find((p) => fs.existsSync(p));
if (shareFixPath) {
  app.get('/share-url-fix.js', (_req, res) => {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.sendFile(shareFixPath);
  });
}

// Request Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/media', require('./routes/media'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/creators', require('./routes/creators'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/health', require('./routes/health'));
app.use('/api/config', require('./routes/config'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/meta', require('./routes/meta'));
app.use(railwayShareRedirect);
app.use('/share', require('./routes/share'));

const { crawlerOgMiddleware } = require('./middleware/crawlerOg');
app.use(crawlerOgMiddleware);

function resolveFrontendDist() {
  const candidates = [
    path.join(__dirname, 'dist'),
    path.resolve(__dirname, '..', 'dist'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

const FRONTEND_DIST = resolveFrontendDist();
const serveFrontend =
  process.env.SERVE_FRONTEND === '1' ||
  (process.env.SERVE_FRONTEND !== '0' && !!FRONTEND_DIST);

if (serveFrontend) {
  console.log(`🌐 Serving frontend from ${FRONTEND_DIST}`);
  
  // Serve static assets with caching, but DO NOT cache index.html
  app.use(express.static(FRONTEND_DIST, { 
    maxAge: '1d', 
    index: false // We will handle index.html manually to prevent caching
  }));
  
  app.use((req, res, next) => {
    // Hard redirect: Kill the railway frontend domain
    // If a human visitor somehow hits the railway domain directly (e.g. from an old link),
    // redirect them to the canonical wishtenter.com domain immediately.
    const host = req.get('host') || '';
    if (host.includes('railway.app') && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/') && !req.path.startsWith('/share/')) {
      const canonical = require('./utils/siteUrl').getFrontendBase();
      if (canonical && canonical !== 'http://localhost:5173' && !canonical.includes('railway.app')) {
        return res.redirect(301, `${canonical}${req.originalUrl}`);
      }
    }
    
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/share/') ||
      req.path.startsWith('/uploads/')
    ) {
      return next();
    }
    
    // Serve index.html without caching — inject share-fix for stale bundles on Railway
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const indexPath = path.join(FRONTEND_DIST, 'index.html');
    fs.readFile(indexPath, 'utf8', (readErr, html) => {
      if (readErr) return next(readErr);
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(injectShareFixHtml(html));
    });
  });
} else {
  app.get('/', (req, res) => {
    res.send('Virtual Wishlist API is running...');
  });
}

const { processReleasedFunds } = require('./utils/fundsProcessor');

const { getStripeSecretKey } = require('./utils/stripeClient');
if (!getStripeSecretKey()) {
  console.warn('⚠️  STRIPE_SECRET_KEY is missing or malformed — payments will not work.');
  console.warn('    Fix server/.env: one key per line, copy full key from https://dashboard.stripe.com/apikeys');
} else {
  console.log('✅ Stripe secret key loaded');
}

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY is missing — creator gift emails will not be sent.');
  console.warn('    Add RESEND_API_KEY and EMAIL_FROM to Railway/server env (see server/.env.example).');
} else {
  console.log('✅ Resend email API key loaded');
}

console.log('Attempting to start server...');
const server = app.listen(PORT, () => {
  console.log(`🚀 Server successfully started on port ${PORT}`);
  const { getFrontendBase } = require('./utils/siteUrl');
  console.log(`🌐 Frontend URL: ${getFrontendBase()}`);
  if (/localhost|127\.0\.0\.1/i.test(process.env.FRONTEND_URL || '')) {
    console.warn('⚠️  FRONTEND_URL env is localhost — using https://www.wishtenter.com for redirects/OG');
  }

  processReleasedFunds();
  setInterval(processReleasedFunds, 60 * 60 * 1000);

  if (process.env.DISABLE_STRIPE_RECOVERY !== '1') {
    setTimeout(async () => {
      try {
        const { recoverMissedStripeTips } = require('./utils/stripeRecovery');
        const result = await recoverMissedStripeTips({ days: 30 });
        if (result.synced > 0) {
          console.log(`[Stripe:recovery] Imported ${result.synced} missed tip(s) from Stripe`);
        }
      } catch (err) {
        console.error('[Stripe:recovery] Startup sync failed:', err.message);
      }
    }, 5000);
  }
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
});