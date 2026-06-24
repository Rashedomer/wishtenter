/**
 * Build OG share/preview HTML for profiles and wishes.
 * Used by /api/meta, /share, Vercel api/share, and edge middleware.
 */
const prisma = require('../prisma/client');
const { normalizeProfile, normalizeGoal, toAbsoluteMediaUrl } = require('../utils/mediaUrl');
const { getFrontendBase } = require('../utils/siteUrl');

const RESERVED_SLUGS = new Set([
  'signup', 'login', 'dashboard', 'creator-dashboard', 'supporter-dashboard',
  'explore', 'how-it-works', 'settings', 'verify-email', 'forgot-password',
  'verify-otp', 'verify-email-otp', 'wallet', 'admin', 'api', 'uploads', 'assets',
  'share',
]);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeOgText(str) {
  return String(str || '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function toOgImageUrl(url) {
  if (!url) return null;
  const str = String(url);
  if (str.startsWith('https://res.cloudinary.com/')) {
    // Slash-delimited transforms — WhatsApp parsers handle these more reliably than commas
    return str.replace('/upload/', '/upload/c_fill/w_1200/h_630/f_jpg/q_auto/');
  }
  if (/\.(svg|gif)(\?|$)/i.test(str)) {
    return null;
  }
  if (/\.webp(\?|$)/i.test(str)) {
    return str.replace(/\.webp(\?|$)/i, '.jpg$1');
  }
  return str;
}

function buildMetaHtml({ title, description, image, shareUrl, profilePath }) {
  const safeTitle = escapeHtml(sanitizeOgText(title));
  const safeDesc = escapeHtml(sanitizeOgText(description));
  const safeImage = escapeHtml(image);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeProfilePath = escapeHtml(profilePath);

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <link rel="image_src" href="${safeImage}" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeShareUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${safeShareUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:site_name" content="Wishtenter" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <script>
    (function () {
      var ua = navigator.userAgent || '';
      if (!/bot|crawl|spider|facebook|whatsapp|telegram|preview|external/i.test(ua)) {
        window.location.replace('${safeProfilePath}');
      }
    })();
  </script>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <img src="${safeImage}" alt="${safeTitle}" width="1200" height="630" />
  <p><a href="${safeProfilePath}">Open on Wishtenter</a></p>
</body>
</html>`;
}

function resolvePublicShareUrl(_req, username, wishId) {
  const frontendBase = getFrontendBase();
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';
  return `${frontendBase}/${encodeURIComponent(username)}${wishQuery}`;
}

async function loadWishGoal(profileId, wishId) {
  if (!wishId) return null;
  return prisma.goal.findFirst({
    where: { id: wishId, creatorId: profileId },
  });
}

async function buildShareMetaHtml(username, wishId, req) {
  const decoded = decodeURIComponent(username);

  if (!decoded || RESERVED_SLUGS.has(decoded.toLowerCase().trim())) {
    const frontendBase = getFrontendBase();
    return buildMetaHtml({
      title: 'Wishtenter — Fund Dreams Together',
      description: 'Wishtenter connects creators with fans. The secure way to receive virtual gifts and support.',
      image: `${frontendBase}/logo.jpeg`,
      shareUrl: frontendBase,
      profilePath: frontendBase,
    });
  }

  const profile = await prisma.profile.findUnique({
    where: { username: decoded },
  });

  if (!profile) {
    return null;
  }

  const normalized = normalizeProfile(profile);
  const frontendBase = getFrontendBase();
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';
  const profileUrl = `${frontendBase}/${encodeURIComponent(profile.username)}${wishQuery}`;
  const shareUrl = resolvePublicShareUrl(req, profile.username, wishId);
  const fallbackImage = `${frontendBase}/logo.jpeg`;

  let title;
  let description;
  let rawImage;

  const goal = await loadWishGoal(profile.id, wishId);

  if (goal) {
    const normalizedGoal = normalizeGoal(goal);
    title = `${normalizedGoal.title} — ${profile.displayName} on Wishtenter`;
    description = normalizedGoal.description
      ? normalizedGoal.description.slice(0, 200)
      : `Support ${profile.displayName} by granting their wish "${normalizedGoal.title}" on Wishtenter.`;
    rawImage = normalizedGoal.imageUrl || normalized.avatarUrl || normalized.coverUrl;
  } else {
    title = `${profile.displayName}'s Wishlist on Wishtenter`;
    description = profile.bio
      ? profile.bio.slice(0, 200)
      : `Support ${profile.displayName} by granting wishes on Wishtenter — the secure way to receive virtual gifts.`;
    rawImage = normalized.avatarUrl || normalized.coverUrl;
  }

  const image = toOgImageUrl(toAbsoluteMediaUrl(rawImage)) || fallbackImage;

  return buildMetaHtml({ title, description, image, shareUrl, profilePath: profileUrl });
}

function isProxiedFromFrontend(req) {
  const forwarded = (
    req.get('x-forwarded-host') ||
    req.get('x-vercel-forwarded-host') ||
    ''
  ).toLowerCase();
  return forwarded.includes('wishtenter.com') || forwarded.includes('vercel.app');
}

/** Old app copies railway.app/share/… — redirect browsers, but serve OG HTML for meta fetches. */
function isDirectBackendShareRequest(req) {
  const host = (req.get('host') || '').toLowerCase();
  if (!host.includes('railway.app') || isProxiedFromFrontend(req)) return false;
  const accept = req.get('accept') || '';
  if (accept.includes('text/html')) return false;
  return true;
}

const getShareMeta = async (req, res) => {
  const { username } = req.params;
  const wishId = req.query.wish || null;
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';

  if (isDirectBackendShareRequest(req)) {
    const target = `${getFrontendBase()}/${encodeURIComponent(username)}${wishQuery}`;
    res.set('Cache-Control', 'public, max-age=300');
    return res.redirect(301, target);
  }

  try {
    const html = await buildShareMetaHtml(username, wishId, req);
    if (!html) {
      return res.status(404).send('Creator not found');
    }

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.send(html);
  } catch (err) {
    console.error('[Meta] getShareMeta error:', err);
    res.status(500).send('Error generating preview');
  }
};

module.exports = {
  getShareMeta,
  buildShareMetaHtml,
  buildMetaHtml,
  toOgImageUrl,
  toAbsoluteMediaUrl,
};
