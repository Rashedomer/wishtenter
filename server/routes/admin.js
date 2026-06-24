const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getAllWithdrawals, 
  updateWithdrawalStatus, 
  getSystemSettings, 
  updateSystemSettings,
  getAllCreators,
  getPlatformAnalytics,
  deleteCreator,
  clearCreatorMedia,
  changeAdminEmail,
  changeAdminPassword,
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const prisma = require('../prisma/client');

// Middleware to check if user is ADMIN
const adminOnly = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('adminOnly middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/stats', auth, adminOnly, getDashboardStats);
router.get('/withdrawals', auth, adminOnly, getAllWithdrawals);
router.put('/withdrawals/:id', auth, adminOnly, updateWithdrawalStatus);
router.post('/withdrawals/:id/pay', auth, adminOnly, require('../controllers/adminController').executeWithdrawal);
router.get('/settings', auth, adminOnly, getSystemSettings);
router.put('/settings', auth, adminOnly, updateSystemSettings);
router.get('/creators', auth, adminOnly, getAllCreators);
router.get('/analytics', auth, adminOnly, getPlatformAnalytics);
router.delete('/creators/:id', auth, adminOnly, deleteCreator);
router.put('/creators/:id/clear-media', auth, adminOnly, clearCreatorMedia);
router.put('/account/email', auth, adminOnly, changeAdminEmail);
router.put('/account/password', auth, adminOnly, changeAdminPassword);

module.exports = router;
