const express = require('express');
const router = express.Router();
const { sendGift, getMyHistory } = require('../controllers/giftController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

router.post('/', optionalAuth, sendGift);
router.get('/my-history', auth, getMyHistory);

module.exports = router;
