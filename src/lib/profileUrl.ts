import { PUBLIC_SHARE_SITE, buildProfileShareUrl, buildWishShareUrl } from '@/lib/shareUrl';

/** App routes — profile slug must not collide with these */
export const RESERVED_PROFILE_SLUGS = new Set([
  'signup',
  'login',
  'dashboard',
  'creator-dashboard',
  'supporter-dashboard',
  'explore',
  'how-it-works',
  'settings',
  'verify-email',
  'forgot-password',
  'verify-otp',
  'verify-email-otp',
  'wallet',
  'admin',
  'api',
  'uploads',
  'assets',
  'share',
]);

export function isReservedProfileSlug(slug: string): boolean {
  const key = decodeURIComponent(slug).toLowerCase().trim();
  return RESERVED_PROFILE_SLUGS.has(key);
}

const CANONICAL_SITE = PUBLIC_SHARE_SITE;

declare global {
  interface Window {
    /** Set in index.html — always wishtenter.com share URLs */
    __wishtenterPublicUrl?: (username: string, wishId?: string | null) => string;
  }
}

function isLocalDev(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
}

/** Public profile page path (in-app routing) */
export function profilePath(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

/** Full public URL — https://www.wishtenter.com/Username */
export function profilePublicUrl(username: string): string {
  return `${CANONICAL_SITE}${profilePath(username)}`;
}

/** Copy/share link — always wishtenter.com (never Railway) */
export function profileFullUrl(username: string): string {
  if (isLocalDev()) {
    return `${window.location.origin}${profilePath(username)}`;
  }
  if (typeof window !== 'undefined' && window.__wishtenterPublicUrl) {
    return window.__wishtenterPublicUrl(username);
  }
  return buildProfileShareUrl(username);
}

/** Display URL in dashboard UI */
export function profileDisplayUrl(username: string): string {
  if (isLocalDev()) {
    const host =
      typeof window !== 'undefined'
        ? window.location.host.replace(/^www\./, '')
        : 'localhost:5173';
    return `${host}/${username}`;
  }
  return `wishtenter.com/${username}`;
}

/** In-app wish deep link path */
export function wishPath(username: string, wishId: string): string {
  return `${profilePath(username)}?wish=${encodeURIComponent(wishId)}`;
}

/** Full share URL for a wish — wishtenter.com/User?wish=id (wish image in preview) */
export function wishFullUrl(username: string, wishId: string): string {
  if (isLocalDev()) {
    return `${window.location.origin}${wishPath(username, wishId)}`;
  }
  if (typeof window !== 'undefined' && window.__wishtenterPublicUrl) {
    return window.__wishtenterPublicUrl(username, wishId);
  }
  return buildWishShareUrl(username, wishId);
}

/** Fallback entry when SPA routing fails — ?p=username */
export function appProfileEntryUrl(username: string, wishId?: string | null): string {
  const params = new URLSearchParams();
  params.set('p', username);
  if (wishId) params.set('wish', wishId);
  return `${CANONICAL_SITE}/?${params.toString()}`;
}

/** @deprecated */
export function shareProfilePath(username: string): string {
  return profilePath(username);
}

/** @deprecated */
export function shareWishPath(username: string, wishId: string): string {
  return wishPath(username, wishId);
}
