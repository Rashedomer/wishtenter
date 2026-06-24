/**
 * Recover a paid tip that did not appear in the dashboard (webhook missed).
 * Usage: node scripts/confirm-stripe-session.js cs_test_xxxx
 */
require('../config/loadEnv');
const { createStripeClient } = require('../utils/stripeClient');
const prisma = require('../prisma/client');
const { getCommissionSettings, calculateCommission } = require('../utils/commission');

function addWorkingDays(startDate, days) {
  let date = new Date(startDate.getTime());
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return date;
}

function normalizeGiftMessage(message) {
  if (!message || typeof message !== 'string') return null;
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node scripts/confirm-stripe-session.js <stripe_session_id>');
    process.exit(1);
  }

  const stripe = createStripeClient();
  if (!stripe) {
    console.error('Stripe not configured');
    process.exit(1);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    console.error('Session is not paid:', session.payment_status);
    process.exit(1);
  }
  if (!session.metadata || session.metadata.type !== 'gift_payment') {
    console.error('Not a gift payment session');
    process.exit(1);
  }

  const existing = await prisma.gift.findFirst({ where: { stripeSessionId: session.id } });
  if (existing) {
    console.log('Already recorded. Gift ID:', existing.id);
    console.log('Message:', existing.message || '(none)');
    process.exit(0);
  }

  const { goalId, creatorId, amount, supporterId, message } = session.metadata;
  const paymentAmount = parseFloat(amount);
  const settings = await getCommissionSettings();
  const { commission, net } = calculateCommission(paymentAmount, settings.commissionRate);
  const giftMessage = normalizeGiftMessage(message);

  const [gift] = await prisma.$transaction([
    prisma.gift.create({
      data: {
        supporterId: supporterId === 'guest' || !supporterId ? null : supporterId,
        creatorId,
        goalId,
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
      where: { id: goalId },
      data: { currentAmount: { increment: paymentAmount } },
    }),
    prisma.profile.update({
      where: { userId: creatorId },
      data: { pendingBalance: { increment: net } },
    }),
  ]);

  console.log('✅ Gift recorded:', gift.id);
  console.log('   Amount: $' + paymentAmount, '| Net: $' + net.toFixed(2));
  console.log('   Message:', giftMessage || '(none)');
  console.log('   Pending balance updated: true');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
