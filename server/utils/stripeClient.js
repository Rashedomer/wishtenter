/** Strip quotes and whitespace from .env values */
function cleanEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^["']+|["']+$/g, '');
}

/** Validate and return Stripe secret key from environment */
function getStripeSecretKey() {
  const key = cleanEnv(process.env.STRIPE_SECRET_KEY);
  if (!key || key.length < 80) return null;
  if (
    key.includes('STRIPE_') ||
    key.includes('>') ||
    key.includes('\n') ||
    key.includes('pk_live') ||
    key.includes('pk_test') ||
    key.includes('your_key') ||
    !/^sk_(live|test)_/.test(key)
  ) {
    return null;
  }
  return key;
}

function createStripeClient() {
  const key = getStripeSecretKey();
  if (!key) return null;
  return require('stripe')(key);
}

function assertStripeConfigured() {
  if (!getStripeSecretKey()) {
    const err = new Error(
      'Payments are not configured. The server Stripe API key is missing or invalid.'
    );
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
}

/**
 * In-memory cache: profileId → { complete: bool, expiresAt: timestamp }
 * Positive results cached 5 min. Negative results cached 60 s (pick up fast after onboarding).
 */
const _onboardingCache = new Map();
const ONBOARDING_CACHE_POSITIVE_TTL = 5 * 60 * 1000;  // 5 minutes
const ONBOARDING_CACHE_NEGATIVE_TTL = 60 * 1000;       // 60 seconds

/**
 * Sync Stripe onboarding status for a profile.
 * If the profile has a stripeAccountId and details_submitted is true in Stripe,
 * update the database and return true. Returns current DB value otherwise.
 * Safe to call: silently ignores Stripe errors and missing keys.
 * Results are cached to avoid repeated Stripe API calls on every profile fetch.
 */
async function syncStripeOnboardingStatus(prisma, profile) {
  if (!profile || profile.stripeOnboardingComplete) {
    return profile?.stripeOnboardingComplete ?? false;
  }
  if (!profile.stripeAccountId) return false;

  // Serve from cache if still fresh
  const cached = _onboardingCache.get(profile.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.complete;
  }

  const stripeClient = createStripeClient();
  if (!stripeClient) return false;

  try {
    const account = await stripeClient.accounts.retrieve(profile.stripeAccountId);
    if (account.details_submitted) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { stripeOnboardingComplete: true },
      });
      // Cache positive result for 5 minutes
      _onboardingCache.set(profile.id, {
        complete: true,
        expiresAt: Date.now() + ONBOARDING_CACHE_POSITIVE_TTL
      });
      return true;
    }
    // Cache negative result for 60 seconds
    _onboardingCache.set(profile.id, {
      complete: false,
      expiresAt: Date.now() + ONBOARDING_CACHE_NEGATIVE_TTL
    });
  } catch (err) {
    // Silently ignore – Stripe may be unavailable or the account deleted
    console.error('[Stripe] syncStripeOnboardingStatus error:', err.message);
  }
  return false;
}

module.exports = { getStripeSecretKey, createStripeClient, assertStripeConfigured, syncStripeOnboardingStatus };
