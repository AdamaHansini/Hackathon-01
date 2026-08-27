const ItemPost = require('../models/ItemPost');
const { notifyPostExpired, notifyPostExpiring } = require('./notificationService');
const { createAuditLog } = require('../utils/auditLogger');
const { env } = require('../config/env');

const WARN_DAYS = env.POST_EXPIRY_WARN_DAYS || 3;

/**
 * Expire all posts that are past their expiresAt date.
 * Updates status to EXPIRED and notifies users.
 */
const expirePosts = async () => {
  const now = new Date();

  const expiredPosts = await ItemPost.find({
    status: { $in: ['ACTIVE', 'MATCHED'] },
    expiresAt: { $lte: now },
  }).select('_id userId itemName status');

  if (expiredPosts.length === 0) {
    console.log('⏰ Expiry job: No posts to expire.');
    return 0;
  }

  let count = 0;
  for (const post of expiredPosts) {
    try {
      await ItemPost.findByIdAndUpdate(post._id, { status: 'EXPIRED' });
      await notifyPostExpired(post);
      await createAuditLog({
        action: 'POST_EXPIRED',
        entityType: 'ItemPost',
        entityId: post._id,
        metadata: { previousStatus: post.status },
      });
      count++;
    } catch (err) {
      console.error(`⚠️  Failed to expire post ${post._id}:`, err.message);
    }
  }

  console.log(`✅ Expiry job: Expired ${count} posts.`);
  return count;
};

/**
 * Warn users about posts expiring within WARN_DAYS days.
 */
const warnExpiringPosts = async () => {
  const now = new Date();
  const warnDate = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);

  // Posts expiring in the next WARN_DAYS days that haven't been warned yet
  const expiringPosts = await ItemPost.find({
    status: { $in: ['ACTIVE', 'MATCHED'] },
    expiresAt: { $gte: now, $lte: warnDate },
  }).select('_id userId itemName expiresAt');

  let count = 0;
  for (const post of expiringPosts) {
    try {
      await notifyPostExpiring(post);
      count++;
    } catch (err) {
      console.error(`⚠️  Expiry warning failed for post ${post._id}:`, err.message);
    }
  }

  console.log(`⚠️  Expiry warning job: Warned ${count} posts.`);
  return count;
};

/**
 * Renew a post by extending its expiry date by POST_DEFAULT_EXPIRY_DAYS.
 */
const renewPost = async (postId, userId) => {
  const post = await ItemPost.findOne({ _id: postId, userId });

  if (!post) throw Object.assign(new Error('Post not found.'), { statusCode: 404 });
  if (!['EXPIRED', 'ACTIVE', 'MATCHED'].includes(post.status)) {
    throw Object.assign(
      new Error('Only ACTIVE, MATCHED, or EXPIRED posts can be renewed.'),
      { statusCode: 400 }
    );
  }

  const expiryDays = env.POST_DEFAULT_EXPIRY_DAYS || 30;
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + expiryDays);

  const updated = await ItemPost.findByIdAndUpdate(
    postId,
    {
      status: 'ACTIVE',
      expiresAt: newExpiry,
      $inc: { renewedCount: 1 },
    },
    { new: true }
  );

  await createAuditLog({
    action: 'POST_RENEWED',
    entityType: 'ItemPost',
    entityId: postId,
    actor: { _id: userId, role: 'USER' },
    metadata: { newExpiresAt: newExpiry, renewedCount: updated.renewedCount },
  });

  return updated;
};

module.exports = { expirePosts, warnExpiringPosts, renewPost };
