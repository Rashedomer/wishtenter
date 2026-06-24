const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { moderateImageFile } = require('../utils/contentModeration');

const tmpDir = path.join(os.tmpdir(), 'wishtenter-moderation');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      cb(null, tmpDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `check-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^image\//i.test(file.mimetype);
    const allowedExt = /\.(jpe?g|jfif|png|gif|webp|heic|heif)$/i.test(file.originalname);
    if (allowedMime || allowedExt) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.post('/check-image', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Invalid image' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const filePath = req.file.path;
    try {
      const result = await moderateImageFile(filePath);
      if (!result.safe) {
        return res.status(400).json({ message: result.message });
      }
      res.json({ safe: true });
    } catch (scanErr) {
      console.error('[Moderation] check-image error:', scanErr);
      res.status(500).json({ message: 'Could not verify image safety' });
    } finally {
      fs.unlink(filePath, () => {});
    }
  });
});

module.exports = router;
