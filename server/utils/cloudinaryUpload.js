const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');

let configured = false;

function configureCloudinary() {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return; // not configured — will fall back to local
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

function isCloudinaryConfigured() {
  configureCloudinary();
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload a local file to Cloudinary and return the secure URL.
 * Deletes the local temp file afterwards.
 */
async function uploadToCloudinary(filePath) {
  configureCloudinary();
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'wishtenter',
    resource_type: 'image',
    overwrite: false,
    // Convert HEIC/HEIF to JPEG on the fly
    format: 'jpg',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  // Clean up temp file from disk
  try { fs.unlinkSync(filePath); } catch {}
  return result.secure_url; // e.g. https://res.cloudinary.com/...
}

module.exports = { isCloudinaryConfigured, uploadToCloudinary };
