/** Production Railway backend — baked into build via vite.config define */
export const PRODUCTION_BACKEND_ORIGIN =
  typeof __WISHTENTER_BACKEND__ !== 'undefined' && __WISHTENTER_BACKEND__
    ? __WISHTENTER_BACKEND__
    : 'https://wishtenter-system-production.up.railway.app';

/** Public site base for share URLs — wishtenter.com/Username */
export const PRODUCTION_SHARE_BASE =
  typeof __WISHTENTER_SHARE_BASE__ !== 'undefined' && __WISHTENTER_SHARE_BASE__
    ? __WISHTENTER_SHARE_BASE__.replace(/\/$/, '')
    : 'https://www.wishtenter.com';

export function isWishtenterProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.replace(/^www\./, '');
  return host === 'wishtenter.com';
}

export function getProductionBackendOrigin(): string | null {
  return isWishtenterProductionHost() ? PRODUCTION_BACKEND_ORIGIN : null;
}

export function getUploadsOrigin(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  return PRODUCTION_BACKEND_ORIGIN;
}

export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  return `${PRODUCTION_BACKEND_ORIGIN}/api`;
}
