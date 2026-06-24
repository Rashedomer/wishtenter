const express = require('express');
const router = express.Router();
const { getShareMeta } = require('../controllers/metaController');

router.get('/:username', getShareMeta);

module.exports = router;
