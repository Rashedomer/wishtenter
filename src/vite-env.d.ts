/// <reference types="vite/client" />

declare const __WISHTENTER_BACKEND__: string;
declare const __WISHTENTER_SHARE_BASE__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SHARE_URL?: string;
  readonly VITE_UPLOADS_ORIGIN?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
