const Report = require('../models/Report');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { checkRepeatedReports } = require('../services/suspiciousActivityService');
const { onReportAgainst } = require('../services/trustScoreService');
const { auditFromRequest } = require('../utils/auditLogger');

/**
 * POST /api/reports
 */
const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;

  // Check if already reported this target by this user
  const existing = await Report.findOne({
    reporterId: req.user._id,
    targetId,
    targetType,
    status: { $ne: 'DISMISSED' },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'You have already reported this item.',
    });
  }

  const report = await Report.create({
    reporterId: req.user._id,
    targetType,
    targetId,
    reason,
    details,
  });

  // If reporting a user, check if they have too many reports
  if (targetType === 'USER') {
    await checkRepeatedReports(targetId);
    await onReportAgainst(targetId);
  }

  await auditFromRequest(req, {
    action: 'REPORT_CREATED',
    entityType: 'Report',
    entityId: report._id,
    metadata: { targetType, targetId, reason },
  });

  res.status(201).json({
    success: true,
    message: 'Report submitted. Our moderation team will review it.',
    data: { reportId: report._id },
  });
});

/**
 * GET /api/reports/my-reports
 */
const getMyReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    Report.find({ reporterId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Report.countDocuments({ reporterId: req.user._id }),
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
 * GET /api/reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('reporterId', 'name avatarUrl')
    .populate('assignedModeratorId', 'name avatarUrl role')
    .lean();

  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

  const isOwner = report.reporterId._id.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  res.json({ success: true, data: { report } });
});

/**
 * PATCH /api/reports/:id/cancel
 */
const cancelReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id, reporterId: req.user._id });
  if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

  if (report.status !== 'OPEN') {
    return res.status(400).json({ success: false, message: 'Only OPEN reports can be cancelled.' });
  }

  await Report.findByIdAndUpdate(report._id, {
    status: 'DISMISSED',
    cancelledAt: new Date(),
    resolution: 'Cancelled by reporter.',
  });

  res.json({ success: true, message: 'Report cancelled.' });
});

module.exports = { createReport, getMyReports, getReport, cancelReport };
