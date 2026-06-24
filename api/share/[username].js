import { buildOgHtml, profileOgFromApi, toOgImage } from '../../lib/ogHtml.js';

const BACKEND =
  process.env.META_API_ORIGIN ||
  process.env.BACKEND_URL ||
  'https://wishtenter-system-production.up.railway.app';

const SITE = (process.env.FRONTEND_URL || 'https://www.wishtenter.com').replace(/\/$/, '');

export default async function handler(req, res) {
  const username = req.query.username;
  const wishId = typeof req.query.wish === 'string' ? req.query.wish : null;

  if (!username) {
    res.status(400).send('Username required');
    return;
  }

  const backend = BACKEND.replace(/\/$/, '');
  const wishQuery = wishId ? `?wish=${encodeURIComponent(wishId)}` : '';

  try {
    const metaRes = await fetch(
      `${backend}/share/${encodeURIComponent(username)}${wishQuery}`,
      { headers: { Accept: 'text/html' } }
    );

    if (metaRes.ok) {
      const html = await metaRes.text();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.status(200).send(html);
      return;
    }

    const profileRes = await fetch(`${backend}/api/creators/${encodeURIComponent(username)}`);
    if (profileRes.ok) {
      const profile = await profileRes.json();
      const html = profileOgFromApi(profile, { site: SITE, wishId });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.status(200).send(html);
      return;
    }

    res.status(404).send('Creator not found');
  } catch (err) {
    console.error('[share]', err);
    res.status(500).send('Share preview unavailable');
  }
}
