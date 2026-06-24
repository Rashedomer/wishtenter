const prisma = require('../prisma/client');
const { sendFundsReleasedEmail } = require('./email');
const { createNotification } = require('./notifications');

/**
 * Moves matured gifts from pendingBalance to available balance.
 * Hold period is set per gift at checkout (10 working days for platform-held funds).
 */
const refreshBalances = async (userId) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) return 0;

    const maturedGifts = await prisma.gift.findMany({
      where: {
        creatorId: profile.userId,
        isReleased: false,
        availableAt: { lte: new Date() },
        status: 'completed',
      },
    });

    if (maturedGifts.length === 0) return 0;

    const totalToRelease = maturedGifts.reduce((sum, gift) => sum + gift.netAmount, 0);

    await prisma.$transaction([
      prisma.profile.update({
        where: { id: profile.id },
        data: {
          balance: { increment: totalToRelease },
          pendingBalance: { decrement: totalToRelease },
        },
      }),
      prisma.gift.updateMany({
        where: { id: { in: maturedGifts.map((g) => g.id) } },
        data: { isReleased: true },
      }),
    ]);

    console.log(`[Wallet] Released $${totalToRelease.toFixed(2)} for creator ${userId} (${maturedGifts.length} gift(s))`);

    await createNotification(userId, {
      type: 'funds_released',
      title: 'Funds released to your wallet',
      body: `$${totalToRelease.toFixed(2)} from ${maturedGifts.length} tip${maturedGifts.length !== 1 ? 's' : ''} is now available to withdraw.`,
      link: '/wallet',
      meta: { amount: totalToRelease, giftCount: maturedGifts.length },
    });

    if (profile.user?.email) {
      sendFundsReleasedEmail(profile.user.email, {
        displayName: profile.displayName,
        amount: totalToRelease,
        giftCount: maturedGifts.length,
      }).catch((err) => {
        console.error('[Wallet] Release email failed:', err.message);
      });
    }

    return totalToRelease;
  } catch (err) {
    console.error('[Wallet] Error refreshing balances:', err);
    return 0;
  }
};

module.exports = { refreshBalances };
