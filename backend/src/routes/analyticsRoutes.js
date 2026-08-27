const express = require('express');
const router = express.Router();
const {
  getPlatformAnalytics, getUserAnalytics, getRecoveryRate,
  getCategoryStats, getMatchPerformance,
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireModerator } = require('../middleware/roleMiddleware');

router.get('/platform', authenticate, requireModerator, getPlatformAnalytics);
router.get('/user/me', authenticate, getUserAnalytics);
router.get('/recovery-rate', authenticate, requireModerator, getRecoveryRate);
router.get('/category-stats', authenticate, requireModerator, getCategoryStats);
router.get('/match-performance', authenticate, requireModerator, getMatchPerformance);

module.exports = router;
