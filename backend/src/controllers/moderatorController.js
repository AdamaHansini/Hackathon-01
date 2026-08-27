const Report = require('../models/Report');
const Claim = require('../models/Claim');
const ItemPost = require('../models/ItemPost');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { auditFromRequest } = require('../utils/auditLogger');

/**
 * GET /api/moderator/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const [
    openReportsCount,
    pendingClaimsCount,
    openSuspiciousActivityCount,
    hiddenPostsCount,
    recentReports,
  ] = await Promise.all([
    Report.countDocuments({ status: 'OPEN' }),
    Claim.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),
    SuspiciousActivity.countDocuments({ status: 'OPEN' }),
    ItemPost.countDocuments({ moderationStatus: 'HIDDEN' }),
    Report.find({ status: 'OPEN' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reporterId', 'name')
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        openReportsCount,
        pendingClaimsCount,
        openSuspiciousActivityCount,
        hiddenPostsCount,
      },
      recentReports,
    },
  });
});

/**
 * GET /api/moderator/reports
 */
const getReports = asyncHandler(async (req, res) => {
  const { status = 'OPEN', reason, targetType, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (status) filter.status = status;
  if (reason) filter.reason = reason;
  if (targetType) filter.targetType = targetType;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('reporterId', 'name email avatarUrl trustScore')
      .populate('assignedModeratorId', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      reports,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
  });
});

/**
 * GET /api/moderator/reports/:id
 */
const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('reporterId', 'name email avatarUrl trustScore')
    .populate('assignedModeratorId', 'name role')
    .lean();

  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
  res.json({ success: true, data: { report } });
});

/**
 * PATCH /api/moderator/reports/:id/assign
 */
const assignReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { assignedModeratorId: req.user._id, status: 'IN_REVIEW', assignedAt: new Date() },
    { new: true }
  );

  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
  res.json({ success: true, message: 'Report assigned.', data: { report } });
});

/**
 * PATCH /api/moderator/reports/:id/resolve
 */
const resolveReport = asyncHandler(async (req, res) => {
  const { status, resolution, actionTaken } = req.body;

  const validStatuses = ['RESOLVED', 'DISMISSED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be RESOLVED or DISMISSED.' });
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    {
      status,
      resolution,
      actionTaken,
      resolvedAt: new Date(),
      assignedModeratorId: req.user._id,
    },
    { new: true }
  );

  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

  await auditFromRequest(req, {
    action: 'REPORT_RESOLVED',
    entityType: 'Report',
    entityId: report._id,
    metadata: { status, actionTaken, resolution },
  });

  res.json({ success: true, message: `Report ${status.toLowerCase()}.`, data: { report } });
});

/**
 * GET /api/moderator/claims/pending
 */
const getPendingClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [claims, total] = await Promise.all([
    Claim.find({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } })
      .populate('foundPostId', 'itemName category images city')
      .populate('claimantId', 'name avatarUrl trustScore')
      .populate('foundPostOwnerId', 'name avatarUrl trustScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Claim.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),
  ]);

  res.json({
    success: true,
    data: {
      claims,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
  });
});

/**
 * PATCH /api/moderator/claims/:id/review
 */
const reviewClaim = asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body;

  const validStatuses = ['APPROVED', 'REJECTED', 'UNDER_REVIEW'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const claim = await Claim.findByIdAndUpdate(
    req.params.id,
    { status, reviewNotes, reviewerId: req.user._id, reviewedAt: new Date() },
    { new: true }
  );

  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  await auditFromRequest(req, {
    action: `CLAIM_${status}_BY_MODERATOR`,
    entityType: 'Claim',
    entityId: claim._id,
    metadata: { reviewedBy: req.user._id, status, reviewNotes },
  });

  res.json({ success: true, message: `Claim ${status.toLowerCase()} by moderator.`, data: { claim } });
});

/**
 * GET /api/moderator/suspicious-activity
 */
const getSuspiciousActivity = asyncHandler(async (req, res) => {
  const { status = 'OPEN', severity, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;

  const [activities, total] = await Promise.all([
    SuspiciousActivity.find(filter)
      .populate('userId', 'name email avatarUrl trustScore')
      .populate('reviewedBy', 'name role')
      .sort({ severity: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    SuspiciousActivity.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      activities,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
  });
});

/**
 * PATCH /api/moderator/suspicious-activity/:id/review
 */
const reviewSuspiciousActivity = asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body;

  const activity = await SuspiciousActivity.findByIdAndUpdate(
    req.params.id,
    { status, reviewNotes, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );

  if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

  await auditFromRequest(req, {
    action: 'SUSPICIOUS_ACTIVITY_REVIEWED',
    entityType: 'SuspiciousActivity',
    entityId: activity._id,
    metadata: { status },
  });

  res.json({ success: true, message: 'Suspicious activity reviewed.', data: { activity } });
});

/**
 * PATCH /api/moderator/posts/:id/hide
 */
const hidePost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findByIdAndUpdate(
    req.params.id,
    { moderationStatus: 'HIDDEN', isFlagged: true, moderationNote: req.body.reason || null },
    { new: true }
  );

  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  await auditFromRequest(req, {
    action: 'POST_HIDDEN',
    entityType: 'ItemPost',
    entityId: post._id,
    metadata: { reason: req.body.reason },
  });

  res.json({ success: true, message: 'Post hidden.', data: { post } });
});

/**
 * PATCH /api/moderator/posts/:id/restore
 */
const restorePost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findByIdAndUpdate(
    req.params.id,
    { moderationStatus: 'APPROVED', isFlagged: false, moderationNote: null },
    { new: true }
  );

  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  await auditFromRequest(req, {
    action: 'POST_RESTORED',
    entityType: 'ItemPost',
    entityId: post._id,
  });

  res.json({ success: true, message: 'Post restored.', data: { post } });
});

/**
 * GET /api/moderator/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entityType, actorId } = req.query;
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

  res.json({
    success: true,
    data: {
      logs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
  });
});

module.exports = {
  getDashboard,
  getReports,
  getReportById,
  assignReport,
  resolveReport,
  getPendingClaims,
  reviewClaim,
  getSuspiciousActivity,
  reviewSuspiciousActivity,
  hidePost,
  restorePost,
  getAuditLogs,
};
