const ItemPost = require('../models/ItemPost');
const VerificationQuestion = require('../models/VerificationQuestion');
const Match = require('../models/Match');
const Claim = require('../models/Claim');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { uploadItemImage, deleteManyFromCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const { runSmartMatch } = require('../services/matchingService');
const { hashVerificationAnswer } = require('../services/verificationService');
const { checkDuplicatePosts } = require('../services/suspiciousActivityService');
const { auditFromRequest } = require('../utils/auditLogger');
const { env } = require('../config/env');

const EXPIRY_DAYS = env.POST_DEFAULT_EXPIRY_DAYS || 30;

// ─── Post CRUD ────────────────────────────────────────────────────────────────

/**
 * POST /api/posts
 */
const createPost = asyncHandler(async (req, res) => {
  const {
    type, itemName, category, publicDescription,
    privateIdentifyingDetails, color, brand,
    publicCharacteristics, privateCharacteristics,
    lostOrFoundDate, lostOrFoundTime,
    locationName, city, approximateCoordinates,
    visibility,
  } = req.body;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

  // Duplicate check (suspicious activity)
  await checkDuplicatePosts(req.user._id, itemName, category);

  const post = await ItemPost.create({
    userId: req.user._id,
    type,
    itemName,
    category,
    publicDescription,
    privateIdentifyingDetails,
    color,
    brand,
    publicCharacteristics: publicCharacteristics || [],
    privateCharacteristics: privateCharacteristics || [],
    lostOrFoundDate: new Date(lostOrFoundDate),
    lostOrFoundTime,
    locationName,
    city: city ? city.toLowerCase().trim() : undefined,
    approximateCoordinates,
    visibility: visibility || 'PUBLIC',
    expiresAt,
  });

  await auditFromRequest(req, {
    action: 'POST_CREATED',
    entityType: 'ItemPost',
    entityId: post._id,
    metadata: { type, category, itemName },
  });

  // Run Smart Match asynchronously (non-blocking)
  setImmediate(() => {
    runSmartMatch(post._id).catch((err) =>
      console.error('⚠️  Post-create match error:', err.message)
    );
  });

  res.status(201).json({
    success: true,
    message: `${type === 'LOST' ? 'Lost' : 'Found'} item post created. Smart Match is running.`,
    data: { post },
  });
});

/**
 * GET /api/posts
 */
const listPosts = asyncHandler(async (req, res) => {
  const {
    type, category, status = 'ACTIVE',
    city, page = 1, limit = 12, sort = '-createdAt',
  } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (city) filter.city = city.toLowerCase();
  filter.visibility = 'PUBLIC';
  filter.moderationStatus = 'APPROVED';

  const skip = (Number(page) - 1) * Number(limit);

  const [posts, total] = await Promise.all([
    ItemPost.find(filter)
      .select('-privateIdentifyingDetails -privateCharacteristics')
      .populate('userId', 'name avatarUrl trustScore city')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ItemPost.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

/**
 * GET /api/posts/:id
 */
const getPost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id)
    .select('-privateIdentifyingDetails -privateCharacteristics')
    .populate('userId', 'name avatarUrl trustScore city');

  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  // Check visibility
  const isOwner = req.user && post.userId._id.toString() === req.user._id.toString();
  const isModerator = req.user && ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (post.visibility !== 'PUBLIC' && !isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'This post is private.' });
  }

  if (post.moderationStatus === 'HIDDEN' && !isModerator) {
    return res.status(404).json({ success: false, message: 'Post not found.' });
  }

  res.json({ success: true, data: { post } });
});

/**
 * PATCH /api/posts/:id
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const allowedUpdates = [
    'itemName', 'category', 'publicDescription', 'privateIdentifyingDetails',
    'color', 'brand', 'publicCharacteristics', 'privateCharacteristics',
    'lostOrFoundDate', 'lostOrFoundTime', 'locationName', 'city',
    'approximateCoordinates', 'visibility', 'status',
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (updates.city) updates.city = updates.city.toLowerCase().trim();

  const updated = await ItemPost.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select('-privateIdentifyingDetails -privateCharacteristics');

  await auditFromRequest(req, {
    action: 'POST_UPDATED',
    entityType: 'ItemPost',
    entityId: post._id,
    metadata: { updatedFields: Object.keys(updates) },
  });

  // Re-run Smart Match if public description or location changed
  if (updates.publicDescription || updates.city || updates.approximateCoordinates) {
    setImmediate(() => {
      runSmartMatch(post._id).catch(() => {});
    });
  }

  res.json({ success: true, message: 'Post updated.', data: { post: updated } });
});

/**
 * DELETE /api/posts/:id
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  // Delete all Cloudinary images
  const publicIds = post.images.map((img) => img.publicId).filter(Boolean);
  await deleteManyFromCloudinary(publicIds);

  await ItemPost.findByIdAndDelete(req.params.id);

  await auditFromRequest(req, {
    action: 'POST_DELETED',
    entityType: 'ItemPost',
    entityId: post._id,
    metadata: { itemName: post.itemName, deletedBy: req.user.role },
  });

  res.json({ success: true, message: 'Post deleted.' });
});

// ─── Image management ─────────────────────────────────────────────────────────

/**
 * POST /api/posts/:id/images
 */
const uploadImages = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No images provided.' });
  }

  const totalImages = post.images.length + req.files.length;
  if (totalImages > 5) {
    return res.status(400).json({ success: false, message: 'Maximum 5 images per post.' });
  }

  const uploadedImages = await Promise.all(
    req.files.map((file, idx) => uploadItemImage(file.buffer, post._id))
  );

  const newImages = uploadedImages.map((img, idx) => ({
    url: img.url,
    publicId: img.publicId,
    isPrimary: post.images.length === 0 && idx === 0,
  }));

  const updated = await ItemPost.findByIdAndUpdate(
    req.params.id,
    { $push: { images: { $each: newImages } } },
    { new: true }
  ).select('-privateIdentifyingDetails -privateCharacteristics');

  res.json({ success: true, message: 'Images uploaded.', data: { post: updated } });
});

/**
 * DELETE /api/posts/:id/images/:imageId
 */
const deleteImage = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const image = post.images.id(req.params.imageId);
  if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });

  await deleteFromCloudinary(image.publicId);

  await ItemPost.findByIdAndUpdate(req.params.id, {
    $pull: { images: { _id: req.params.imageId } },
  });

  res.json({ success: true, message: 'Image deleted.' });
});

// ─── Post lifecycle ───────────────────────────────────────────────────────────

/**
 * POST /api/posts/:id/renew
 */
const renewPost = asyncHandler(async (req, res) => {
  const { renewPost: doRenew } = require('../services/expiryService');
  const post = await doRenew(req.params.id, req.user._id);
  res.json({ success: true, message: 'Post renewed for 30 days.', data: { post } });
});

/**
 * POST /api/posts/:id/cancel
 */
const cancelPost = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await ItemPost.findByIdAndUpdate(req.params.id, { status: 'CANCELLED' });

  await auditFromRequest(req, {
    action: 'POST_CANCELLED',
    entityType: 'ItemPost',
    entityId: post._id,
  });

  res.json({ success: true, message: 'Post cancelled.' });
});

/**
 * POST /api/posts/:id/mark-returned
 */
const markReturned = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await ItemPost.findByIdAndUpdate(req.params.id, {
    status: 'RETURNED',
    returnedAt: new Date(),
  });

  await auditFromRequest(req, {
    action: 'POST_MARKED_RETURNED',
    entityType: 'ItemPost',
    entityId: post._id,
  });

  res.json({ success: true, message: 'Item marked as returned.' });
});

// ─── Post-related resources ───────────────────────────────────────────────────

/**
 * GET /api/posts/:id/matches
 */
const getPostMatches = asyncHandler(async (req, res) => {
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
    status: { $nin: ['DISMISSED'] },
    confidenceLevel: { $in: ['MEDIUM', 'HIGH'] },
  })
    .populate('lostPostId', 'itemName category city lostOrFoundDate images status type')
    .populate('foundPostId', 'itemName category city lostOrFoundDate images status type')
    .sort({ score: -1 })
    .lean();

  res.json({ success: true, data: { matches } });
});

/**
 * GET /api/posts/:id/claims
 */
const getPostClaims = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);
  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const claims = await Claim.find({ foundPostId: post._id })
    .populate('claimantId', 'name avatarUrl trustScore')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: { claims } });
});

// ─── Verification Questions ───────────────────────────────────────────────────

/**
 * POST /api/posts/:id/verification-questions
 */
const addVerificationQuestion = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  if (post.type !== 'LOST') {
    return res.status(400).json({ success: false, message: 'Verification questions are only for LOST posts.' });
  }

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const existing = await VerificationQuestion.countDocuments({
    lostPostId: post._id,
    isActive: true,
  });

  if (existing >= 3) {
    return res.status(400).json({ success: false, message: 'Maximum 3 verification questions allowed.' });
  }

  const { question, answer } = req.body;
  const answerHash = await hashVerificationAnswer(answer);

  const vq = await VerificationQuestion.create({
    lostPostId: post._id,
    createdBy: req.user._id,
    question,
    answerHash,
    order: existing,
  });

  res.status(201).json({
    success: true,
    message: 'Verification question added.',
    data: { question: { _id: vq._id, question: vq.question, order: vq.order } },
  });
});

/**
 * GET /api/posts/:id/verification-questions
 */
const getVerificationQuestions = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

  const isOwner = post.userId.toString() === req.user._id.toString();
  const isModerator = ['MODERATOR', 'ADMIN'].includes(req.user.role);

  const questions = await VerificationQuestion.find({
    lostPostId: post._id,
    isActive: true,
  })
    .select('_id question order isActive')
    .sort({ order: 1 })
    .lean();

  const count = questions.length;

  // Owners/moderators see all details; claimants only see the count and questions (no answers)
  res.json({
    success: true,
    data: {
      questions,
      count,
      hasQuestions: count > 0,
      isOwner,
    },
  });
});

/**
 * PATCH /api/posts/:id/verification-questions/:questionId
 */
const updateVerificationQuestion = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post || post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const vq = await VerificationQuestion.findOne({
    _id: req.params.questionId,
    lostPostId: post._id,
  });

  if (!vq) return res.status(404).json({ success: false, message: 'Question not found.' });

  if (req.body.question) vq.question = req.body.question;
  if (req.body.answer) vq.answerHash = await hashVerificationAnswer(req.body.answer);
  if (req.body.isActive !== undefined) vq.isActive = req.body.isActive;

  await vq.save();

  res.json({
    success: true,
    message: 'Question updated.',
    data: { question: { _id: vq._id, question: vq.question, order: vq.order } },
  });
});

/**
 * DELETE /api/posts/:id/verification-questions/:questionId
 */
const deleteVerificationQuestion = asyncHandler(async (req, res) => {
  const post = await ItemPost.findById(req.params.id);
  if (!post || post.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await VerificationQuestion.findOneAndUpdate(
    { _id: req.params.questionId, lostPostId: post._id },
    { isActive: false }
  );

  res.json({ success: true, message: 'Question removed.' });
});

module.exports = {
  createPost,
  listPosts,
  getPost,
  updatePost,
  deletePost,
  uploadImages,
  deleteImage,
  renewPost,
  cancelPost,
  markReturned,
  getPostMatches,
  getPostClaims,
  addVerificationQuestion,
  getVerificationQuestions,
  updateVerificationQuestion,
  deleteVerificationQuestion,
};
