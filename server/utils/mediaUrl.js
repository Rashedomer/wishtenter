/** Extract filename from /uploads/... or /api/media/... or absolute URLs */
function extractUploadFilename(url) {
  if (!url) return null;
  const match = String(url).match(/\/(?:uploads|api\/media)\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Canonical stored path — always /api/media/filename (unless Cloudinary) */
function toMediaApiPath(url) {
  if (!url) return url;
  if (String(url).startsWith('https://res.cloudinary.com/')) return url;
  const filename = extractUploadFilename(url);
  if (!filename) return url;
  return `/api/media/${filename}`;
}

function getBackendBase() {
  return (process.env.BACKEND_URL || '').replace(/\/$/, '');
}

function normalizeUploadUrl(url) {
  if (!url) return url;
  const relative = toMediaApiPath(url);
  return relative;
}

/**
 * Only images uploaded through /api/upload (and therefore moderated) may be
 * stored. External URLs would bypass the safety check entirely.
 */
function assertModeratedImageUrl(url, label = 'image') {
  if (url === undefined || url === null || url === '') return { safe: true };

  // Accept Cloudinary URLs (since they are generated post-moderation by our backend)
  if (String(url).startsWith('https://res.cloudinary.com/')) {
    return { safe: true };
  }

  const filename = extractUploadFilename(url);
  if (filename && /^[\w.-]+\.(jpe?g|jfif|png|gif|webp|heic|heif)$/i.test(filename)) {
    return { safe: true };
  }

  return {
    safe: false,
    message: `The ${label} must be uploaded through Wishtenter so it can be safety-checked. External image links are not allowed.`,
  };
}

function normalizeProfile(profile) {
  if (!profile) return profile;
  return {
    ...profile,
    avatarUrl: normalizeUploadUrl(profile.avatarUrl),
    coverUrl: normalizeUploadUrl(profile.coverUrl),
  };
}

function normalizeGoal(goal) {
  if (!goal) return goal;
  return {
    ...goal,
    imageUrl: normalizeUploadUrl(goal.imageUrl),
    profile: goal.profile ? normalizeProfile(goal.profile) : goal.profile,
  };
}

module.exports = {
  extractUploadFilename,
  toMediaApiPath,
  normalizeUploadUrl,
  normalizeProfile,
  normalizeGoal,
  assertModeratedImageUrl,
};
