const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

router.get('/', auth, getMyNotifications);
router.post('/read-all', auth, markAllNotificationsRead);
router.post('/:id/read', auth, markNotificationRead);

module.exports = router;
