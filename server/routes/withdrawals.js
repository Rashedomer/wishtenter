const express = require('express');
const router = express.Router();
const { requestWithdrawal, getMyWithdrawals } = require('../controllers/withdrawalController');
const auth = require('../middleware/auth');

router.post('/', auth, requestWithdrawal);
router.get('/my', auth, getMyWithdrawals);

module.exports = router;
