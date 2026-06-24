const bcrypt = require('bcryptjs');
const prisma = require('../prisma/client');
const { normalizeProfile, normalizeUploadUrl } = require('../utils/mediaUrl');

// Middleware check for admin role is handled in routes
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalCreators = await prisma.user.count({ where: { role: 'CREATOR' } });
    const totalSupporters = await prisma.user.count({ where: { role: 'SUPPORTER' } });
    const totalGifts = await prisma.gift.aggregate({
      _sum: { amount: true, netAmount: true, commissionAmount: true },
    });

    let pendingWithdrawalCount = 0;
    let pendingWithdrawalAmount = 0;
    try {
      const pendingAgg = await prisma.withdrawal.aggregate({
        where: { status: 'pending' },
        _count: { _all: true },
        _sum: { amount: true },
      });
      pendingWithdrawalCount = pendingAgg._count._all || 0;
      pendingWithdrawalAmount = pendingAgg._sum.amount || 0;
    } catch (withdrawalErr) {
      console.warn('getDashboardStats: withdrawal stats unavailable:', withdrawalErr.message);
    }

    let platformPendingBalance = 0;
    let platformAvailableBalance = 0;
    try {
      const balanceAgg = await prisma.profile.aggregate({
        _sum: { pendingBalance: true, balance: true },
      });
      platformPendingBalance = balanceAgg._sum.pendingBalance || 0;
      platformAvailableBalance = balanceAgg._sum.balance || 0;
    } catch (balanceErr) {
      console.warn('getDashboardStats: balance stats unavailable:', balanceErr.message);
    }

    res.json({
      totalUsers,
      totalCreators,
      totalSupporters,
      totalVolume: totalGifts._sum.amount || 0,
      totalNetToCreators: totalGifts._sum.netAmount || 0,
      totalCommission: totalGifts._sum.commissionAmount || 0,
      pendingWithdrawals: pendingWithdrawalCount,
      pendingWithdrawalCount,
      pendingWithdrawalAmount,
      platformPendingBalance,
      platformAvailableBalance,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

const getAllWithdrawals = async (req, res) => {
  try {
    let withdrawals = [];
    try {
      withdrawals = await prisma.withdrawal.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (findErr) {
      console.warn('getAllWithdrawals: ordered query failed, retrying:', findErr.message);
      try {
        withdrawals = await prisma.withdrawal.findMany();
      } catch (retryErr) {
        console.error('getAllWithdrawals: table unavailable:', retryErr.message);
        return res.json([]);
      }
    }

    if (withdrawals.length === 0) {
      return res.json([]);
    }

    const profileIds = [...new Set(withdrawals.map((w) => w.creatorId).filter(Boolean))];

    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        user: {
          select: { id: true, email: true },
        },
      },
    });

    let payoutByProfileId = {};
    try {
      const payoutRows = await prisma.payoutDetails.findMany({
        where: { profileId: { in: profileIds } },
      });
      payoutByProfileId = Object.fromEntries(payoutRows.map((p) => [p.profileId, p]));
    } catch (payoutErr) {
      console.warn('getAllWithdrawals: payout details unavailable:', payoutErr.message);
    }

    const profileById = Object.fromEntries(
      profiles.map((p) => [
        p.id,
        {
          ...normalizeProfile(p),
          payoutDetails: payoutByProfileId[p.id] || null,
        },
      ])
    );

    res.json(
      withdrawals.map((w) => ({
        ...w,
        profile: profileById[w.creatorId] || null,
      }))
    );
  } catch (err) {
    console.error('getAllWithdrawals error:', err);
    res.status(500).json({ message: 'Error fetching withdrawals', error: err.message });
  }
};

const updateWithdrawalStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status }
    });

    // If rejected, refund the creator's balance
    if (status === 'rejected') {
      await prisma.profile.update({
        where: { id: withdrawal.creatorId },
        data: {
          balance: { increment: withdrawal.amount }
        }
      });
    }

    res.json(withdrawal);
  } catch (err) {
    res.status(500).json({ message: 'Error updating withdrawal' });
  }
};

/**
 * Mark a withdrawal as paid by admin. This endpoint records method/reference
 * and sets status to `paid`. Actual money transfer should be done offline
 * (bank transfer / crypto). Admin should pass `method` and `reference`.
 */
const executeWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { method, reference } = req.body;

  try {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        profile: {
          include: { payoutDetails: true, user: true }
        }
      }
    });

    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ message: 'Only pending withdrawals can be executed' });

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'paid',
        method: method || withdrawal.method || (withdrawal.profile?.payoutDetails?.payoutMethod ?? null),
        details: reference || `Paid manually by admin ${req.user.userId}`
      }
    });

    res.json(updated);
  } catch (err) {
    console.error('executeWithdrawal error:', err);
    res.status(500).json({ message: 'Error executing withdrawal' });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' }
    });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'singleton', commissionRate: 0.15 }
      });
    } else if (settings.commissionRate === 0.10) {
      settings = await prisma.systemSettings.update({
        where: { id: 'singleton' },
        data: { commissionRate: 0.15 }
      });
    }
    res.json(settings);
  } catch (err) {
    console.error('getSystemSettings error:', err);
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

const updateSystemSettings = async (req, res) => {
  const { commissionRate } = req.body;
  try {
    const settings = await prisma.systemSettings.update({
      where: { id: 'singleton' },
      data: { commissionRate: parseFloat(commissionRate) }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error updating settings' });
  }
};

const getAllCreators = async (req, res) => {
  try {
    const creators = await prisma.profile.findMany({
      where: {
        user: { role: 'CREATOR' },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            createdAt: true,
          },
        },
        _count: {
          select: { goals: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(creators.map(normalizeProfile));
  } catch (err) {
    console.error('getAllCreators error:', err);
    res.status(500).json({ message: 'Error fetching creators' });
  }
};

const getPlatformAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const gifts = await prisma.gift.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'completed'
      },
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const dailyVolume = gifts.reduce((acc, gift) => {
      const date = gift.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + gift.amount;
      return acc;
    }, {});

    const chartData = Object.keys(dailyVolume).map(date => ({
      date,
      amount: dailyVolume[date]
    }));

    res.json(chartData);
  } catch (err) {
    console.error('getPlatformAnalytics error:', err);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

const clearCreatorMedia = async (req, res) => {
  const { id } = req.params;
  const { target } = req.body;

  try {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ message: 'Creator not found' });

    const data = {};
    if (target === 'cover') {
      data.coverUrl = null;
    } else if (target === 'all') {
      data.avatarUrl = null;
      data.coverUrl = null;
    } else {
      data.avatarUrl = null;
    }

    const updated = await prisma.profile.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { goals: true } },
      },
    });

    res.json({ message: 'Creator media removed', profile: updated });
  } catch (err) {
    console.error('clearCreatorMedia error:', err);
    res.status(500).json({ message: 'Error removing creator media' });
  }
};

const deleteCreator = async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: { userId: true, id: true }
    });
    
    if (!profile) return res.status(404).json({ message: 'Creator not found' });

    console.log(`🗑️ Deleting creator profile ${profile.id} and user ${profile.userId}...`);

    try {
      // Manually delete related records to avoid foreign key constraints
      await prisma.$transaction([
        // 1. Delete PayoutDetails
        prisma.payoutDetails.deleteMany({ where: { profileId: profile.id } }),
        // 2. Delete Withdrawals
        prisma.withdrawal.deleteMany({ where: { creatorId: profile.id } }),
        // 3. Delete Gifts related to this creator's goals
        prisma.gift.deleteMany({ where: { creatorId: profile.userId } }), 
        // 4. Delete Goals
        prisma.goal.deleteMany({ where: { creatorId: profile.id } }),
        // 5. Delete Favorites
        prisma.favorite.deleteMany({ where: { creatorId: profile.id } }),
        prisma.favorite.deleteMany({ where: { userId: profile.userId } }),
        // 6. Finally delete profile and user
        prisma.profile.delete({ where: { id: profile.id } }),
        prisma.user.delete({ where: { id: profile.userId } })
      ]);

      res.json({ message: 'Creator and all related data deleted successfully' });
    } catch (txErr) {
      console.error('Transaction failed:', txErr);
      throw txErr;
    }
  } catch (err) {
    console.error('deleteCreator error:', err);
    res.status(500).json({ message: 'Error deleting creator: ' + err.message });
  }
};

const getAdminAccount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true, isVerified: true, createdAt: true },
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    res.json(user);
  } catch (err) {
    console.error('getAdminAccount error:', err);
    res.status(500).json({ message: 'Error loading admin account' });
  }
};

const changeAdminEmail = async (req, res) => {
  const newEmail = String(req.body.newEmail || '').trim().toLowerCase();
  const currentPassword = req.body.currentPassword;

  if (!newEmail || !currentPassword) {
    return res.status(400).json({ message: 'New email and current password are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newEmail === user.email.toLowerCase()) {
      return res.status(400).json({ message: 'This is already your email address' });
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail, isVerified: true },
      include: { profile: true },
    });

    const { password: _, ...safeUser } = updated;
    res.json({ message: 'Admin email updated successfully', user: safeUser });
  } catch (err) {
    console.error('changeAdminEmail error:', err);
    res.status(500).json({ message: 'Error updating email' });
  }
};

const changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('changeAdminPassword error:', err);
    res.status(500).json({ message: 'Error updating password' });
  }
};

module.exports = {
  getDashboardStats,
  getAllWithdrawals,
  updateWithdrawalStatus,
  executeWithdrawal,
  getSystemSettings,
  updateSystemSettings,
  getAllCreators,
  getPlatformAnalytics,
  deleteCreator,
  clearCreatorMedia,
  getAdminAccount,
  changeAdminEmail,
  changeAdminPassword,
};
