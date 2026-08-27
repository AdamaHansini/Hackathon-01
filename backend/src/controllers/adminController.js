const User = require('../models/User');
const ItemPost = require('../models/ItemPost');
const Claim = require('../models/Claim');
const Match = require('../models/Match');
const Report = require('../models/Report');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const AuditLog = require('../models/AuditLog');
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { auditFromRequest } = require('../utils/auditLogger');
const { onSuspension, onReinstatement } = require('../services/trustScoreService');
const { deleteManyFromCloudinary } = require('../services/cloudinaryService');

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeLostPosts,
    activeFoundPosts,
    potentialMatches,
    successfulReturns,
    pendingReports,
    criticalSuspiciousActivity,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments({ accountStatus: { $ne: 'DELETED' } }),
    ItemPost.countDocuments({ type: 'LOST', status: 'ACTIVE' }),
    ItemPost.countDocuments({ type: 'FOUND', status: 'ACTIVE' }),
    Match.countDocuments({ confidenceLevel: { $in: ['MEDIUM', 'HIGH'] }, status: 'SUGGESTED' }),
    ItemPost.countDocuments({ status: 'RETURNED' }),
    Report.countDocuments({ status: 'OPEN' }),
    SuspiciousActivity.countDocuments({ severity: { $in: ['HIGH', 'CRITICAL'] }, status: 'OPEN' }),
    User.find({ accountStatus: 'ACTIVE' }).sort({ createdAt: -1 }).limit(5).select('name email role createdAt trustScore').lean(),
  ]);

  const recoveryRate = await ItemPost.aggregate([
    { $group: { _id: null, total: { $sum: 1 }, returned: { $sum: { $cond: [{ $eq: ['$status', 'RETURNED'] }, 1, 0] } } } },
    { $project: { rate: { $multiply: [{ $divide: ['$returned', '$total'] }, 100] } } },
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        activeLostPosts,
        activeFoundPosts,
        potentialMatches,
        successfulReturns,
        pendingReports,
        criticalSuspiciousActivity,
        recoveryRate: recoveryRate[0]?.rate?.toFixed(1) || '0.0',
      },
      recentUsers,
    },
  });
});

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { search, role, status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.accountStatus = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { users, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } },
  });
});

/**
 * GET /api/admin/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const [postCount, claimCount, reportCount] = await Promise.all([
    ItemPost.countDocuments({ userId: user._id }),
    Claim.countDocuments({ $or: [{ claimantId: user._id }, { foundPostOwnerId: user._id }] }),
    Report.countDocuments({ reporterId: user._id }),
  ]);

  res.json({ success: true, data: { user, stats: { postCount, claimCount, reportCount } } });
});

/**
 * PATCH /api/admin/users/:id/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  await auditFromRequest(req, {
    action: 'USER_ROLE_UPDATED',
    entityType: 'User',
    entityId: user._id,
    metadata: { newRole: role, changedBy: req.user._id },
  });

  res.json({ success: true, message: `User role updated to ${role}.`, data: { user } });
});

/**
 * PATCH /api/admin/users/:id/suspend
 */
const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { accountStatus: 'SUSPENDED', suspendedAt: new Date(), suspendedReason: reason || null },
    { new: true }
  );

  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  await onSuspension(user._id);

  await auditFromRequest(req, {
    action: 'USER_SUSPENDED',
    entityType: 'User',
    entityId: user._id,
    metadata: { reason, suspendedBy: req.user._id },
  });

  res.json({ success: true, message: 'User suspended.', data: { user } });
});

/**
 * PATCH /api/admin/users/:id/unsuspend
 */
const unsuspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { accountStatus: 'ACTIVE', suspendedAt: null, suspendedReason: null },
    { new: true }
  );

  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  await onReinstatement(user._id);

  await auditFromRequest(req, {
    action: 'USER_UNSUSPENDED',
    entityType: 'User',
    entityId: user._id,
    metadata: { unsuspendedBy: req.user._id },
  });

  res.json({ success: true, message: 'User account reinstated.', data: { user } });
});

/**
 * DELETE /api/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { accountStatus: 'DELETED', email: `deleted_${Date.now()}_${req.params.id}@deleted.lostlink` },
    { new: true }
  );

  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  await auditFromRequest(req, {
    action: 'USER_DELETED',
    entityType: 'User',
    entityId: user._id,
    metadata: { deletedBy: req.user._id },
  });

  res.json({ success: true, message: 'User account deleted.' });
});

// ─── Post Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/posts
 */
const getPosts = asyncHandler(async (req, res) => {
  const { type, status, moderationStatus, isFlagged, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (moderationStatus) filter.moderationStatus = moderationStatus;
  if (isFlagged === 'true') filter.isFlagged = true;

  const [posts, total] = await Promise.all([
    ItemPost.find(filter)
      .populate('userId', 'name email role trustScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ItemPost.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { posts, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } },
  });
});

/**
 * DELETE /api/admin/posts/:id
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const publicIds = post.images.map((img) => img.publicId).filter(Boolean);
  await deleteManyFromCloudinary(publicIds);
  await ItemPost.findByIdAndDelete(req.params.id);

  await auditFromRequest(req, {
    action: 'POST_DELETED_BY_ADMIN',
    entityType: 'ItemPost',
    entityId: post._id,
    metadata: { itemName: post.itemName, deletedBy: req.user._id },
  });

  res.json({ success: true, message: 'Post permanently deleted.' });
});

/**
 * PATCH /api/admin/posts/:id/status
 */
const updatePostStatus = asyncHandler(async (req, res) => {
  const { status, moderationStatus, moderationNote } = req.body;

  const updates = {};
  if (status) updates.status = status;
  if (moderationStatus) updates.moderationStatus = moderationStatus;
  if (moderationNote !== undefined) updates.moderationNote = moderationNote;

  const post = await ItemPost.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  res.json({ success: true, message: 'Post status updated.', data: { post } });
});

// ─── Category Management ──────────────────────────────────────────────────────

/**
 * GET /api/admin/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ success: true, data: { categories } });
});

/**
 * POST /api/admin/categories
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, description, sortOrder } = req.body;
  const category = await Category.create({ name, icon, description, sortOrder });
  res.status(201).json({ success: true, message: 'Category created.', data: { category } });
});

/**
 * PATCH /api/admin/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  res.json({ success: true, message: 'Category updated.', data: { category } });
});

/**
 * DELETE /api/admin/categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Category deleted.' });
});

// ─── Other Admin Views ────────────────────────────────────────────────────────

/**
 * GET /api/admin/claims
 */
const getAllClaims = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = status ? { status } : {};
  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .populate('foundPostId', 'itemName category')
      .populate('claimantId', 'name email trustScore')
      .populate('foundPostOwnerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Claim.countDocuments(filter),
  ]);

  res.json({ success: true, data: { claims, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
});

/**
 * GET /api/admin/matches
 */
const getAllMatches = asyncHandler(async (req, res) => {
  const { confidenceLevel, status, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (confidenceLevel) filter.confidenceLevel = confidenceLevel;
  if (status) filter.status = status;

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .populate('lostPostId', 'itemName category city type')
      .populate('foundPostId', 'itemName category city type')
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Match.countDocuments(filter),
  ]);

  res.json({ success: true, data: { matches, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
});

/**
 * GET /api/admin/reports
 */
const getAllReports = asyncHandler(async (req, res) => {
  const { status, reason, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (status) filter.status = status;
  if (reason) filter.reason = reason;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reporterId', 'name email trustScore')
      .populate('assignedModeratorId', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.json({ success: true, data: { reports, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
});

/**
 * GET /api/admin/analytics — see analyticsController
 */

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, entityType, actorId, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (action) filter.action = new RegExp(action, 'i');
  if (entityType) filter.entityType = entityType;
  if (actorId) filter.actorId = actorId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'name role email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: { logs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
});

/**
 * PATCH /api/admin/settings/post-expiry
 */
const updatePostExpirySettings = asyncHandler(async (req, res) => {
  const { expiryDays, warnDays } = req.body;

  // These are runtime settings; store in process.env for this session
  // In production, use a Settings model or config DB collection
  if (expiryDays) process.env.POST_DEFAULT_EXPIRY_DAYS = expiryDays;
  if (warnDays) process.env.POST_EXPIRY_WARN_DAYS = warnDays;

  await auditFromRequest(req, {
    action: 'SETTINGS_UPDATED',
    entityType: 'SYSTEM',
    metadata: { expiryDays, warnDays, updatedBy: req.user._id },
  });

  res.json({
    success: true,
    message: 'Post expiry settings updated.',
    data: { expiryDays: process.env.POST_DEFAULT_EXPIRY_DAYS, warnDays: process.env.POST_EXPIRY_WARN_DAYS },
  });
});

module.exports = {
  getDashboard,
  getUsers,
  getUserById,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  deleteUser,
  getPosts,
  deletePost,
  updatePostStatus,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllClaims,
  getAllMatches,
  getAllReports,
  getAuditLogs,
  updatePostExpirySettings,
};
