/**
 * Load server/.env from this file's location — works regardless of PM2 cwd.
 * Must be required before any code that reads process.env.
 */
const path = require('path');
const fs = require('fs');

const SERVER_ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(SERVER_ROOT, '.env');

if (fs.existsSync(ENV_PATH)) {
  require('dotenv').config({ path: ENV_PATH });
} else {
  require('dotenv').config();
}

process.env.SERVER_ROOT = SERVER_ROOT;

function isDeployedServer() {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.NODE_ENV === 'production'
  );
}

function normalizeFrontendUrl() {
  const raw = process.env.FRONTEND_URL || process.env.PUBLIC_SITE_URL || '';
  const trimmed = String(raw).replace(/\/$/, '');
  const deployed = isDeployedServer();

  if (deployed && (!trimmed || /localhost|127\.0\.0\.1/i.test(trimmed))) {
    process.env.FRONTEND_URL = 'https://www.wishtenter.com';
    process.env.PUBLIC_SITE_URL = 'https://www.wishtenter.com';
    return;
  }

  if (!process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL = deployed
      ? 'https://www.wishtenter.com'
      : 'http://localhost:5173';
  }
}

normalizeFrontendUrl();

module.exports = { SERVER_ROOT, ENV_PATH, normalizeFrontendUrl, isDeployedServer };
