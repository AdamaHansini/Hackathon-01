const Notification = require('../models/Notification');

let io = null; // Will be set by socketServer

/**
 * Set the Socket.IO instance for real-time push
 */
const setSocketIO = (socketIO) => {
  io = socketIO;
};

/**
 * Create a notification in DB and push via Socket.IO if online.
 *
 * @param {Object} options
 * @param {string} options.recipientId
 * @param {string} options.type
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.relatedPostId]
 * @param {string} [options.relatedMatchId]
 * @param {string} [options.relatedClaimId]
 * @param {string} [options.relatedConversationId]
 * @param {Object} [options.metadata]
 */
const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  relatedPostId = null,
  relatedMatchId = null,
  relatedClaimId = null,
  relatedConversationId = null,
  metadata = null,
}) => {
  try {
    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      relatedPostId,
      relatedMatchId,
      relatedClaimId,
      relatedConversationId,
      metadata,
    });

    // Push via Socket.IO to user's personal room
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', {
        notification: {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: false,
          createdAt: notification.createdAt,
          relatedPostId,
          relatedMatchId,
          relatedClaimId,
        },
      });
    }

    return notification;
  } catch (err) {
    console.error('⚠️  Failed to create notification:', err.message);
    return null;
  }
};

/**
 * Notify both users involved in a match
 */
const notifyMatchFound = async (match, lostPost, foundPost) => {
  const scoreText = `${match.score}% Smart Match`;
  const reasons = match.matchReasons.slice(0, 3).join(', ');

  await Promise.all([
    createNotification({
      recipientId: lostPost.userId,
      type: 'MATCH_FOUND',
      title: `🟢 ${scoreText} Found!`,
      message: `Possible match found for your lost ${lostPost.itemName}. Reason: ${reasons}.`,
      relatedPostId: lostPost._id,
      relatedMatchId: match._id,
      metadata: { score: match.score, confidenceLevel: match.confidenceLevel },
    }),
    createNotification({
      recipientId: foundPost.userId,
      type: 'MATCH_FOUND',
      title: `🟢 ${scoreText} Found!`,
      message: `Your found ${foundPost.itemName} may match a lost item report. Reason: ${reasons}.`,
      relatedPostId: foundPost._id,
      relatedMatchId: match._id,
      metadata: { score: match.score, confidenceLevel: match.confidenceLevel },
    }),
  ]);
};

/**
 * Notify claim-related events
 */
const notifyClaimCreated = async (claim, foundPost) => {
  await createNotification({
    recipientId: claim.foundPostOwnerId,
    type: 'CLAIM_CREATED',
    title: 'New Claim on Your Item',
    message: `Someone has submitted a claim for your found ${foundPost.itemName}. Please review.`,
    relatedPostId: foundPost._id,
    relatedClaimId: claim._id,
  });
};

const notifyClaimApproved = async (claim, foundPost) => {
  await createNotification({
    recipientId: claim.claimantId,
    type: 'CLAIM_APPROVED',
    title: '✅ Claim Approved!',
    message: `Your claim for ${foundPost.itemName} has been approved. A private chat has been opened.`,
    relatedPostId: foundPost._id,
    relatedClaimId: claim._id,
  });
};

const notifyClaimRejected = async (claim, foundPost) => {
  await createNotification({
    recipientId: claim.claimantId,
    type: 'CLAIM_REJECTED',
    title: 'Claim Rejected',
    message: `Your claim for ${foundPost.itemName} was not approved.`,
    relatedPostId: foundPost._id,
    relatedClaimId: claim._id,
  });
};

const notifyClaimMoreInfo = async (claim, foundPost) => {
  await createNotification({
    recipientId: claim.claimantId,
    type: 'CLAIM_MORE_INFO',
    title: 'More Information Needed',
    message: `The finder of ${foundPost.itemName} has requested additional information for your claim.`,
    relatedPostId: foundPost._id,
    relatedClaimId: claim._id,
  });
};

/**
 * Notify about a new message in a conversation
 */
const notifyNewMessage = async (recipientId, conversationId, senderName) => {
  await createNotification({
    recipientId,
    type: 'MESSAGE_RECEIVED',
    title: `💬 New message from ${senderName}`,
    message: `You have a new message regarding your item handover.`,
    relatedConversationId: conversationId,
  });
};

/**
 * Notify about post expiry (3 days warning)
 */
const notifyPostExpiring = async (post) => {
  await createNotification({
    recipientId: post.userId,
    type: 'POST_EXPIRING',
    title: '⚠️ Post Expiring Soon',
    message: `Your post "${post.itemName}" will expire in 3 days. Renew it to keep it active.`,
    relatedPostId: post._id,
  });
};

/**
 * Notify post has expired
 */
const notifyPostExpired = async (post) => {
  await createNotification({
    recipientId: post.userId,
    type: 'POST_EXPIRED',
    title: 'Post Expired',
    message: `Your post "${post.itemName}" has expired. You can renew it from My Posts.`,
    relatedPostId: post._id,
  });
};

/**
 * Notify item returned
 */
const notifyItemReturned = async (userId, post) => {
  await createNotification({
    recipientId: userId,
    type: 'ITEM_RETURNED',
    title: '🎉 Item Returned!',
    message: `The item "${post.itemName}" has been marked as returned. Great work!`,
    relatedPostId: post._id,
  });
};

/**
 * Notify moderator about suspicious activity
 */
const notifyModeratorsAboutSuspiciousActivity = async (suspiciousActivity, io) => {
  try {
    const { default: User } = await Promise.resolve().then(() => require('../models/User'));
    const moderators = await User.find({ role: { $in: ['MODERATOR', 'ADMIN'] }, accountStatus: 'ACTIVE' }).select('_id');

    await Promise.all(
      moderators.map((mod) =>
        createNotification({
          recipientId: mod._id,
          type: 'SUSPICIOUS_ACTIVITY',
          title: '⚠️ Suspicious Activity Detected',
          message: suspiciousActivity.description,
          metadata: {
            activityType: suspiciousActivity.activityType,
            severity: suspiciousActivity.severity,
            userId: suspiciousActivity.userId,
          },
        })
      )
    );
  } catch (err) {
    console.error('⚠️  Failed to notify moderators:', err.message);
  }
};

module.exports = {
  setSocketIO,
  createNotification,
  notifyMatchFound,
  notifyClaimCreated,
  notifyClaimApproved,
  notifyClaimRejected,
  notifyClaimMoreInfo,
  notifyNewMessage,
  notifyPostExpiring,
  notifyPostExpired,
  notifyItemReturned,
  notifyModeratorsAboutSuspiciousActivity,
};
