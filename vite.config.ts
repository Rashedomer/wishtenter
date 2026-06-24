import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

const PUBLIC_SHARE_SITE = 'https://www.wishtenter.com'

const FAVICON_VERSION = process.env.FAVICON_VERSION || String(Date.now())

function injectFaviconVersion(html: string) {
  const v = FAVICON_VERSION
  return html
    .replace(/href="\/(favicon\.ico|favicon\.svg|favicon-16\.png|favicon-32\.png|wishtenter-icon\.png|logo\.jpeg|pwa-icon-192\.png|pwa-icon-192\.jpeg|pwa-icon-512\.jpeg)"/g, 'href="/$1?v=' + v + '"')
}

function injectShareFixIntoHtml(html: string, site = PUBLIC_SHARE_SITE) {
  if (!html || html.includes('id="wishtenter-share-fix"')) return html
  const safeSite = String(site).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const script = `<script id="wishtenter-share-fix">(function(){var S='${safeSite}';var R=/^https?:\\/\\/[^/]+\\.railway\\.app(?:\\/share)?\\/([^/?#]+)(\\?wish=([^&]+))?/i;function t(u){if(!u||typeof u!=='string')return u;var m=u.match(R);if(!m)return u;var user=decodeURIComponent(m[1]);if(!user||/^(api|uploads|assets|share|admin|dashboard)$/i.test(user))return u;var o=S+'/'+encodeURIComponent(user);return m[3]?o+'?wish='+m[3]:o;}window.__wishtenterPublicUrl=function(u,w){var b=S+'/'+encodeURIComponent(u);return w?b+'?wish='+encodeURIComponent(w):b;};window.__wishtenterShareFix=t;if(navigator.clipboard&&navigator.clipboard.writeText){var w=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=function(x){return w(t(x));};}if(navigator.share){var sh=navigator.share.bind(navigator);navigator.share=function(d){if(d&&d.url)d=Object.assign({},d,{url:t(d.url)});return sh(d);};}document.addEventListener('copy',function(e){try{var dt=e.clipboardData;if(!dt)return;var sel=window.getSelection?String(window.getSelection()):'';if(!sel||!R.test(sel))return;e.preventDefault();dt.setData('text/plain',t(sel));}catch(_){}},true);})();</script>`
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${script}`)
  }
  return `${script}${html}`
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __WISHTENTER_BACKEND__: JSON.stringify(
      process.env.VITE_BACKEND_URL || 'https://wishtenter-system-production.up.railway.app'
    ),
    /** Share links — always wishtenter.com, never Railway */
    __WISHTENTER_SHARE_BASE__: JSON.stringify('https://www.wishtenter.com'),
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'inject-share-fix',
      transformIndexHtml(html) {
        return injectFaviconVersion(injectShareFixIntoHtml(html))
      },
    },
    {
      name: 'spa-404-fallback',
      closeBundle() {
        const outDir = path.resolve(__dirname, 'dist');
        const indexPath = path.join(outDir, 'index.html');
        const fallbackPath = path.join(outDir, '404.html');
        const vercelSrc = path.resolve(__dirname, 'vercel.json');
        const vercelDest = path.join(outDir, 'vercel.json');
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, fallbackPath);
        }
        if (fs.existsSync(vercelSrc)) {
          fs.copyFileSync(vercelSrc, vercelDest);
        }
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-16.png', 'favicon-32.png', 'wishtenter-icon.png', 'logo.jpeg', 'pwa-icon-192.jpeg', 'pwa-icon-192.png', 'pwa-icon-512.png', 'pwa-icon-512.jpeg'],
      manifest: {
        id: '/',
        name: 'Wishtenter',
        short_name: 'Wishtenter',
        description: 'Fund your dreams — receive gifts on your wishlist',
        theme_color: '#3b82f6',
        background_color: '#0a0a0a',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['social', 'finance', 'lifestyle'],
        icons: [
          {
            src: '/pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        // Never intercept navigations — SW only caches static assets (fixes blank PWA launch)
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,ico,png,jpg,jpeg,svg,woff2,webmanifest}'],
        globIgnores: ['**/index.html', '**/404.html'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'avatar-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Uploaded images — NetworkFirst, never cache errors
            urlPattern: /\/uploads\/.+\.(jpe?g|png|gif|webp)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
