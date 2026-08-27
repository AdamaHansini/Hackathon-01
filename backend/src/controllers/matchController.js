const Match = require('../models/Match');
const ItemPost = require('../models/ItemPost');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { runSmartMatch } = require('../services/matchingService');
const { auditFromRequest } = require('../utils/auditLogger');

/**
 * GET /api/matches
 */
const listMatches = asyncHandler(async (req, res) => {
  const { confidenceLevel, status, page = 1, limit = 10 } = req.query;

  const userId = req.user._id;
  const myPostIds = await ItemPost.find({ userId }).distinct('_id');

  const filter = {
    $or: [
      { lostPostId: { $in: myPostIds } },
      { foundPostId: { $in: myPostIds } },
    ],
  };

  if (confidenceLevel) filter.confidenceLevel = confidenceLevel;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

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
    data: {
      matches,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
  });
});

/**
 * GET /api/matches/:id
 */
const getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('lostPostId', '-privateIdentifyingDetails -privateCharacteristics')
    .populate('foundPostId', '-privateIdentifyingDetails -privateCharacteristics')
    .lean();

  if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

  // Access check: only post owners or moderators
  const userId = req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);
  const lostOwner = match.lostPostId?.userId?.toString();
  const foundOwner = match.foundPostId?.userId?.toString();

  if (!isModerator && userId !== lostOwner && userId !== foundOwner) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  res.json({ success: true, data: { match } });
});

/**
 * POST /api/matches/:id/viewed
 */
const markViewed = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('lostPostId', 'userId')
    .populate('foundPostId', 'userId');

  if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

  const userId = req.user._id.toString();
  const updates = { status: 'VIEWED' };

  if (match.lostPostId?.userId?.toString() === userId) updates.viewedByLostUser = true;
  if (match.foundPostId?.userId?.toString() === userId) updates.viewedByFoundUser = true;

  await Match.findByIdAndUpdate(req.params.id, updates);

  res.json({ success: true, message: 'Match marked as viewed.' });
});

/**
 * POST /api/matches/:id/dismiss
 */
const dismissMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate('lostPostId', 'userId')
    .populate('foundPostId', 'userId');

  if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

  const userId = req.user._id.toString();
  const lostOwner = match.lostPostId?.userId?.toString();
  const foundOwner = match.foundPostId?.userId?.toString();

  if (userId !== lostOwner && userId !== foundOwner) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await Match.findByIdAndUpdate(req.params.id, {
    status: 'DISMISSED',
    dismissedBy: req.user._id,
    dismissedAt: new Date(),
  });

  res.json({ success: true, message: 'Match dismissed.' });
});

/**
 * POST /api/matches/:id/refresh
 */
const refreshMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

  await runSmartMatch(match.lostPostId);

  const updatedMatch = await Match.findById(req.params.id)
    .populate('lostPostId', '-privateIdentifyingDetails -privateCharacteristics')
    .populate('foundPostId', '-privateIdentifyingDetails -privateCharacteristics');

  res.json({ success: true, message: 'Match refreshed.', data: { match: updatedMatch } });
});

/**
 * GET /api/posts/:id/smart-matches
 */
const getSmartMatches = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);
  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const query =
    post.type === 'LOST'
      ? { lostPostId: post._id }
      : { foundPostId: post._id };

  const matches = await Match.find({
    ...query,
    confidenceLevel: { $in: ['MEDIUM', 'HIGH'] },
    status: { $ne: 'DISMISSED' },
  })
    .populate('lostPostId', '-privateIdentifyingDetails -privateCharacteristics')
    .populate('foundPostId', '-privateIdentifyingDetails -privateCharacteristics')
    .sort({ score: -1 })
    .lean();

  res.json({ success: true, data: { matches, total: matches.length } });
});

/**
 * POST /api/posts/:id/run-smart-match
 */
const runSmartMatchForPost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);
  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const matches = await runSmartMatch(post._id);

  res.json({
    success: true,
    message: `Smart Match completed. Found ${matches.length} potential matches.`,
    data: { matchesFound: matches.length },
  });
});

module.exports = {
  listMatches,
  getMatch,
  markViewed,
  dismissMatch,
  refreshMatch,
  getSmartMatches,
  runSmartMatchForPost,
};
