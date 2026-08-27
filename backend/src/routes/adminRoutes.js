const express = require('express');
const router = express.Router();
const {
  getDashboard, getUsers, getUserById, updateUserRole, suspendUser, unsuspendUser, deleteUser,
  getPosts, deletePost, updatePostStatus,
  getCategories, createCategory, updateCategory, deleteCategory,
  getAllClaims, getAllMatches, getAllReports, getAuditLogs,
  updatePostExpirySettings,
} = require('../controllers/adminController');
const { getPlatformAnalytics } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// All admin routes require ADMIN role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', getDashboard);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);
router.delete('/users/:id', deleteUser);

// Post management
router.get('/posts', getPosts);
router.delete('/posts/:id', deletePost);
router.patch('/posts/:id/status', updatePostStatus);

// Category management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Data views
router.get('/claims', getAllClaims);
router.get('/matches', getAllMatches);
router.get('/reports', getAllReports);
router.get('/analytics', getPlatformAnalytics);
router.get('/audit-logs', getAuditLogs);

// Settings
router.patch('/settings/post-expiry', updatePostExpirySettings);

module.exports = router;
