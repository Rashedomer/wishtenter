const fs = require('fs');
const path = require('path');
// Removed legacy form-data require to use native FormData for Node 22 fetch

// Explicit / vulgar terms only — moderate content is allowed
const BLOCKED_TERMS = [
  'porn', 'porno', 'xxx', 'nude', 'nudes', 'naked', 'onlyfans',
  'blowjob', 'handjob', 'cumshot', 'dildo', 'vibrator',
  'hentai', 'nsfw', 'stripper', 'escort', 'prostitut',
  'fuck', 'fucking', 'motherfuck', 'shit', 'bitch', 'cunt',
  'dick', 'cock', 'pussy', 'whore', 'slut', 'bastard',
];

function moderateText(text, label = 'content') {
  if (!text || typeof text !== 'string') return { safe: true };

  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const term of BLOCKED_TERMS) {
    const pattern = new RegExp(`\\b${term}\\b|${term}`, 'i');
    if (pattern.test(normalized)) {
      return {
        safe: false,
        message: `This ${label} contains language or terms that are not allowed on Wishtenter. Please keep the platform clean and respectful.`,
      };
    }
  }
  return { safe: true };
}

function assertTextSafe(fields) {
  for (const { value, label } of fields) {
    const result = moderateText(value, label);
    if (!result.safe) return result;
  }
  return { safe: true };
}

async function moderateImageFile(filePath) {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    // Keys not configured — skip moderation and allow the upload.
    // This prevents all image uploads from being blocked in production
    // when SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET are not set.
    console.warn('[Moderation] Sightengine keys missing — skipping image moderation (upload allowed).');
    return { safe: true };
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('media', new Blob([buffer]), path.basename(filePath));
    form.append('models', 'nudity-2.0,offensive');
    form.append('api_user', apiUser);
    form.append('api_secret', apiSecret);

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: form,
    });

    const data = await response.json();
    // Sightengine can return HTTP 200 with status "failure" (bad credentials,
    // exhausted quota, unsupported media). Fail closed in every such case —
    // never approve an image that was not actually analyzed.
    if (!response.ok || data.status !== 'success' || !data.nudity) {
      console.error('[Moderation] Sightengine error:', data);
      return {
        safe: false,
        message: 'Could not verify image safety. Please try a different photo.',
      };
    }

    const nudity = data.nudity;
    const offensive = data.offensive || {};
    const suggestiveClasses = nudity.suggestive_classes || {};

    // Actual nudity-2.0 fields: sexual_activity, sexual_display, erotica,
    // sextoy, suggestive, suggestive_classes, none.
    const scores = {
      sexual_activity: nudity.sexual_activity || 0,
      sexual_display: nudity.sexual_display || 0,
      erotica: nudity.erotica || 0,
      sextoy: nudity.sextoy || 0,
      suggestive: nudity.suggestive || 0,
      lingerie: suggestiveClasses.lingerie || 0,
      offensive: offensive.prob || 0,
    };

    // Adult / explicit / intimate content is blocked outright. Thresholds are
    // calibrated strictly: e.g. a couple-in-bed photo scores suggestive ~0.36
    // while normal portraits score below ~0.1, so suggestive is capped at 0.3.
    const isExplicit =
      scores.sexual_activity >= 0.15 ||
      scores.sexual_display >= 0.15 ||
      scores.erotica >= 0.2 ||
      scores.sextoy >= 0.2 ||
      scores.suggestive >= 0.3 ||
      scores.lingerie >= 0.5 ||
      scores.offensive >= 0.4;

    if (isExplicit) {
      console.log('[Moderation] Image rejected:', scores);
    }

    if (isExplicit) {
      return {
        safe: false,
        message:
          'This image was rejected because it appears inappropriate for Wishtenter. Please upload a clean profile or wish photo.',
      };
    }

    return { safe: true };
  } catch (err) {
    console.error('[Moderation] Image scan failed:', err.message);
    return {
      safe: false,
      message: 'Could not verify image safety. Please try again.',
    };
  }
}

module.exports = {
  moderateText,
  assertTextSafe,
  moderateImageFile,
};
