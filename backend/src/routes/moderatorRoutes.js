const express = require('express');
const router = express.Router();
const {
  getDashboard, getReports, getReportById, assignReport, resolveReport,
  getPendingClaims, reviewClaim, getSuspiciousActivity, reviewSuspiciousActivity,
  hidePost, restorePost, getAuditLogs,
} = require('../controllers/moderatorController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireModerator } = require('../middleware/roleMiddleware');

// All moderator routes require authentication and MODERATOR or ADMIN role
router.use(authenticate, requireModerator);

router.get('/dashboard', getDashboard);
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id/assign', assignReport);
router.patch('/reports/:id/resolve', resolveReport);
router.get('/claims/pending', getPendingClaims);
router.patch('/claims/:id/review', reviewClaim);
router.get('/suspicious-activity', getSuspiciousActivity);
router.patch('/suspicious-activity/:id/review', reviewSuspiciousActivity);
router.patch('/posts/:id/hide', hidePost);
router.patch('/posts/:id/restore', restorePost);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
