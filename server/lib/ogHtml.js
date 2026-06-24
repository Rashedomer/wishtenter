const DEFAULT_SITE = 'https://www.wishtenter.com';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toOgImage(url, site = DEFAULT_SITE, mediaOrigin = null) {
  if (!url) return `${site.replace(/\/$/, '')}/logo.jpeg`;
  const str = String(url);
  if (str.startsWith('https://res.cloudinary.com/')) {
    return str.replace('/upload/', '/upload/c_fill/w_1200/h_630/f_jpg/q_auto/');
  }
  if (str.startsWith('http://') || str.startsWith('https://')) return str;

  const path = str.startsWith('/') ? str : `/${str}`;
  const isMedia = path.startsWith('/api/media/') || path.startsWith('/uploads/');
  const origin = (isMedia && mediaOrigin ? mediaOrigin : site).replace(/\/$/, '');
  const mediaPath = path.startsWith('/uploads/')
    ? path.replace(/^\/uploads\//, '/api/media/')
    : path;
  return `${origin}${mediaPath}`;
}

export function buildOgHtml({ title, description, image, pageUrl, profilePath, site = DEFAULT_SITE }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image || `${site}/logo.jpeg`);
  const safeUrl = escapeHtml(pageUrl);
  const safePath = escapeHtml(profilePath);

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:site_name" content="Wishtenter" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <script>
    (function () {
      var ua = navigator.userAgent || '';
      if (!/bot|crawl|spider|facebook|whatsapp|telegram|preview|external/i.test(ua)) {
        window.location.replace('${safePath}');
      }
    })();
  </script>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <img src="${safeImage}" alt="${safeTitle}" width="1200" height="630" />
  <p><a href="${safePath}">Open on Wishtenter</a></p>
</body>
</html>`;
}

export function profileOgFromApi(profile, { site = DEFAULT_SITE, wishId = null, mediaOrigin = null } = {}) {
  const username = profile.username;
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';
  const profileUrl = `${site}/${encodeURIComponent(username)}${wishQuery}`;

  let title = `${profile.displayName}'s Wishlist on Wishtenter`;
  let description = profile.bio || `Support ${profile.displayName} on Wishtenter.`;
  let image = profile.avatarUrl || profile.coverUrl;

  if (wishId && profile.goals?.length) {
    const goal = profile.goals.find((g) => g.id === wishId) || profile.goals[0];
    if (goal) {
      title = `${goal.title} — ${profile.displayName} on Wishtenter`;
      description = goal.description || title;
      image = goal.imageUrl || image;
    }
  }

  return buildOgHtml({
    title,
    description: String(description).slice(0, 200),
    image: toOgImage(image, site, mediaOrigin),
    pageUrl: profileUrl,
    profilePath: profileUrl,
    site,
  });
}
