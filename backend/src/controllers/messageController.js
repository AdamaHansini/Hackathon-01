const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Claim = require('../models/Claim');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { notifyNewMessage } = require('../services/notificationService');

let io = null;
const setSocketIO = (socketInstance) => { io = socketInstance; };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isParticipant = (conversation, userId) =>
  conversation.participantIds.some((id) => id.toString() === userId.toString());

/**
 * POST /api/conversations/claim/:claimId
 */
const createConversation = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.claimId);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

  if (claim.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: 'A conversation can only be created for an approved claim.',
    });
  }

  const isClaimParticipant =
    claim.claimantId.toString() === req.user._id.toString() ||
    claim.foundPostOwnerId.toString() === req.user._id.toString();

  if (!isClaimParticipant) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const existing = await Conversation.findOne({ claimId: claim._id });
  if (existing) {
    return res.json({ success: true, message: 'Conversation already exists.', data: { conversation: existing } });
  }

  const conversation = await Conversation.create({
    claimId: claim._id,
    participantIds: [claim.claimantId, claim.foundPostOwnerId],
  });

  res.status(201).json({ success: true, message: 'Conversation created.', data: { conversation } });
});

/**
 * GET /api/conversations
 */
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participantIds: req.user._id,
    isActive: true,
  })
    .populate('participantIds', 'name avatarUrl')
    .populate({
      path: 'claimId',
      select: 'status foundPostId',
      populate: { path: 'foundPostId', select: 'itemName category images' },
    })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  res.json({ success: true, data: { conversations } });
});

/**
 * GET /api/conversations/:id
 */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participantIds', 'name avatarUrl trustScore')
    .populate({
      path: 'claimId',
      populate: { path: 'foundPostId', select: 'itemName category images status city' },
    });

  if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });

  if (!isParticipant(conversation, req.user._id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  res.json({ success: true, data: { conversation } });
});

/**
 * GET /api/conversations/:id/messages
 */
const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });

  if (!isParticipant(conversation, req.user._id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [messages, total] = await Promise.all([
    Message.find({
      conversationId: conversation._id,
      isDeleted: false,
    })
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Message.countDocuments({ conversationId: conversation._id, isDeleted: false }),
  ]);

  // Mark unread messages as read
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: req.user._id },
      isRead: false,
    },
    { isRead: true, readAt: new Date() }
  );

  res.json({
    success: true,
    data: {
      messages,
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
 * POST /api/conversations/:id/messages
 */
const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });

  if (!conversation.isActive) {
    return res.status(400).json({ success: false, message: 'This conversation is closed.' });
  }

  if (!isParticipant(conversation, req.user._id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { content, messageType = 'TEXT', handoverProposal } = req.body;

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: req.user._id,
    content,
    messageType,
    ...(handoverProposal && { handoverProposal }),
  });

  await Conversation.findByIdAndUpdate(conversation._id, { lastMessageAt: new Date() });

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'name avatarUrl')
    .lean();

  // Emit via Socket.IO to conversation room
  if (io) {
    io.to(`conv:${conversation._id}`).emit('new_message', { message: populatedMessage });
  }

  // Notify the other participant
  const recipientId = conversation.participantIds.find(
    (id) => id.toString() !== req.user._id.toString()
  );

  if (recipientId) {
    await notifyNewMessage(recipientId, conversation._id, req.user.name);
  }

  res.status(201).json({ success: true, data: { message: populatedMessage } });
});

/**
 * PATCH /api/messages/:id/read
 */
const markMessageRead = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

  const conversation = await Conversation.findById(message.conversationId);
  if (!isParticipant(conversation, req.user._id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await Message.findByIdAndUpdate(message._id, { isRead: true, readAt: new Date() });

  res.json({ success: true, message: 'Message marked as read.' });
});

/**
 * POST /api/messages/:id/report
 */
const reportMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

  const conversation = await Conversation.findById(message.conversationId);
  if (!isParticipant(conversation, req.user._id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  await Message.findByIdAndUpdate(message._id, {
    isReported: true,
    reportedBy: req.user._id,
    reportReason: req.body.reason || null,
  });

  // Create a formal report
  const Report = require('../models/Report');
  await Report.create({
    reporterId: req.user._id,
    targetType: 'MESSAGE',
    targetId: message._id,
    reason: req.body.reason || 'OTHER',
    details: req.body.details || null,
  });

  res.json({ success: true, message: 'Message reported. A moderator will review it.' });
});

module.exports = {
  setSocketIO,
  createConversation,
  listConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessageRead,
  reportMessage,
};
