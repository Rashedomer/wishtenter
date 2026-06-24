/**
 * Social crawlers (WhatsApp, iMessage, etc.) don't run React.
 * Serve OG HTML for profile URLs: /Username and /Username?wish=id
 */
const { buildShareMetaHtml } = require('../controllers/metaController');

const CRAWLER_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|discordbot|slackbot|embedly|pinterest|redditbot|applebot|bingpreview|googlebot|vkshare|quora|preview|iframely|meta-external/i;

const RESERVED = new Set([
  'signup', 'login', 'dashboard', 'creator-dashboard', 'supporter-dashboard',
  'explore', 'how-it-works', 'settings', 'verify-email', 'forgot-password',
  'verify-otp', 'verify-email-otp', 'wallet', 'admin', 'api', 'uploads', 'assets', 'share',
]);

function parseProfileUsername(pathname) {
  const match = pathname.match(/^\/([^/]+)$/);
  if (!match) return null;

  const username = decodeURIComponent(match[1]);
  if (!username || RESERVED.has(username.toLowerCase().trim())) return null;
  if (username.includes('.')) return null;
  return username;
}

async function crawlerOgMiddleware(req, res, next) {
  if (req.method !== 'GET') return next();
  if (!CRAWLER_UA.test(req.get('user-agent') || '')) return next();

  const username = parseProfileUsername(req.path);
  if (!username) return next();

  try {
    const wishId = typeof req.query.wish === 'string' ? req.query.wish : null;
    const html = await buildShareMetaHtml(username, wishId, req);
    if (!html) return next();

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.send(html);
  } catch (err) {
    console.error('[crawlerOg]', err.message);
    return next();
  }
}

module.exports = { crawlerOgMiddleware };
