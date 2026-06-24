/**
 * Recover missed tips from Stripe checkout sessions (last 7 days).
 * Usage: node scripts/sync-recent-tips.js [creatorUsername]
 */
require('../config/loadEnv');
const { createStripeClient } = require('../utils/stripeClient');
const prisma = require('../prisma/client');
const { fulfillGiftPayment } = require('../controllers/stripeController');

async function main() {
  const username = process.argv[2];
  const stripe = createStripeClient();
  if (!stripe) {
    console.error('Stripe not configured');
    process.exit(1);
  }

  let creatorUserId = null;
  if (username) {
    let profile = await prisma.profile.findUnique({ where: { username } });
    if (!profile) {
      profile = await prisma.profile.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
      });
    }
    if (!profile) {
      const all = await prisma.profile.findMany({
        select: { username: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      console.error(`Creator not found in THIS database: "${username}"`);
      console.error('');
      console.error('This script updates the database in server/.env (currently local).');
      console.error('daispin lives on production — run this on wishtenter.com server, or use production DATABASE_URL.');
      console.error('');
      if (all.length > 0) {
        console.error('Creators in local DB:', all.map((p) => p.username).join(', '));
      } else {
        console.error('Local DB has no creator profiles.');
      }
      console.error('');
      console.error('To see Stripe payments (no DB): node scripts/list-stripe-gifts.js');
      process.exit(1);
    }
    creatorUserId = profile.userId;
    console.log(`Syncing tips for @${profile.username} (${creatorUserId})`);
  } else {
    console.log('Syncing ALL recent gift payments in this database...');
  }

  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    status: 'complete',
    created: { gte: sevenDaysAgo },
  });

  let synced = 0;
  let skipped = 0;

  for (const session of sessions.data) {
    if (!session.metadata || session.metadata.type !== 'gift_payment') continue;
    if (creatorUserId && session.metadata.creatorId !== creatorUserId) continue;
    if (session.payment_status !== 'paid') continue;

    const result = await fulfillGiftPayment(session, { sendEmail: synced === 0, source: 'manual-sync' });
    if (result.alreadyProcessed) skipped++;
    else if (!result.skipped && result.gift) {
      synced++;
      console.log(`  + $${result.gift.amount} gift ${result.gift.id}`);
    }
  }

  console.log(`Done — synced: ${synced}, already recorded: ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
