const express = require('express');
const router = express.Router();

const { getFrontendBase } = require('../utils/siteUrl');

const CANONICAL_SHARE_BASE = 'https://www.wishtenter.com';

function resolveBackendBase(req) {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

router.get('/', (req, res) => {
  const base = resolveBackendBase(req);
  res.json({
    uploadsOrigin: base,
    apiUrl: `${base}/api`,
    shareBase: CANONICAL_SHARE_BASE,
    frontendUrl: getFrontendBase(),
  });
});

module.exports = router;
