#!/usr/bin/env node
/**
 * Safe startup wrapper — migrations must succeed; URL fix is best-effort.
 */
require('../config/loadEnv');
const { execSync } = require('child_process');
const path = require('path');

const serverRoot = path.join(__dirname, '..');

function run(cmd, label) {
  console.log(`\n▶ ${label}...`);
  execSync(cmd, { stdio: 'inherit', cwd: serverRoot, env: process.env });
}

try {
  run('npx prisma migrate deploy', 'Applying database migrations');
} catch (err) {
  console.error('\n❌ Migration failed. Existing data is preserved — fix DATABASE_URL or migration errors, then redeploy.');
  console.error('   Never run prisma migrate reset on production.\n');
  process.exit(1);
}

try {
  run('node scripts/fix-upload-urls.js', 'Normalizing upload URLs in database');
} catch (err) {
  console.warn('\n⚠️  Upload URL fix skipped (non-fatal):', err.message || err);
}

// fix-upload-urls reloads .env and may restore localhost FRONTEND_URL from server/.env
const { normalizeFrontendUrl } = require('../config/loadEnv');
normalizeFrontendUrl();

const fs = require('fs');
const distPath = path.join(serverRoot, 'dist', 'index.html');
if (fs.existsSync(distPath)) {
  console.log('✅ Frontend bundle present at server/dist/');
} else {
  console.warn('⚠️  server/dist/index.html missing — profile URLs on Railway will 404 until frontend build succeeds');
}

require('../server.js');
