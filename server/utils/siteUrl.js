const { isDeployedServer } = require('../config/loadEnv');

/** Canonical public site URL — used for Stripe redirects, OG tags, emails */
function getFrontendBase() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_SITE_URL ||
    '';
  const trimmed = String(raw).replace(/\/$/, '');

  if (isDeployedServer() || /localhost|127\.0\.0\.1/i.test(trimmed) || trimmed.includes('railway.app')) {
    if (!trimmed || /localhost|127\.0\.0\.1/i.test(trimmed) || trimmed.includes('railway.app')) {
      return 'https://www.wishtenter.com';
    }
    return trimmed;
  }

  return trimmed || 'http://localhost:5173';
}

function getCanonicalOrigin() {
  return getFrontendBase();
}

module.exports = { getFrontendBase, getCanonicalOrigin };
