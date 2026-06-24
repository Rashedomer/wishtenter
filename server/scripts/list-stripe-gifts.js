/**
 * List recent paid gift checkout sessions from Stripe (no DB required).
 * Usage: node scripts/list-stripe-gifts.js
 */
require('../config/loadEnv');
const { createStripeClient } = require('../utils/stripeClient');

async function main() {
  const stripe = createStripeClient();
  if (!stripe) {
    console.error('Stripe not configured');
    process.exit(1);
  }

  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    status: 'complete',
    created: { gte: thirtyDaysAgo },
  });

  const gifts = sessions.data.filter(
    (s) => s.metadata?.type === 'gift_payment' && s.payment_status === 'paid'
  );

  if (gifts.length === 0) {
    console.log('No paid gift sessions in the last 30 days.');
    return;
  }

  console.log(`Found ${gifts.length} paid gift session(s):\n`);
  for (const s of gifts) {
    const m = s.metadata || {};
    console.log(`  Session: ${s.id}`);
    console.log(`  Amount:  $${m.amount || (s.amount_total / 100)}`);
    console.log(`  Creator: ${m.creatorId || '?'}`);
    console.log(`  Goal:    ${m.goalId || '?'}`);
    console.log(`  Date:    ${new Date(s.created * 1000).toISOString()}`);
    console.log('');
  }

  console.log('Recover one tip:');
  console.log('  node scripts/confirm-stripe-session.js <session_id>');
  console.log('\nNote: run recovery on the server whose database has this creator (production).');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
