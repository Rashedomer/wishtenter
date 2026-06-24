/**
 * Recover missed Stripe gift payments on server startup (webhook/redirect failures).
 */
const { createStripeClient } = require('./stripeClient');
const { fulfillGiftPayment } = require('../controllers/stripeController');

async function recoverMissedStripeTips({ days = 30 } = {}) {
  const stripe = createStripeClient();
  if (!stripe) {
    return { skipped: true, reason: 'stripe_not_configured' };
  }

  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  let synced = 0;
  let alreadySynced = 0;
  let startingAfter;

  for (;;) {
    const batch = await stripe.checkout.sessions.list({
      limit: 100,
      status: 'complete',
      created: { gte: since },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const session of batch.data) {
      if (!session.metadata || session.metadata.type !== 'gift_payment') continue;
      if (session.payment_status !== 'paid') continue;

      try {
        const result = await fulfillGiftPayment(session, {
          sendEmail: false,
          source: 'startup-recovery',
        });
        if (result.alreadyProcessed) alreadySynced++;
        else if (!result.skipped && result.gift) synced++;
      } catch (err) {
        console.error(`[Stripe:recovery] session ${session.id}:`, err.message);
      }
    }

    if (!batch.has_more || batch.data.length === 0) break;
    startingAfter = batch.data[batch.data.length - 1].id;
  }

  return { synced, alreadySynced, days };
}

module.exports = { recoverMissedStripeTips };
