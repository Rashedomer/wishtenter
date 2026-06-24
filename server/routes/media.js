const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { UPLOADS_DIR } = require('../config/paths');

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

router.get('/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^[\w.-]+\.(jpe?g|jfif|png|gif|webp|heic|heif)$/i.test(filename)) {
    return res.status(400).json({ message: 'Invalid image filename' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Image not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  res.set('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.set('Access-Control-Allow-Origin', '*');
  res.sendFile(filePath);
});

module.exports = router;
