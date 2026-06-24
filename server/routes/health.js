const express = require('express');
const path = require('path');
const { getFrontendBase } = require('../utils/siteUrl');
const fs = require('fs');
const router = express.Router();
const { UPLOADS_DIR } = require('../config/paths');
const { getStripeSecretKey } = require('../utils/stripeClient');

function resolveBackendBase(req) {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

function resolveFrontendDist() {
  const serverRoot = path.join(__dirname, '..');
  const candidates = [
    path.join(serverRoot, 'dist'),
    path.join(serverRoot, '..', 'dist'),
  ];
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) || null;
}

router.get('/', async (req, res) => {
  let uploadsWritable = false;
  let uploadFileCount = 0;
  let firstFile = null;
  let allFiles = [];
  try {
    fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
    uploadsWritable = true;
    if (fs.existsSync(UPLOADS_DIR)) {
      const filesList = fs.readdirSync(UPLOADS_DIR);
      uploadFileCount = filesList.length;
      firstFile = filesList[0] || null;
      allFiles = filesList;
    }
  } catch {
    uploadsWritable = false;
  }

  const { SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET } = process.env;
  let sightengineStatus = 'not configured';
  let sightengineError = null;

  if (SIGHTENGINE_API_USER && SIGHTENGINE_API_SECRET) {
    try {
      const form = new FormData();
      const buf = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAKAAoBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
      form.append('media', new Blob([buf]), 'test.jpg');
      form.append('models', 'nudity-2.0');
      form.append('api_user', SIGHTENGINE_API_USER);
      form.append('api_secret', SIGHTENGINE_API_SECRET);

      const r = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form });
      const data = await r.json();
      sightengineStatus = data.status;
      sightengineError = data;
    } catch (e) {
      sightengineStatus = 'exception';
      sightengineError = e.message;
    }
  }

  res.status(200).json({
    ok: true,
    uploadsDir: UPLOADS_DIR,
    uploadsWritable,
    uploadFileCount,
    firstFile,
    allFiles,
    uploadsOrigin: resolveBackendBase(req),
    stripeConfigured: !!getStripeSecretKey(),
    emailConfigured: !!process.env.RESEND_API_KEY,
    frontendUrl: getFrontendBase(),
    frontendUrlRaw: process.env.FRONTEND_URL || null,
    backendUrl: process.env.BACKEND_URL || resolveBackendBase(req),
    serveFrontend: !!resolveFrontendDist(),
    frontendDist: resolveFrontendDist(),
    sightengineStatus,
    sightengineError
  });
});

module.exports = router;
