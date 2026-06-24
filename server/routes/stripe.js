const express = require('express');
const router = express.Router();
const { createCheckoutSession, confirmCheckoutSession, syncCreatorPayments } = require('../controllers/stripeController');
const optionalAuth = require('../middleware/optionalAuth');
const auth = require('../middleware/auth');

// Fan checkout — supports both authenticated fans and guests
// Note: /webhook is registered directly in server.js with raw body parsing
router.post('/create-checkout-session', optionalAuth, createCheckoutSession);
router.post('/confirm-session', optionalAuth, confirmCheckoutSession);
router.post('/sync-payments', auth, syncCreatorPayments);

module.exports = router;
