const prisma = require('../prisma/client');
const { refreshBalances } = require('../utils/wallet');
const { createNotification } = require('../utils/notifications');

const requestWithdrawal = async (req, res) => {
  const { amount, method, details } = req.body;
  const userId = req.user.userId;

  await refreshBalances(userId);

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (profile.balance < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create withdrawal request and deduct balance in a transaction
    const amountFloat = parseFloat(amount);

    const [withdrawal] = await prisma.$transaction([
      prisma.withdrawal.create({
        data: {
          creatorId: profile.id,
          amount: amountFloat,
          method,
          details,
          status: 'pending'
        }
      }),
      prisma.profile.update({
        where: { id: profile.id },
        data: {
          balance: { decrement: amountFloat }
        }
      })
    ]);

    prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    }).then((admins) => {
      admins.forEach((admin) => {
        createNotification(admin.id, {
          type: 'withdrawal_requested',
          title: 'New payout request',
          body: `${profile.displayName} requested a $${amountFloat.toFixed(2)} withdrawal.`,
          link: '/admin',
          meta: { withdrawalId: withdrawal.id, amount: amountFloat, creatorId: profile.id },
        });
      });
    }).catch((err) => {
      console.error('[Withdrawal] Admin notification failed:', err.message);
    });

    res.status(201).json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error requesting withdrawal' });
  }
};

const getMyWithdrawals = async (req, res) => {
  const userId = req.user.userId;
  await refreshBalances(userId);
  
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId }
    });

    const hasPagination = ('page' in req.query) || ('limit' in req.query);

    if (!hasPagination) {
      // Backwards-compatible: return full array
      const withdrawals = await prisma.withdrawal.findMany({
        where: { creatorId: profile.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(withdrawals);
    }

    // Pagination defaults
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const withdrawals = await prisma.withdrawal.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip
    });

    const total = await prisma.withdrawal.count({
      where: { creatorId: profile.id }
    });

    res.json({
      data: withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching withdrawals' });
  }
};

module.exports = { requestWithdrawal, getMyWithdrawals };
