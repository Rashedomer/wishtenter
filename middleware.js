/**
 * Social crawlers (WhatsApp, Telegram, iMessage, etc.) don't run React.
 * Serve OG HTML for profile/share URLs before SPA routing.
 */

import { buildOgHtml, profileOgFromApi, toOgImage } from './lib/ogHtml.js';

const CRAWLER_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|discordbot|slackbot|embedly|pinterest|redditbot|applebot|bingpreview|googlebot|vkshare|quora|preview|iframely|meta-external/i;

const RESERVED = new Set([
  'signup', 'login', 'dashboard', 'creator-dashboard', 'supporter-dashboard',
  'explore', 'how-it-works', 'settings', 'verify-email', 'forgot-password',
  'verify-otp', 'verify-email-otp', 'wallet', 'admin', 'api', 'uploads', 'assets', 'share',
]);

const BACKEND =
  process.env.BACKEND_URL ||
  'https://wishtenter-system-production.up.railway.app';

import { injectShareFixIntoHtml, PUBLIC_SHARE_SITE } from './lib/shareFixScript.js';

const SITE = (process.env.FRONTEND_URL || PUBLIC_SHARE_SITE).replace(/\/$/, '');

function shouldInjectShareFix(pathname) {
  if (pathname.startsWith('/assets/')) return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/uploads/')) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  return true;
}

function parseUsername(pathname) {
  const shareMatch = pathname.match(/^\/share\/([^/]+)$/);
  if (shareMatch) return decodeURIComponent(shareMatch[1]);

  const legacy = pathname.match(/^\/u\/([^/]+)$/);
  const path = legacy ? `/${legacy[1]}` : pathname;
  const match = path.match(/^\/([^/]+)$/);
  if (!match) return null;

  const username = decodeURIComponent(match[1]);
  if (RESERVED.has(username.toLowerCase())) return null;
  if (username.includes('.')) return null;
  return username;
}

async function fetchOgHtml(username, search) {
  const wishMatch = search.match(/[?&]wish=([^&]+)/);
  const wishId = wishMatch ? decodeURIComponent(wishMatch[1]) : null;
  const backend = BACKEND.replace(/\/$/, '');
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';

  const metaRes = await fetch(
    `${backend}/share/${encodeURIComponent(username)}${wishQuery}`,
    {
      headers: {
        Accept: 'text/html',
        'x-forwarded-host': 'www.wishtenter.com',
      },
      redirect: 'manual',
    }
  );
  if (metaRes.status === 200) {
    const html = await metaRes.text();
    if (html.includes('og:image') && !html.includes('id="root"')) {
      return html;
    }
  }

  const profileRes = await fetch(`${backend}/api/creators/${encodeURIComponent(username)}`);
  if (profileRes.ok) {
    const profile = await profileRes.json();
    return profileOgFromApi(profile, { site: SITE, wishId, mediaOrigin: backend });
  }

  return buildOgHtml({
    title: 'Wishtenter — Fund Dreams Together',
    description: 'Support creators on Wishtenter.',
    image: toOgImage('/logo.jpeg', SITE),
    pageUrl: `${SITE}/${encodeURIComponent(username)}${wishQuery}`,
    profilePath: `${SITE}/${encodeURIComponent(username)}${wishQuery}`,
    site: SITE,
  });
}

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  if (CRAWLER_UA.test(ua)) {
    const username = parseUsername(url.pathname);
    if (username) {
      try {
        const html = await fetchOgHtml(username, url.search);
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          },
        });
      } catch {
        /* fall through */
      }
    }
  }

  if (request.method === 'GET' && shouldInjectShareFix(url.pathname)) {
    try {
      const response = await fetch(request);
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('text/html')) {
        const html = await response.text();
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        headers.delete('content-length');

        if (!html.includes('wishtenter-share-fix')) {
          return new Response(injectShareFixIntoHtml(html, SITE), {
            status: response.status,
            headers,
          });
        }

        // response.text() consumed the body — must return a fresh Response
        return new Response(html, { status: response.status, headers });
      }
      return response;
    } catch {
      return fetch(request);
    }
  }
}

export const config = {
  matcher: [
    '/share/:username',
    '/:username',
    '/u/:username',
    '/((?!assets/|api/|uploads/|.*\\..*).*)',
  ],
};
