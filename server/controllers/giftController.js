const prisma = require('../prisma/client');
const { getCommissionSettings, calculateCommission } = require('../utils/commission');
const { sendGiftNotificationEmail } = require('../utils/email');
const { refreshBalances } = require('../utils/wallet');
const { normalizeGoal, normalizeProfile } = require('../utils/mediaUrl');

const sendGift = async (req, res) => {
  const { goalId, amount, message } = req.body;
  const supporterId = req.user ? req.user.userId : null;

  try {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { profile: true }
    });

    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const settings = await getCommissionSettings();
    const amountFloat = parseFloat(amount);
    const { commission: commissionAmount, net: creatorAmount } = calculateCommission(
      amountFloat,
      settings.commissionRate
    );

    // 2. Create Gift record
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + 7); // 7 days from now

    const gift = await prisma.gift.create({
      data: {
        goal: { connect: { id: goalId } },
        supporterId,
        creatorId: goal.profile.userId,
        amount: amountFloat,
        netAmount: creatorAmount,
        commissionAmount,
        message,
        availableAt
      }
    });

    // 3. Update Goal currentAmount
    await prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: { increment: amountFloat }
      }
    });

    // 4. Update Creator Pending Balance (Deducting Commission)
    await prisma.profile.update({
      where: { userId: goal.profile.userId },
      data: {
        pendingBalance: { increment: creatorAmount }
      }
    });

    // Notify creator by email (non-blocking)
    prisma.user.findUnique({
      where: { id: goal.profile.userId },
      include: { profile: true },
    }).then((creator) => {
      if (!creator?.email) return;
      return sendGiftNotificationEmail(creator.email, {
        displayName: creator.profile?.displayName || goal.profile.displayName,
        goalTitle: goal.title,
        amount: amountFloat,
        netAmount: creatorAmount,
        message: message || null,
        isPending: true,
      });
    }).catch((emailErr) => {
      console.error('[Gift] Notification email failed:', emailErr.message);
    });

    res.status(201).json({ 
      ...gift, 
      commissionApplied: commissionAmount,
      finalAmount: creatorAmount,
      availableAt 
    });
  } catch (err) {
    console.error("Gift processing error:", err);
    res.status(500).json({ 
      message: 'Error processing gift', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const getMyHistory = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    // Release matured tips (pending → available) before returning history
    if (user.role === 'CREATOR') {
      await refreshBalances(req.user.userId);
    }
    
    const hasPagination = ('page' in req.query) || ('limit' in req.query);

    const whereClause = user.role === 'CREATOR' 
      ? { creatorId: req.user.userId } 
      : { supporterId: req.user.userId };

    if (!hasPagination) {
      // Backwards-compatible: return full array
      const gifts = await prisma.gift.findMany({
        where: whereClause,
        include: { 
          goal: {
            select: {
              id: true,
              title: true,
              targetAmount: true,
              currentAmount: true,
              imageUrl: true,
              profile: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(gifts.map(g => ({
        ...g,
        goal: g.goal ? normalizeGoal(g.goal) : g.goal,
      })));
    }

    // Pagination defaults
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const gifts = await prisma.gift.findMany({
      where: whereClause,
      include: { 
        goal: {
          select: {
            id: true,
            title: true,
            targetAmount: true,
            currentAmount: true,
            imageUrl: true,
            profile: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    });

    const total = await prisma.gift.count({
      where: whereClause
    });

    res.json({
      data: gifts.map(g => ({
        ...g,
        goal: g.goal ? normalizeGoal(g.goal) : g.goal,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching history' });
  }
};

module.exports = { sendGift, getMyHistory };
