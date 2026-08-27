const ItemPost = require('../models/ItemPost');
const Match = require('../models/Match');
const User = require('../models/User');
const Claim = require('../models/Claim');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * GET /api/analytics/platform
 */
const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [
    totalPosts,
    totalLostPosts,
    totalFoundPosts,
    returnedPosts,
    activeUsers,
    totalMatches,
    highConfidenceMatches,
  ] = await Promise.all([
    ItemPost.countDocuments(),
    ItemPost.countDocuments({ type: 'LOST' }),
    ItemPost.countDocuments({ type: 'FOUND' }),
    ItemPost.countDocuments({ status: 'RETURNED' }),
    User.countDocuments({ accountStatus: 'ACTIVE' }),
    Match.countDocuments(),
    Match.countDocuments({ confidenceLevel: 'HIGH' }),
  ]);

  const recoveryRate = totalPosts > 0 ? ((returnedPosts / totalPosts) * 100).toFixed(1) : '0.0';

  // Posts created per day over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const postsPerDay = await ItemPost.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      totals: { totalPosts, totalLostPosts, totalFoundPosts, returnedPosts, activeUsers, totalMatches, highConfidenceMatches },
      recoveryRate,
      postsPerDay,
    },
  });
});

/**
 * GET /api/analytics/user/me
 */
const getUserAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    totalPosts,
    lostPosts,
    foundPosts,
    totalClaims,
    approvedClaims,
    potentialMatches,
  ] = await Promise.all([
    ItemPost.countDocuments({ userId }),
    ItemPost.countDocuments({ userId, type: 'LOST' }),
    ItemPost.countDocuments({ userId, type: 'FOUND' }),
    Claim.countDocuments({ $or: [{ claimantId: userId }, { foundPostOwnerId: userId }] }),
    Claim.countDocuments({ $or: [{ claimantId: userId }, { foundPostOwnerId: userId }], status: 'APPROVED' }),
    Match.countDocuments({
      $or: [
        { lostPostId: { $in: await ItemPost.find({ userId, type: 'LOST' }).distinct('_id') } },
        { foundPostId: { $in: await ItemPost.find({ userId, type: 'FOUND' }).distinct('_id') } },
      ],
      confidenceLevel: { $in: ['MEDIUM', 'HIGH'] },
    }),
  ]);

  const user = await User.findById(userId).select('trustScore successfulReturnsCount recoveredItemsCount');

  res.json({
    success: true,
    data: {
      posts: { total: totalPosts, lost: lostPosts, found: foundPosts },
      claims: { total: totalClaims, approved: approvedClaims },
      matches: { potential: potentialMatches },
      trust: {
        score: user.trustScore,
        successfulReturns: user.successfulReturnsCount,
        itemsRecovered: user.recoveredItemsCount,
      },
    },
  });
});

/**
 * GET /api/analytics/recovery-rate
 */
const getRecoveryRate = asyncHandler(async (req, res) => {
  const { category, city, dateFrom, dateTo } = req.query;

  const matchStage = {};
  if (category) matchStage.category = category;
  if (city) matchStage.city = city.toLowerCase();
  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }

  const stats = await ItemPost.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        returned: { $sum: { $cond: [{ $eq: ['$status', 'RETURNED'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
        matched: { $sum: { $cond: [{ $eq: ['$status', 'MATCHED'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } },
      },
    },
    {
      $project: {
        total: 1,
        returned: 1,
        active: 1,
        matched: 1,
        expired: 1,
        recoveryRate: { $multiply: [{ $divide: ['$returned', { $max: ['$total', 1] }] }, 100] },
      },
    },
  ]);

  res.json({ success: true, data: { stats: stats[0] || { total: 0, returned: 0, recoveryRate: 0 } } });
});

/**
 * GET /api/analytics/category-stats
 */
const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await ItemPost.aggregate([
    { $match: { visibility: 'PUBLIC' } },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        lost: { $sum: { $cond: [{ $eq: ['$type', 'LOST'] }, 1, 0] } },
        found: { $sum: { $cond: [{ $eq: ['$type', 'FOUND'] }, 1, 0] } },
        returned: { $sum: { $cond: [{ $eq: ['$status', 'RETURNED'] }, 1, 0] } },
      },
    },
    {
      $project: {
        category: '$_id',
        total: 1,
        lost: 1,
        found: 1,
        returned: 1,
        recoveryRate: { $multiply: [{ $divide: ['$returned', { $max: ['$total', 1] }] }, 100] },
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.json({ success: true, data: { categories: stats } });
});

/**
 * GET /api/analytics/match-performance
 */
const getMatchPerformance = asyncHandler(async (req, res) => {
  const stats = await Match.aggregate([
    {
      $group: {
        _id: '$confidenceLevel',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
        claimStarted: { $sum: { $cond: [{ $eq: ['$status', 'CLAIM_STARTED'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
      },
    },
  ]);

  const totalMatches = stats.reduce((acc, s) => acc + s.count, 0);

  res.json({ success: true, data: { matchPerformance: stats, totalMatches } });
});

module.exports = {
  getPlatformAnalytics,
  getUserAnalytics,
  getRecoveryRate,
  getCategoryStats,
  getMatchPerformance,
};
