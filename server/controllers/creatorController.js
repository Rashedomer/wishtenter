const prisma = require('../prisma/client');
const { refreshBalances } = require('../utils/wallet');
const { assertTextSafe } = require('../utils/contentModeration');
const { normalizeProfile, normalizeGoal, normalizeUploadUrl, assertModeratedImageUrl } = require('../utils/mediaUrl');
const { syncStripeOnboardingStatus } = require('../utils/stripeClient');
const { createStripeClient, assertStripeConfigured } = require('../utils/stripeClient');

const { getFrontendBase } = require('../utils/siteUrl');

/**
 * Create (if missing) a Stripe Connect Express account for the creator
 * and return an onboarding/account-link URL so they can complete onboarding.
 */
const createStripeOnboarding = async (req, res) => {
  try {
    assertStripeConfigured();
    const userId = req.user.userId;
    const profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const stripeClient = createStripeClient();
    if (!stripeClient) return res.status(503).json({ message: 'Stripe not configured' });

    let accountId = profile.stripeAccountId;
    if (!accountId) {
      const account = await stripeClient.accounts.create({
        type: 'express',
        country: process.env.STRIPE_DEFAULT_COUNTRY || 'US',
        email: profile.user?.email || undefined
      });
      accountId = account.id;
      await prisma.profile.update({ where: { id: profile.id }, data: { stripeAccountId: accountId } });
    }

    // Create an account link for onboarding
    const refreshUrl = `${getFrontendBase()}/me/onboard?refresh=1`;
    const returnUrl = `${getFrontendBase()}/me/onboard?status=complete`;
    const link = await stripeClient.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    res.json({ url: link.url, accountId });
  } catch (err) {
    console.error('[Stripe] createStripeOnboarding error:', err && err.message);
    res.status(500).json({ message: 'Failed to create Stripe onboarding link' });
  }
};

const getCreatorProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const profile = await prisma.profile.findUnique({
      where: { username },
      include: {
        goals: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 20, // Limit to 20 most recent goals
          select: {
            id: true,
            title: true,
            description: true,
            targetAmount: true,
            imageUrl: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Sync Stripe onboarding status live so Gift buttons and banners reflect reality
    const stripeOnboardingComplete = await syncStripeOnboardingStatus(prisma, profile);

    res.json({
      ...normalizeProfile(profile),
      // Explicitly include Stripe onboarding status so the frontend can
      // enable/disable the Gift button and show the onboarding warning.
      stripeOnboardingComplete,
      stripeAccountId: profile.stripeAccountId || null,
      goals: profile.goals.map(normalizeGoal),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching creator profile' });
  }
};

const getAllCreators = async (req, res) => {
  try {
    const hasPagination = ('page' in req.query) || ('limit' in req.query) || ('search' in req.query);
    const search = req.query.search || '';
    const searchFilter = search ? {
      OR: [
        { displayName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    if (!hasPagination) {
      // Backwards-compatible: return full array when no pagination params provided
      const creators = await prisma.profile.findMany({
        where: { user: { role: 'CREATOR' }, ...searchFilter },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          balance: true,
          createdAt: true,
          _count: { select: { goals: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(creators.map(normalizeProfile));
    }

    // Pagination defaults
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12); // Max 50, default 12
    const skip = (page - 1) * limit;

    // Get paginated creators
    const creators = await prisma.profile.findMany({
      where: {
        user: { role: 'CREATOR' },
        ...searchFilter
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        balance: true,
        createdAt: true,
        _count: { select: { goals: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    });

    // Get total count for pagination
    const total = await prisma.profile.count({
      where: {
        user: { role: 'CREATOR' },
        ...searchFilter
      }
    });

    res.json({
      data: creators.map(normalizeProfile),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching creators' });
  }
};

const getMyProfile = async (req, res) => {
  const userId = req.user.userId;
  await refreshBalances(userId);
  
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });
    // Sync Stripe onboarding status so dashboard reflects the real state
    const stripeOnboardingComplete = await syncStripeOnboardingStatus(prisma, profile);
    res.json({ ...normalizeProfile(profile), stripeOnboardingComplete });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  const { displayName, bio, avatarUrl, coverUrl } = req.body;
  console.log('UPDATE PROFILE REQ BODY:', req.body);

  const textCheck = assertTextSafe([
    { value: displayName, label: 'display name' },
    { value: bio, label: 'bio' },
  ]);
  if (!textCheck.safe) {
    return res.status(400).json({ message: textCheck.message });
  }

  for (const [value, label] of [[avatarUrl, 'profile photo'], [coverUrl, 'cover photo']]) {
    const imageCheck = assertModeratedImageUrl(value, label);
    if (!imageCheck.safe) {
      return res.status(400).json({ message: imageCheck.message });
    }
  }

  try {
    const profile = await prisma.profile.update({
      where: { userId: req.user.userId },
      data: {
        displayName,
        bio,
        avatarUrl: normalizeUploadUrl(avatarUrl),
        coverUrl: normalizeUploadUrl(coverUrl),
      },
    });
    res.json(normalizeProfile(profile));
  } catch (err) {
    console.error('ERROR UPDATING PROFILE:', err);
    res.status(500).json({ 
      message: 'Error updating profile', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};

const getPayoutSettings = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
      include: { payoutDetails: true }
    });
    res.json(profile.payoutDetails || {});
  } catch (err) {
    res.status(500).json({ message: 'Error fetching payout settings' });
  }
};

const updatePayoutSettings = async (req, res) => {
  const { payoutMethod, accountHolderName, accountNumber, routingCode, bankName, cryptoCurrency, cryptoAddress } = req.body;
  
  if (payoutMethod === 'crypto') {
    if (!cryptoCurrency || cryptoCurrency.trim().length === 0) {
      return res.status(400).json({ message: 'Please enter a valid Crypto Currency (e.g., USDT, BTC, ETH)' });
    }
    if (!cryptoAddress || cryptoAddress.trim().length < 8) {
      return res.status(400).json({ message: 'Please enter a valid Crypto Wallet Address (min 8 characters)' });
    }

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user.userId }
      });

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      const payoutDetails = await prisma.payoutDetails.upsert({
        where: { profileId: profile.id },
        update: { 
          payoutMethod: 'crypto',
          cryptoCurrency,
          cryptoAddress,
          accountHolderName: null,
          accountNumber: null,
          routingCode: null,
          bankName: null
        },
        create: { 
          profileId: profile.id, 
          payoutMethod: 'crypto',
          cryptoCurrency,
          cryptoAddress
        }
      });
      return res.json(payoutDetails);
    } catch (err) {
      console.error("Payout settings update error:", err);
      return res.status(500).json({ message: 'Error updating payout settings' });
    }
  }

  // Otherwise, default/bank validation:
  if (!accountHolderName || accountHolderName.trim().length < 3) {
    return res.status(400).json({ message: 'Please enter a valid Account Holder Name (min 3 characters)' });
  }

  if (!bankName || bankName.trim().length < 2) {
    return res.status(400).json({ message: 'Please enter a valid Bank Name' });
  }

  const cleanAccount = accountNumber ? accountNumber.replace(/\s|-/g, '') : '';
  const isIban = /^PK\d{2}[A-Za-z]{4}\d{16}$/i.test(cleanAccount);
  const isGenericIban = /^[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}$/i.test(cleanAccount);
  const isStandardAcc = /^\d{9,24}$/.test(cleanAccount);

  if (!cleanAccount || (!isIban && !isGenericIban && !isStandardAcc)) {
    return res.status(400).json({ message: 'Please enter a valid Account Number or IBAN' });
  }

  if (!routingCode || routingCode.trim().length < 2) {
    return res.status(400).json({ message: 'Please enter a valid IFSC / Routing / Branch Code' });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const payoutDetails = await prisma.payoutDetails.upsert({
      where: { profileId: profile.id },
      update: { 
        payoutMethod: 'bank',
        accountHolderName, 
        accountNumber, 
        routingCode, 
        bankName,
        cryptoCurrency: null,
        cryptoAddress: null
      },
      create: { 
        profileId: profile.id, 
        payoutMethod: 'bank',
        accountHolderName, 
        accountNumber, 
        routingCode, 
        bankName 
      }
    });
    res.json(payoutDetails);
  } catch (err) {
    console.error("Payout settings update error:", err);
    res.status(500).json({ message: 'Error updating payout settings' });
  }
};

module.exports = { 
  getCreatorProfile, 
  getAllCreators, 
  getMyProfile, 
  updateProfile,
  getPayoutSettings,
  updatePayoutSettings
  ,createStripeOnboarding
};
