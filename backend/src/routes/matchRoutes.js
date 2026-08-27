const express = require('express');
const router = express.Router();
const {
  listMatches, getMatch, markViewed, dismissMatch, refreshMatch,
  getSmartMatches, runSmartMatchForPost,
} = require('../controllers/matchController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, listMatches);
router.get('/:id', authenticate, getMatch);
router.post('/:id/viewed', authenticate, markViewed);
router.post('/:id/dismiss', authenticate, dismissMatch);
router.post('/:id/refresh', authenticate, refreshMatch);

module.exports = router;
