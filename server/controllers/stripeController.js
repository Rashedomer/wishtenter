const prisma = require('../prisma/client');
const { createStripeClient, assertStripeConfigured } = require('../utils/stripeClient');
const { getCommissionSettings, calculateCommission } = require('../utils/commission');
const { sendGiftNotificationEmail, sendPaymentConfirmationEmail } = require('../utils/email');
const { createNotification } = require('../utils/notifications');
const { getFrontendBase } = require('../utils/siteUrl');

/** Stripe requires valid URLs; always use production domain in live (ignores bad env vars) */
function creatorProfileUrl(username, query = '') {
  const base = getFrontendBase();
  const path = `/${encodeURIComponent(username)}`;
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

function stripe() {
  assertStripeConfigured();
  const client = createStripeClient();
  if (!client) {
    const err = new Error('Payments are not configured. Invalid Stripe API key on server.');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  return client;
}

function addWorkingDays(startDate, days) {
  let date = new Date(startDate.getTime());
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
  }
  return date;
}

function normalizeGiftMessage(message) {
  if (!message || typeof message !== 'string') return null;
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const ORPHAN_GOAL_TITLE = 'Past wish (removed)';

/** Resolve goal for payment — uses a hidden fallback if the original wish was deleted */
async function resolveGoalForGift(rawGoalId, creatorUserId) {
  const goal = await prisma.goal.findUnique({
    where: { id: rawGoalId },
    include: { profile: { select: { userId: true, id: true } } },
  });

  if (goal?.profile) {
    if (goal.profile.userId !== creatorUserId && goal.profile.id !== creatorUserId) {
      console.warn(
        `[Stripe] creatorId metadata mismatch — metadata: ${creatorUserId}, goal owner: ${goal.profile.userId}`
      );
    }
    return {
      goalId: goal.id,
      goalTitle: goal.title,
      creatorUserId: goal.profile.userId,
    };
  }

  let profile = await prisma.profile.findUnique({ where: { userId: creatorUserId } });
  if (!profile) {
    profile = await prisma.profile.findUnique({ where: { id: creatorUserId } });
  }
  if (!profile) {
    return { skipped: true, reason: 'creator_profile_missing', creatorUserId };
  }

  let fallback = await prisma.goal.findFirst({
    where: {
      creatorId: profile.id,
      status: 'hidden',
      title: ORPHAN_GOAL_TITLE,
    },
  });

  if (!fallback) {
    fallback = await prisma.goal.create({
      data: {
        creatorId: profile.id,
        title: ORPHAN_GOAL_TITLE,
        description: 'Tips received for wishes that were removed',
        targetAmount: 999999,
        status: 'hidden',
      },
    });
    console.warn(`[Stripe] Created fallback goal for orphaned tips — creator ${profile.userId}`);
  }

  console.warn(
    `[Stripe] Goal ${rawGoalId} no longer exists — recording tip under fallback goal ${fallback.id}`
  );

  return {
    goalId: fallback.id,
    goalTitle: fallback.title,
    orphaned: true,
    creatorUserId: profile.userId,
  };
}

async function notifyGiftParties({
  creatorId,
  supporterId,
  goalId,
  paymentAmount,
  net,
  message,
  giftId,
}) {
  try {
    const [creator, goal, supporter] = await Promise.all([
      prisma.user.findUnique({ where: { id: creatorId }, include: { profile: true } }),
      prisma.goal.findUnique({ where: { id: goalId } }),
      supporterId && supporterId !== 'guest'
        ? prisma.user.findUnique({ where: { id: supporterId }, include: { profile: true } })
        : null,
    ]);

    const goalTitle = goal?.title || 'Your wish';
    const creatorName = creator?.profile?.displayName || 'Creator';

    await createNotification(creatorId, {
      type: 'gift_received',
      title: 'You received a gift!',
      body: message
        ? `Someone gifted $${Number(paymentAmount).toFixed(2)} for "${goalTitle}" with a message.`
        : `Someone gifted $${Number(paymentAmount).toFixed(2)} for "${goalTitle}".`,
      link: '/received-tips',
      meta: { giftId, goalId, amount: paymentAmount, message },
    });

    if (creator?.email) {
      const emailResult = await sendGiftNotificationEmail(creator.email, {
        displayName: creatorName,
        goalTitle,
        amount: paymentAmount,
        netAmount: net,
        message: message || null,
        isPending: true,
      });
      if (emailResult?.success) {
        console.log(`[Stripe] Gift email sent to creator ${creator.email} for gift ${giftId}`);
      } else {
        console.error(`[Stripe] Creator email failed for ${creator.email}:`, emailResult?.error?.message || 'unknown');
      }
    } else {
      console.warn(`[Stripe] Creator ${creatorId} has no email — gift notification email skipped`);
    }

    if (supporter?.email) {
      const payerEmailResult = await sendPaymentConfirmationEmail(supporter.email, {
        displayName: supporter.profile?.displayName || 'Supporter',
        creatorName,
        goalTitle,
        amount: paymentAmount,
        message: message || null,
      });
      if (!payerEmailResult?.success) {
        console.error('[Stripe] Payer email failed:', payerEmailResult?.error?.message || 'unknown');
      }

      await createNotification(supporterId, {
        type: 'payment_confirmed',
        title: 'Payment successful!',
        body: `Your $${Number(paymentAmount).toFixed(2)} gift to ${creatorName} for "${goalTitle}" was sent.`,
        link: supporter.profile?.username ? `/${supporter.profile.username}` : '/explore',
        meta: { giftId, goalId, amount: paymentAmount },
      });
    }
  } catch (emailErr) {
    console.error('[Stripe] Gift notifications failed:', emailErr.message);
  }
}

/**
 * Idempotent gift fulfillment from a Stripe Checkout Session.
 * Used by webhook and by success-page confirmation (fallback when webhook is delayed/missing).
 */
async function fulfillGiftPayment(session, { sendEmail = true, source = 'webhook' } = {}) {
  if (!session?.metadata || session.metadata.type !== 'gift_payment') {
    return { skipped: true, reason: 'not_gift_payment' };
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    return { skipped: true, reason: 'not_paid' };
  }

  const existing = await prisma.gift.findFirst({
    where: { stripeSessionId: session.id },
  });
  if (existing) {
    return { alreadyProcessed: true, gift: existing };
  }

  const { goalId, creatorId, amount, supporterId, message } = session.metadata;
  const paymentAmount = parseFloat(amount);
  const settings = await getCommissionSettings();
  const { commission, net } = calculateCommission(paymentAmount, settings.commissionRate);
  const giftMessage = normalizeGiftMessage(message);
  const resolvedSupporterId = supporterId === 'guest' || !supporterId ? null : supporterId;

  const resolved = await resolveGoalForGift(goalId, creatorId);
  if (resolved.skipped) {
    if (resolved.reason !== 'creator_profile_missing' || source !== 'startup-recovery') {
      console.warn(
        `[Stripe:${source}] Skipped session ${session.id} — ${resolved.reason} (${resolved.creatorUserId})`
      );
    }
    return { skipped: true, reason: resolved.reason };
  }

  const { goalId: resolvedGoalId, creatorUserId: effectiveCreatorId } = resolved;

  // Platform collects via Stripe; creator sees pending balance immediately (manual payout after 10 working days)
  const results = await prisma.$transaction([
    prisma.gift.create({
      data: {
        supporterId: resolvedSupporterId,
        creatorId: effectiveCreatorId,
        goalId: resolvedGoalId,
        amount: paymentAmount,
        netAmount: net,
        commissionAmount: commission,
        message: giftMessage,
        status: 'completed',
        stripeSessionId: session.id,
        isReleased: false,
        availableAt: addWorkingDays(new Date(), 10),
      },
    }),
    prisma.goal.update({
      where: { id: resolvedGoalId },
      data: { currentAmount: { increment: paymentAmount } },
    }),
    prisma.profile.update({
      where: { userId: effectiveCreatorId },
      data: { pendingBalance: { increment: net } },
    }),
  ]);

  const gift = results[0];

  console.log(
    `[Stripe:${source}] Payment processed — Goal: ${resolvedGoalId}, Gross: $${paymentAmount}, ` +
    `Net: $${net.toFixed(2)}, Pending: $${net.toFixed(2)}, Message: ${giftMessage ? 'yes' : 'no'}`
  );

  if (sendEmail) {
    await notifyGiftParties({
      creatorId: effectiveCreatorId,
      supporterId: resolvedSupporterId,
      goalId: resolvedGoalId,
      paymentAmount,
      net,
      message: giftMessage,
      giftId: gift.id,
    });
  }

  return { alreadyProcessed: false, gift };
}

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      try {
        await fulfillGiftPayment(session, { sendEmail: true, source: 'webhook' });
      } catch (fulfillErr) {
        console.error('[Webhook] Gift fulfillment failed:', fulfillErr.message);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      const refundedCents = charge.amount_refunded;
      console.log(`[Webhook] Refund — charge: ${charge.id}, refunded: $${(refundedCents / 100).toFixed(2)}`);

      try {
        // Find gift by stripeSessionId via payment_intent (best-effort)
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
        if (paymentIntentId) {
          const gift = await prisma.gift.findFirst({
            where: { stripeSessionId: { not: null }, status: 'completed' },
            orderBy: { createdAt: 'desc' }
          });
          if (gift) {
            const refundAmount = refundedCents / 100;
            await prisma.$transaction([
              prisma.gift.update({
                where: { id: gift.id },
                data: { status: 'refunded' }
              }),
              // Reverse pending/balance for creator
              prisma.profile.update({
                where: { userId: gift.creatorId },
                data: {
                  pendingBalance: { decrement: gift.isReleased ? 0 : gift.netAmount },
                  balance: { decrement: gift.isReleased ? gift.netAmount : 0 }
                }
              }),
              // Roll back goal progress
              prisma.goal.update({
                where: { id: gift.goalId },
                data: { currentAmount: { decrement: refundAmount } }
              })
            ]);
            console.log(`[Webhook] Refund applied to gift ${gift.id}`);
          }
        }
      } catch (refundErr) {
        console.error('[Webhook] Error processing refund:', refundErr.message);
      }
      break;
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object;
      console.warn(
        `[Webhook] ⚠️  DISPUTE CREATED — id: ${dispute.id}, amount: $${(dispute.amount / 100).toFixed(2)}, reason: ${dispute.reason}`
      );
      // Alert: manual review required — freeze creator balance if needed
      // TODO: Integrate email alert to admin here
      break;
    }

    case 'charge.dispute.closed': {
      const dispute = event.data.object;
      console.log(`[Webhook] Dispute closed — id: ${dispute.id}, status: ${dispute.status}`);
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

const createCheckoutSession = async (req, res) => {
  const { amount, creatorUsername, goalId, message } = req.body;

  try {
    if (!creatorUsername) {
      return res.status(400).json({ message: 'Creator username required' });
    }
    if (!goalId) {
      return res.status(400).json({ message: 'Goal ID required' });
    }

    const creatorProfile = await prisma.profile.findUnique({
      where: { username: creatorUsername },
      include: { user: true }
    });

    if (!creatorProfile) {
      return res.status(400).json({ message: 'Creator not found' });
    }

    if (!creatorProfile.user) {
      return res.status(400).json({ message: 'Creator configuration error' });
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    if (!goal) {
      return res.status(400).json({ message: 'Wish not found' });
    }

    if (goal.creatorId !== creatorProfile.id) {
      return res.status(400).json({ message: 'Wish does not belong to this creator' });
    }

    if (goal.status !== 'active') {
      return res.status(400).json({ message: 'This wish is no longer available' });
    }

    // Open-ended gifts — supporters can pay any amount, unlimited times
    const paymentAmount = amount ? parseFloat(amount) : parseFloat(goal.targetAmount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Enter a valid gift amount' });
    }
    if (paymentAmount < 0.5) {
      return res.status(400).json({ message: 'Minimum gift amount is $0.50' });
    }
    if (paymentAmount > 10000) {
      return res.status(400).json({ message: 'Maximum gift amount is $10,000' });
    }

    const settings = await getCommissionSettings();
    const { commission, net } = calculateCommission(paymentAmount, settings.commissionRate);

    const amountInCents = Math.round(paymentAmount * 100);
    if (amountInCents < 50) {
      return res.status(400).json({ message: 'Minimum wish price is $0.50' });
    }

    console.log(`[Stripe] Checkout — Wish: "${goal.title}", Amount: $${paymentAmount}, Creator: ${creatorUsername}`);
    console.log(`[Stripe] Commission: $${commission.toFixed(2)} (${(settings.commissionRate * 100).toFixed(1)}%), Net to Creator: $${net.toFixed(2)}`);

    // If the creator has a connected Stripe account and onboarding is complete,
    // create a Checkout Session that transfers funds to their account and
    // collects the platform commission as `application_fee_amount`.
    const sessionPayload = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: goal.title,
            description: `Wishlist gift for ${creatorProfile.displayName}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: creatorProfileUrl(creatorUsername, 'payment=success&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: creatorProfileUrl(creatorUsername, 'payment=cancel'),
      metadata: {
        type: 'gift_payment',
        goalId: goalId.toString(),
        creatorId: creatorProfile.userId,
        supporterId: req.user ? req.user.userId : 'guest',
        amount: paymentAmount.toString(),
        message: (message || '').substring(0, 500)
      }
    };

    // All payments go to platform Stripe account — creators receive manual payout after hold period

    const session = await stripe().checkout.sessions.create(sessionPayload);

    console.log(`[Stripe] Session created: ${session.id}`);
    res.json({
      url: session.url,
      amount: paymentAmount,
      commissionAmount: commission,
      netAmount: net,
      commissionRate: settings.commissionRate,
    });
  } catch (err) {
    console.error('[Stripe] Checkout error:', err.message);
    if (err.code === 'STRIPE_NOT_CONFIGURED' || err.type === 'StripeAuthenticationError') {
      return res.status(503).json({
        message: 'Payments are temporarily unavailable. Please try again later or contact support.',
      });
    }
    res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? `Error creating checkout session: ${err.message}`
        : 'Could not start payment. Please try again.',
    });
  }
};

/**
 * Confirm a completed checkout session after Stripe redirect.
 * Fallback when webhook is not configured or delayed on production.
 */
const confirmCheckoutSession = async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID required' });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed yet' });
    }

    const result = await fulfillGiftPayment(session, { sendEmail: true, source: 'confirm' });

    if (result.skipped) {
      return res.status(400).json({ message: 'Not a gift payment session' });
    }

    const goal = result.gift
      ? await prisma.goal.findUnique({
          where: { id: result.gift.goalId },
          select: { title: true, targetAmount: true },
        })
      : null;

    return res.json({
      message: result.alreadyProcessed ? 'Payment already recorded' : 'Payment confirmed',
      gift: result.gift,
      alreadyProcessed: !!result.alreadyProcessed,
      goalTitle: goal?.title || null,
      amount: result.gift?.amount || null,
    });
  } catch (err) {
    console.error('[Stripe] confirmCheckoutSession error:', err.message);
    res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'Could not confirm payment',
    });
  }
};

/** Throttle Stripe sync — max once per 10 seconds per creator (unless forced) */
const syncThrottle = new Map();
const SYNC_COOLDOWN_MS = 10_000;

async function fetchAllPaidGiftSessionsForCreator(userId) {
  const sessions = [];
  const seen = new Set();

  const addSessions = (batch) => {
    for (const session of batch) {
      if (session.payment_status !== 'paid') continue;
      if (!session.metadata || session.metadata.type !== 'gift_payment') continue;
      if (session.metadata.creatorId !== userId) continue;
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      sessions.push(session);
    }
  };

  try {
    let page = null;
    do {
      const params = {
        query: `metadata['type']:'gift_payment' AND metadata['creatorId']:'${userId}'`,
        limit: 100,
      };
      if (page) params.page = page;
      const result = await stripe().checkout.sessions.search(params);
      addSessions(result.data);
      page = result.has_more ? result.next_page : null;
    } while (page);
    return sessions;
  } catch (searchErr) {
    console.warn('[Stripe:sync] Search API fallback to list:', searchErr.message);
  }

  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  let startingAfter = undefined;

  for (;;) {
    const listResult = await stripe().checkout.sessions.list({
      limit: 100,
      status: 'complete',
      created: { gte: oneYearAgo },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    addSessions(listResult.data);
    if (!listResult.has_more || listResult.data.length === 0) break;
    startingAfter = listResult.data[listResult.data.length - 1].id;
  }

  return sessions;
}

/**
 * Pull all paid Stripe checkout sessions for this creator and record any
 * tips missing from the database (webhook/redirect failures).
 */
const syncCreatorPayments = async (req, res) => {
  const userId = req.user.userId;
  const force = req.query.force === '1' || req.body?.force === true;
  const lastSync = syncThrottle.get(userId) || 0;

  if (!force && Date.now() - lastSync < SYNC_COOLDOWN_MS) {
    const totalInDb = await prisma.gift.count({
      where: { creatorId: userId, status: { not: 'refunded' } },
    });
    return res.json({ synced: 0, alreadySynced: 0, throttled: true, totalFound: null, totalInDb });
  }
  syncThrottle.set(userId, Date.now());

  try {
    const sessions = await fetchAllPaidGiftSessionsForCreator(userId);

    let synced = 0;
    let alreadySynced = 0;
    const errors = [];
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

    for (const session of sessions) {
      try {
        const isRecent = session.created >= oneDayAgo;
        const result = await fulfillGiftPayment(session, {
          sendEmail: isRecent,
          source: 'sync',
        });
        if (result.alreadyProcessed) {
          alreadySynced++;
        } else if (!result.skipped && result.gift) {
          synced++;
        }
      } catch (err) {
        console.error(`[Stripe:sync] Failed session ${session.id}:`, err.message);
        errors.push({ sessionId: session.id, error: err.message });
      }
    }

    const totalInDb = await prisma.gift.count({
      where: { creatorId: userId, status: { not: 'refunded' } },
    });

    if (synced > 0) {
      console.log(
        `[Stripe:sync] Creator ${userId} — recorded ${synced} missed tip(s), ` +
        `${alreadySynced} already synced, ${totalInDb} total in DB`
      );
    }

    return res.json({
      synced,
      alreadySynced,
      totalFound: sessions.length,
      totalInDb,
      errors,
      throttled: false,
    });
  } catch (err) {
    console.error('[Stripe] syncCreatorPayments error:', err.message);
    res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'Could not sync payments from Stripe',
    });
  }
};

module.exports = {
  handleWebhook,
  createCheckoutSession,
  confirmCheckoutSession,
  syncCreatorPayments,
  fulfillGiftPayment,
};
