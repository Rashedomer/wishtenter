const express = require('express');
const router = express.Router();
const { 
  getCreatorProfile, 
  getAllCreators, 
  getMyProfile, 
  updateProfile,
  getPayoutSettings,
  updatePayoutSettings
} = require('../controllers/creatorController');
const auth = require('../middleware/auth');

router.get('/', getAllCreators);
router.get('/me', auth, getMyProfile);
router.put('/me', auth, updateProfile);
router.get('/payout-settings', auth, getPayoutSettings);
router.put('/payout-settings', auth, updatePayoutSettings);
router.post('/me/stripe-onboard', auth, require('../controllers/creatorController').createStripeOnboarding);
router.get('/:username', getCreatorProfile);

module.exports = router;
