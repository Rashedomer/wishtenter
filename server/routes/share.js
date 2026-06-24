const express = require('express');
const router = express.Router();
const { getShareMeta } = require('../controllers/metaController');

/** Public share URLs — same OG HTML as /api/meta (for WhatsApp / social previews) */
router.get('/:username', getShareMeta);

module.exports = router;
