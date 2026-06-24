const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const { UPLOADS_DIR } = require('../config/paths');
const { moderateImageFile } = require('../utils/contentModeration');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../utils/cloudinaryUpload');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Always save to local disk first (for moderation), then push to Cloudinary
const uploadDir = UPLOADS_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^image\//i.test(file.mimetype);
    const allowedExt = /\.(jpe?g|jfif|png|gif|webp|heic|heif)$/i.test(file.originalname);
    if (allowedMime || allowedExt) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, HEIC) are allowed'));
    }
  },
});

router.post('/', auth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Image is too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      console.error('Upload Error:', err);
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = path.join(uploadDir, req.file.filename);

    try {
      // 1. Moderate the image while it is still on disk
      const moderation = await moderateImageFile(filePath);
      if (!moderation.safe) {
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: moderation.message });
      }

      // 2. Try Cloudinary first (permanent cloud storage)
      if (isCloudinaryConfigured()) {
        try {
          const cloudUrl = await uploadToCloudinary(filePath);
          console.log('[Upload] Saved to Cloudinary:', cloudUrl);
          return res.json({ imageUrl: cloudUrl });
        } catch (cloudErr) {
          console.error('[Upload] Cloudinary failed, falling back to local disk:', cloudErr.message);
          // Fall through to local disk below
        }
      }

      // 3. Fallback: serve from local disk (works fine in dev)
      if (!fs.existsSync(filePath)) {
        console.error('[Upload] File missing after moderation:', filePath);
        return res.status(500).json({ message: 'Image failed to save. Please try again.' });
      }
      const imageUrl = `/api/media/${req.file.filename}`;
      console.log('[Upload] Saved locally:', imageUrl);
      res.json({ imageUrl });

    } catch (scanErr) {
      console.error('Moderation Error:', scanErr);
      fs.unlink(filePath, () => {});
      res.status(500).json({ message: 'Image upload failed safety check' });
    }
  });
});

module.exports = router;
