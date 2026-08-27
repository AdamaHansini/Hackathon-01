const Claim = require('../models/Claim');
const ItemPost = require('../models/ItemPost');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { verifyAnswers, isAttemptLimitExceeded } = require('../services/verificationService');
const {
  notifyClaimCreated, notifyClaimApproved, notifyClaimRejected, notifyClaimMoreInfo,
  notifyItemReturned,
} = require('../services/notificationService');
const { checkExcessiveClaims, checkFailedVerifications } = require('../services/suspiciousActivityService');
const { onSuccessfulReturn, onItemRecovered, onFailedClaimAttempt } = require('../services/trustScoreService');
const { auditFromRequest } = require('../utils/auditLogger');

/**
 * POST /api/claims
 */
const createClaim = asyncHandler(async (req, res) => {
  const { foundPostId, relatedLostPostId, matchId, claimMessage } = req.body;

  // Check excessive claims (suspicious activity)
  await checkExcessiveClaims(req.user._id);

  const foundPost = await ItemPost.findById(foundPostId);
  if (!foundPost || foundPost.type !== 'FOUND') {
    return res.status(404).json({ success: false, message: 'Found post not found.' });
  }

  if (!['ACTIVE', 'MATCHED', 'CLAIMED'].includes(foundPost.status)) {
    return res.status(400).json({ success: false, message: 'This item is no longer available to claim.' });
  }

  if (foundPost.userId.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot claim your own post.' });
  }

  // Check attempt limit
  const limitExceeded = await isAttemptLimitExceeded(foundPostId, req.user._id);
  if (limitExceeded) {
    return res.status(429).json({
      success: false,
      message: 'You have exceeded the maximum claim attempts for this item in the last 24 hours.',
    });
  }

  // Check existing active claim
  const existingClaim = await Claim.findOne({
    foundPostId,
    claimantId: req.user._id,
    status: { $nin: ['CANCELLED', 'REJECTED'] },
  });

  if (existingClaim) {
    return res.status(409).json({ success: false, message: 'You already have an active claim for this item.' });
  }

  // Count existing attempts
  const previousAttempts = await Claim.countDocuments({
    foundPostId,
    claimantId: req.user._id,
  });

  const claim = await Claim.create({
    matchId: matchId || null,
    foundPostId,
    relatedLostPostId: relatedLostPostId || null,
    claimantId: req.user._id,
    foundPostOwnerId: foundPost.userId,
    claimMessage,
    attemptNumber: previousAttempts + 1,
    status: 'PENDING',
  });

  // Update post status
  await ItemPost.findByIdAndUpdate(foundPostId, { status: 'CLAIMED' });

  // Update match status if applicable
  if (matchId) {
    await Match.findByIdAndUpdate(matchId, { status: 'CLAIM_STARTED' });
  }

  await notifyClaimCreated(claim, foundPost);

  await auditFromRequest(req, {
    action: 'CLAIM_CREATED',
    entityType: 'Claim',
    entityId: claim._id,
    metadata: { foundPostId, claimantId: req.user._id },
  });

  res.status(201).json({
    success: true,
    message: 'Claim submitted. Please answer the verification questions to proceed.',
    data: { claim },
  });
});

/**
 * GET /api/claims
 */
const listClaims = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, role } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};

  if (role === 'claimant') {
    filter.claimantId = req.user._id;
  } else if (role === 'owner') {
    filter.foundPostOwnerId = req.user._id;
  } else {
    filter.$or = [{ claimantId: req.user._id }, { foundPostOwnerId: req.user._id }];
  }

  if (status) filter.status = status;

  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .populate('foundPostId', 'itemName category images city type status')
      .populate('relatedLostPostId', 'itemName category city')
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
    data: { claims, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } },
  });
});

/**
 * GET /api/claims/:id
 */
const getClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id)
    .populate('foundPostId', '-privateIdentifyingDetails -privateCharacteristics')
    .populate('relatedLostPostId', 'itemName category city')
    .populate('claimantId', 'name avatarUrl trustScore email city')
    .populate('foundPostOwnerId', 'name avatarUrl trustScore')
    .populate('reviewerId', 'name role')
    .lean();

  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  const userId = req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);
  const isParticipant =
    userId === claim.claimantId?._id?.toString() ||
    userId === claim.foundPostOwnerId?._id?.toString();

  if (!isParticipant && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  // Strip verification answers details from claimant
  if (userId === claim.claimantId?._id?.toString() && !isModerator) {
    delete claim.verificationAnswers;
  }

  res.json({ success: true, data: { claim } });
});

/**
 * POST /api/claims/:id/verify
 */
const verifyClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  if (claim.claimantId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  if (claim.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Claim is already ${claim.status}.` });
  }

  const { answers } = req.body;

  // Get the related lost post's verification questions
  const lostPostId = claim.relatedLostPostId;

  const { passed, correctCount, totalQuestions, results, autoPass } = await verifyAnswers(
    lostPostId,
    answers
  );

  // Track failed attempts for suspicious activity
  if (!passed) {
    await checkFailedVerifications(req.user._id, claim.foundPostId);
    await onFailedClaimAttempt(req.user._id);
  }

  const updatedClaim = await Claim.findByIdAndUpdate(
    claim._id,
    {
      verificationAnswers: results,
      correctAnswersCount: correctCount,
      totalQuestions,
      verificationPassed: passed,
      status: passed ? 'UNDER_REVIEW' : 'PENDING',
    },
    { new: true }
  );

  await auditFromRequest(req, {
    action: 'CLAIM_VERIFIED',
    entityType: 'Claim',
    entityId: claim._id,
    metadata: { passed, correctCount, totalQuestions, autoPass },
  });

  if (passed) {
    res.json({
      success: true,
      message: autoPass
        ? 'No verification required. Claim submitted for review.'
        : `Verification passed (${correctCount}/${totalQuestions} correct). Claim is now under review.`,
      data: { claim: updatedClaim },
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Verification failed. Minimum ${Math.min(2, totalQuestions)} correct answers required. Please try again.`,
      data: { correctCount, totalQuestions, claim: updatedClaim },
    });
  }
});

/**
 * POST /api/claims/:id/cancel
 */
const cancelClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  const isClaimant = claim.claimantId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isClaimant && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  if (['COMPLETED', 'CANCELLED'].includes(claim.status)) {
    return res.status(400).json({ success: false, message: 'Claim cannot be cancelled.' });
  }

  await Claim.findByIdAndUpdate(claim._id, {
    status: 'CANCELLED',
    cancelledAt: new Date(),
    cancelReason: req.body.reason || null,
  });

  // Revert post status if no other active claims
  const otherClaims = await Claim.countDocuments({
    foundPostId: claim.foundPostId,
    status: { $nin: ['CANCELLED', 'REJECTED'] },
    _id: { $ne: claim._id },
  });

  if (otherClaims === 0) {
    await ItemPost.findByIdAndUpdate(claim.foundPostId, { status: 'ACTIVE' });
  }

  res.json({ success: true, message: 'Claim cancelled.' });
});

/**
 * POST /api/claims/:id/approve
 */
const approveClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  const isFoundPostOwner = claim.foundPostOwnerId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isFoundPostOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Only the finder or a moderator can approve claims.' });
  }

  if (!['PENDING', 'UNDER_REVIEW'].includes(claim.status)) {
    return res.status(400).json({ success: false, message: `Claim cannot be approved from status: ${claim.status}` });
  }

  const updatedClaim = await Claim.findByIdAndUpdate(
    claim._id,
    {
      status: 'APPROVED',
      reviewerId: req.user._id,
      reviewedAt: new Date(),
      reviewNotes: req.body.notes || null,
    },
    { new: true }
  );

  // Create private conversation
  const existingConv = await Conversation.findOne({ claimId: claim._id });
  let conversation = existingConv;
  if (!existingConv) {
    conversation = await Conversation.create({
      claimId: claim._id,
      participantIds: [claim.claimantId, claim.foundPostOwnerId],
    });
  }

  // Update post status to VERIFIED
  await ItemPost.findByIdAndUpdate(claim.foundPostId, { status: 'VERIFIED' });

  // Reject all other claims for this found post
  await Claim.updateMany(
    {
      foundPostId: claim.foundPostId,
      _id: { $ne: claim._id },
      status: { $nin: ['CANCELLED', 'REJECTED', 'COMPLETED'] },
    },
    { status: 'REJECTED', reviewNotes: 'Another claim was approved.' }
  );

  const foundPost = await ItemPost.findById(claim.foundPostId);
  await notifyClaimApproved(updatedClaim, foundPost);

  await auditFromRequest(req, {
    action: 'CLAIM_APPROVED',
    entityType: 'Claim',
    entityId: claim._id,
    metadata: { approvedBy: req.user._id, approvedRole: req.user.role },
  });

  res.json({
    success: true,
    message: 'Claim approved. A private chat has been opened.',
    data: { claim: updatedClaim, conversationId: conversation._id },
  });
});

/**
 * POST /api/claims/:id/reject
 */
const rejectClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  const isFoundPostOwner = claim.foundPostOwnerId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isFoundPostOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(claim.status)) {
    return res.status(400).json({ success: false, message: 'Claim cannot be rejected.' });
  }

  const updatedClaim = await Claim.findByIdAndUpdate(
    claim._id,
    {
      status: 'REJECTED',
      reviewerId: req.user._id,
      reviewedAt: new Date(),
      reviewNotes: req.body.notes || null,
    },
    { new: true }
  );

  const foundPost = await ItemPost.findById(claim.foundPostId);
  await notifyClaimRejected(updatedClaim, foundPost);

  // Check if any other active claims exist; if not, revert post to ACTIVE
  const otherClaims = await Claim.countDocuments({
    foundPostId: claim.foundPostId,
    status: { $nin: ['CANCELLED', 'REJECTED', 'COMPLETED'] },
  });

  if (otherClaims === 0) {
    await ItemPost.findByIdAndUpdate(claim.foundPostId, { status: 'ACTIVE' });
  }

  await auditFromRequest(req, {
    action: 'CLAIM_REJECTED',
    entityType: 'Claim',
    entityId: claim._id,
    metadata: { rejectedBy: req.user._id },
  });

  res.json({ success: true, message: 'Claim rejected.', data: { claim: updatedClaim } });
});

/**
 * POST /api/claims/:id/request-more-info
 */
const requestMoreInfo = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  const isFoundPostOwner = claim.foundPostOwnerId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isFoundPostOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { note } = req.body;

  await Claim.findByIdAndUpdate(claim._id, {
    status: 'UNDER_REVIEW',
    moreInfoRequested: true,
    moreInfoNote: note || null,
  });

  const foundPost = await ItemPost.findById(claim.foundPostId);
  await notifyClaimMoreInfo(claim, foundPost);

  res.json({ success: true, message: 'Additional information requested from claimant.' });
});

/**
 * POST /api/claims/:id/complete-handover
 */
const completeHandover = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  if (claim.status !== 'APPROVED') {
    return res.status(400).json({ success: false, message: 'Only approved claims can be completed.' });
  }

  const isParticipant =
    claim.claimantId.toString() === req.user._id.toString() ||
    claim.foundPostOwnerId.toString() === req.user._id.toString();

  if (!isParticipant) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await Claim.findByIdAndUpdate(claim._id, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });

  const foundPost = await ItemPost.findByIdAndUpdate(
    claim.foundPostId,
    { status: 'RETURNED', returnedAt: new Date() },
    { new: true }
  );

  // Update trust scores
  await onSuccessfulReturn(claim.foundPostOwnerId);
  await onItemRecovered(claim.claimantId);

  // Notify both users
  await notifyItemReturned(claim.claimantId, foundPost);
  await notifyItemReturned(claim.foundPostOwnerId, foundPost);

  // Close conversation
  await Conversation.findOneAndUpdate({ claimId: claim._id }, { isActive: false });

  await auditFromRequest(req, {
    action: 'HANDOVER_COMPLETED',
    entityType: 'Claim',
    entityId: claim._id,
    metadata: { completedBy: req.user._id },
  });

  res.json({ success: true, message: '🎉 Item returned successfully! Trust scores updated.' });
});

/**
 * PATCH /api/claims/:id/handover-details
 */
const updateHandoverDetails = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  if (claim.status !== 'APPROVED') {
    return res.status(400).json({ success: false, message: 'Can only update handover details for approved claims.' });
  }

  const isParticipant =
    claim.claimantId.toString() === req.user._id.toString() ||
    claim.foundPostOwnerId.toString() === req.user._id.toString();

  if (!isParticipant) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { handoverLocation, handoverTime } = req.body;

  const updated = await Claim.findByIdAndUpdate(
    claim._id,
    {
      ...(handoverLocation && { handoverLocation }),
      ...(handoverTime && { handoverTime: new Date(handoverTime) }),
    },
    { new: true }
  );

  res.json({ success: true, message: 'Handover details updated.', data: { claim: updated } });
});

module.exports = {
  createClaim,
  listClaims,
  getClaim,
  verifyClaim,
  cancelClaim,
  approveClaim,
  rejectClaim,
  requestMoreInfo,
  completeHandover,
  updateHandoverDetails,
};
