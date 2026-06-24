import { getApiBaseUrl, PRODUCTION_BACKEND_ORIGIN } from '@/lib/productionBackend';

/** Extract filename from /uploads/..., /api/media/..., absolute URLs, or raw filenames */
function extractUploadFilename(url: string): string | null {
  let path = url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      path = new URL(url).pathname;
    } catch {
      return null;
    }
  }
  
  // If the path doesn't contain a slash, treat it as a raw filename
  if (!path.includes('/')) {
    return decodeURIComponent(path);
  }

  // Also catch cases where it starts with a slash but is just a filename e.g. /1781694090981.jpg
  const rootFilenameMatch = path.match(/^\/([^/?#]+)$/);
  if (rootFilenameMatch && path.match(/\.(jpg|jpeg|png|webp|gif|avif|heic|svg)$/i)) {
    return decodeURIComponent(rootFilenameMatch[1]);
  }

  const match = path.match(/\/(?:uploads|api\/media)\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolve upload/media URLs to the API media endpoint.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';

  const filename = extractUploadFilename(url);
  if (filename) {
    return `${getApiBaseUrl()}/media/${encodeURIComponent(filename)}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const pathname = url.startsWith('/') ? url : `/${url}`;
  const fn = extractUploadFilename(pathname);
  if (fn) {
    return `${getApiBaseUrl()}/media/${encodeURIComponent(fn)}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${pathname}`;
  }
  return `${PRODUCTION_BACKEND_ORIGIN}${pathname}`;
}

/** Generated avatar URL used as a fallback when an uploaded image fails. */
export function fallbackAvatarUrl(seed?: string | null): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'wishtenter')}`;
}

/**
 * onError handler for avatar <img> tags — falls back directly to generated avatar.
 * The /api/media/ endpoint is the single source of truth now.
 */
export function handleAvatarError(
  e: React.SyntheticEvent<HTMLImageElement>,
  seed?: string | null,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackAvatarUrl(seed);
}

/**
 * onError handler for wish/cover images — falls back directly to generated shape.
 */
export function handleMediaError(
  e: React.SyntheticEvent<HTMLImageElement>,
  seed?: string | null,
): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = '1';
  img.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed || 'wishtenter')}`;
}
