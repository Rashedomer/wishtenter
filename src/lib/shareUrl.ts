/** Canonical public share links — never Railway */
export const PUBLIC_SHARE_SITE = 'https://www.wishtenter.com';

const RAILWAY_SHARE_RE =
  /^https?:\/\/[^/]+\.railway\.app(?:\/share)?\/([^/?#]+)(\?wish=([^&]+))?/i;

const RESERVED_RAILWAY_PATHS = new Set([
  'api', 'uploads', 'share', 'assets', 'admin', 'dashboard',
]);

function railwayProfileToPublic(_match: string, user: string, _q: string, wish?: string): string {
  const decoded = decodeURIComponent(user);
  if (RESERVED_RAILWAY_PATHS.has(decoded.toLowerCase())) return _match;
  const out = `${PUBLIC_SHARE_SITE}/${encodeURIComponent(decoded)}`;
  return wish ? `${out}?wish=${wish}` : out;
}

export function buildProfileShareUrl(username: string): string {
  return `${PUBLIC_SHARE_SITE}/${encodeURIComponent(username)}`;
}

export function buildWishShareUrl(username: string, wishId: string): string {
  return `${PUBLIC_SHARE_SITE}/${encodeURIComponent(username)}?wish=${encodeURIComponent(wishId)}`;
}

/** Rewrite legacy Railway share URLs to wishtenter.com */
export function toPublicShareUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  let out = url.replace(RAILWAY_SHARE_RE, railwayProfileToPublic);

  if (/^https?:\/\/[^/]+\.railway\.app\//i.test(out)) {
    out = out.replace(
      /^https?:\/\/[^/]+\.railway\.app\/([^/?#]+)(\?wish=([^&]+))?/i,
      railwayProfileToPublic
    );
  }

  return out;
}
