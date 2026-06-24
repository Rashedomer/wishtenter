const express = require('express');
const router = express.Router();
const { signup, login, getMe, verifyEmail, verifyEmailOTP, resendEmailOTP, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/resend-email-otp', resendEmailOTP);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/me', auth, getMe);

module.exports = router;
