import { getUploadsOrigin, PRODUCTION_BACKEND_ORIGIN } from '@/lib/productionBackend';

const DEFAULT_SHARE_BASE = 'https://www.wishtenter.com';

let cachedUploadsOrigin: string | null = null;
let cachedShareBase: string | null = null;

export function getCachedUploadsOrigin(): string | null {
  return cachedUploadsOrigin;
}

/** Share URL base for WhatsApp OG previews (from API or index.html meta) */
export function getShareBase(): string {
  if (cachedShareBase) return cachedShareBase;

  if (typeof document !== 'undefined') {
    const shareMeta = document.querySelector('meta[name="share-base"]');
    const shareContent = shareMeta?.getAttribute('content');
    if (shareContent?.startsWith('http')) {
      return shareContent.replace(/\/$/, '');
    }
    const backendMeta = document.querySelector('meta[name="backend-origin"]');
    const backendContent = backendMeta?.getAttribute('content');
    if (backendContent?.startsWith('http') && !backendContent.includes('railway.app')) {
      return 'https://www.wishtenter.com';
    }
  }

  return DEFAULT_SHARE_BASE;
}

/** Preload config — never block first paint (PWA cold start must render immediately). */
export async function loadRuntimeConfig(): Promise<void> {
  cachedUploadsOrigin = getUploadsOrigin();
  cachedShareBase = getShareBase();

  if (import.meta.env.DEV) return;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${PRODUCTION_BACKEND_ORIGIN}/api/config`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json()) as { uploadsOrigin?: string; shareBase?: string };
      if (data.uploadsOrigin?.startsWith('http')) {
        cachedUploadsOrigin = data.uploadsOrigin.replace(/\/$/, '');
      }
      if (data.shareBase?.startsWith('http') && !data.shareBase.includes('railway.app')) {
        cachedShareBase = data.shareBase.replace(/\/$/, '');
      }
    }
  } catch {
    /* meta tag + DEFAULT_SHARE_BASE fallback */
  } finally {
    window.clearTimeout(timeout);
  }
}
