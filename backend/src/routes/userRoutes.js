const express = require('express');
const router = express.Router();
const {
  getMe, updateMe, updateAvatar, getDashboard, getMyPosts,
  getMyClaims, getMyMatches, getMyNotifications,
  updateNotificationPreferences, getPublicProfile, getTrustScore,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');
const { validateUpdateProfile } = require('../middleware/validateMiddleware');

// Authenticated user routes
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validateUpdateProfile, updateMe);
router.patch('/me/avatar', authenticate, uploadAvatar, updateAvatar);
router.get('/me/dashboard', authenticate, getDashboard);
router.get('/me/posts', authenticate, getMyPosts);
router.get('/me/claims', authenticate, getMyClaims);
router.get('/me/matches', authenticate, getMyMatches);
router.get('/me/notifications', authenticate, getMyNotifications);
router.patch('/me/notification-preferences', authenticate, updateNotificationPreferences);

// Public routes
router.get('/:id/public-profile', getPublicProfile);
router.get('/:id/trust-score', getTrustScore);

module.exports = router;
