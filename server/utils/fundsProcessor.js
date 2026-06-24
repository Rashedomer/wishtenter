const prisma = require('../prisma/client');

/**
 * Moves funds from pendingBalance to balance for gifts older than 7 days.
 */
const processReleasedFunds = async () => {
  console.log('🔄 Checking for funds to release...');
  try {
    const now = new Date();
    
    // Find all unreleased gifts that are now available
    const availableGifts = await prisma.gift.findMany({
      where: {
        isReleased: false,
        availableAt: { lte: now },
        status: 'completed'
      }
    });

    if (availableGifts.length === 0) {
      console.log('✅ No funds to release today.');
      return;
    }

    console.log(`🚀 Releasing funds for ${availableGifts.length} gifts...`);

    for (const gift of availableGifts) {
      try {
        // Check if profile exists before running transaction
        const profileExists = await prisma.profile.findUnique({
          where: { userId: gift.creatorId }
        });

        if (!profileExists) {
          console.warn(`⚠️ Skipping gift ${gift.id} - no profile found for creatorId ${gift.creatorId}`);
          // Mark as released so we don't retry it forever
          await prisma.gift.update({
            where: { id: gift.id },
            data: { isReleased: true }
          });
          continue;
        }

        await prisma.$transaction([
          // 1. Mark gift as released
          prisma.gift.update({
            where: { id: gift.id },
            data: { isReleased: true }
          }),
          // 2. Move netAmount from pending to available balance
          prisma.profile.update({
            where: { userId: gift.creatorId },
            data: {
              pendingBalance: { decrement: gift.netAmount },
              balance: { increment: gift.netAmount }
            }
          })
        ]);

        const fee = gift.commissionAmount ?? Math.max(0, gift.amount - gift.netAmount);
        console.log(`✅ Funds released for gift ${gift.id} — net $${gift.netAmount} (commission $${fee})`);
      } catch (giftErr) {
        console.error(`❌ Failed to release funds for gift ${gift.id}:`, giftErr.message);
      }
    }

    console.log(`✨ Fund release job completed.`);
  } catch (err) {
    console.error('❌ Error releasing funds:', err);
  }
};

module.exports = { processReleasedFunds };
