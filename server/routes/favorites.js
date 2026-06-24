const express = require('express');
const router = express.Router();
const { toggleFavorite, getMyFavorites } = require('../controllers/favoriteController');
const auth = require('../middleware/auth');

router.post('/toggle', auth, toggleFavorite);
router.get('/my', auth, getMyFavorites);

module.exports = router;
