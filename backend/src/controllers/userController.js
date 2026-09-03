const User = require('../models/User');
const ItemPost = require('../models/ItemPost');
const Claim = require('../models/Claim');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { uploadAvatarImage, deleteFromCloudinary } = require('../services/cloudinaryService');
const { auditFromRequest } = require('../utils/auditLogger');

/**
 * GET /api/users/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: { user } });
});

/**
 * PATCH /api/users/me
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, city, phone, notificationPreferences } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (city !== undefined) updates.city = city;
  if (phone !== undefined) updates.phone = phone;
  if (notificationPreferences !== undefined)
    updates.notificationPreferences = notificationPreferences;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

  await auditFromRequest(req, {
    action: 'PROFILE_UPDATED',
    entityType: 'User',
    entityId: user._id,
    metadata: { updatedFields: Object.keys(updates) },
  });

  res.json({ success: true, message: 'Profile updated.', data: { user } });
});

/**
 * PATCH /api/users/me/avatar
 */
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided.' });
  }

  const user = await User.findById(req.user._id).select('+avatarPublicId');

  // Delete old avatar from Cloudinary
  if (user.avatarPublicId) {
    await deleteFromCloudinary(user.avatarPublicId);
  }

  const { url, publicId } = await uploadAvatarImage(req.file.buffer, req.user._id);

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl: url, avatarPublicId: publicId },
    { new: true }
  );

  res.json({ success: true, message: 'Avatar updated.', data: { avatarUrl: updated.avatarUrl } });
});

/**
 * GET /api/users/me/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    lostPostsCount,
    foundPostsCount,
    pendingClaimsCount,
    approvedClaimsCount,
    matchesCount,
    unreadNotificationsCount,
    recentActivity,
  ] = await Promise.all([
    ItemPost.countDocuments({ userId, type: 'LOST', status: { $nin: ['REMOVED', 'DELETED'] } }),
    ItemPost.countDocuments({ userId, type: 'FOUND', status: { $nin: ['REMOVED', 'DELETED'] } }),
    Claim.countDocuments({
      $or: [{ claimantId: userId }, { foundPostOwnerId: userId }],
      status: 'PENDING',
    }),
    Claim.countDocuments({ claimantId: userId, status: 'APPROVED' }),
    Match.countDocuments({
      $or: [
        { lostPostId: { $in: await ItemPost.find({ userId, type: 'LOST' }).distinct('_id') } },
        { foundPostId: { $in: await ItemPost.find({ userId, type: 'FOUND' }).distinct('_id') } },
      ],
      confidenceLevel: { $in: ['MEDIUM', 'HIGH'] },
      status: 'SUGGESTED',
    }),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
    Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const user = await User.findById(userId).select(
    'name trustScore successfulReturnsCount recoveredItemsCount reportsAgainstCount'
  );

  res.json({
    success: true,
    data: {
      user: {
        name: user.name,
        trustScore: user.trustScore,
        successfulReturns: user.successfulReturnsCount,
        itemsRecovered: user.recoveredItemsCount,
        reportsAgainst: user.reportsAgainstCount,
      },
      stats: {
        activeLostPosts: lostPostsCount,
        activeFoundPosts: foundPostsCount,
        pendingClaims: pendingClaimsCount,
        approvedClaimsCount,
        potentialMatches: matchesCount,
        unreadNotificationsCount,
      },
      recentActivity,
    },
  });
});

/**
 * GET /api/users/me/posts
 */
const getMyPosts = asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };
  if (type) filter.type = type;
  if (status) filter.status = status;

  const [posts, total] = await Promise.all([
    ItemPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    ItemPost.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { items: posts, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
  });
});

/**
 * GET /api/users/me/claims
 */
const getMyClaims = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    $or: [{ claimantId: req.user._id }, { foundPostOwnerId: req.user._id }],
  };
  if (status) filter.status = status;

  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .populate('foundPostId', 'itemName category type images status city')
      .populate('claimantId', 'name avatarUrl trustScore')
      .populate('foundPostOwnerId', 'name avatarUrl trustScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Claim.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { claims, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
  });
});

/**
 * GET /api/users/me/matches
 */
const getMyMatches = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user's post IDs
  const myPostIds = await ItemPost.find({ userId }).distinct('_id');

  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    $or: [
      { lostPostId: { $in: myPostIds } },
      { foundPostId: { $in: myPostIds } },
    ],
    confidenceLevel: { $in: ['MEDIUM', 'HIGH'] },
    status: { $nin: ['DISMISSED', 'RESOLVED'] },
  };

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .populate('lostPostId', 'itemName category city lostOrFoundDate images status type userId')
      .populate('foundPostId', 'itemName category city lostOrFoundDate images status type userId')
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Match.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { matches, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
  });
});

/**
 * GET /api/users/me/notifications
 */
const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (page - 1) * limit;

  const filter = { recipientId: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * PATCH /api/users/me/notification-preferences
 */
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { notificationPreferences } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { notificationPreferences },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Notification preferences updated.',
    data: { notificationPreferences: user.notificationPreferences },
  });
});

/**
 * GET /api/users/:id/public-profile
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name avatarUrl city role trustScore successfulReturnsCount recoveredItemsCount createdAt'
  );

  if (!user || user.accountStatus === 'DELETED') {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const postCount = await ItemPost.countDocuments({
    userId: user._id,
    status: { $in: ['ACTIVE', 'MATCHED', 'RETURNED'] },
  });

  res.json({ success: true, data: { user, postCount } });
});

/**
 * GET /api/users/:id/trust-score
 */
const getTrustScore = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'trustScore successfulReturnsCount recoveredItemsCount reportsAgainstCount accountStatus'
  );

  if (!user || user.accountStatus === 'DELETED') {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({
    success: true,
    data: {
      trustScore: user.trustScore,
      successfulReturns: user.successfulReturnsCount,
      itemsRecovered: user.recoveredItemsCount,
      reportsAgainst: user.reportsAgainstCount,
    },
  });
});

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  getDashboard,
  getMyPosts,
  getMyClaims,
  getMyMatches,
  getMyNotifications,
  updateNotificationPreferences,
  getPublicProfile,
  getTrustScore,
};
