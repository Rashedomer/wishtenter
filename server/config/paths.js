const path = require('path');
const fs = require('fs');
const { SERVER_ROOT } = require('./loadEnv');

/**
 * Determine UPLOADS_DIR with this priority:
 *  1. UPLOADS_DIR env var (explicit override — set this in Railway!)
 *  2. On Railway: first existing path in the candidate list, or the first candidate (auto-create)
 *  3. Local dev: <SERVER_ROOT>/uploads
 */

let UPLOADS_DIR;

if (process.env.UPLOADS_DIR) {
  // Explicit env var — always wins
  UPLOADS_DIR = process.env.UPLOADS_DIR;
  console.log(`📁 UPLOADS_DIR from env: ${UPLOADS_DIR}`);
} else if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    UPLOADS_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    console.log(`📁 UPLOADS_DIR (Railway Volume): ${UPLOADS_DIR}`);
  } else {
    // Fallback: try known volume mount points in order
    const candidates = [
      '/app/server/uploads',
      '/app/uploads',
      '/uploads',
    ];

    // Pick the first path that already exists (mounted volume), else default to first
    UPLOADS_DIR = candidates.find((p) => {
      try { return fs.existsSync(p); } catch { return false; }
    }) || candidates[0];

    console.log(`📁 UPLOADS_DIR (Railway auto-detect): ${UPLOADS_DIR}`);
  }
} else {
  // Local development
  UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');
  console.log(`📁 UPLOADS_DIR (local): ${UPLOADS_DIR}`);
}

// Always ensure the directory exists
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`📁 Created uploads directory: ${UPLOADS_DIR}`);
  }
} catch (err) {
  console.error(`❌ Could not create UPLOADS_DIR (${UPLOADS_DIR}):`, err.message);
}

module.exports = { SERVER_ROOT, UPLOADS_DIR };
