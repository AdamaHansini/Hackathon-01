const SuspiciousActivity = require('../models/SuspiciousActivity');
const Claim = require('../models/Claim');
const ItemPost = require('../models/ItemPost');
const { notifyModeratorsAboutSuspiciousActivity } = require('./notificationService');
const { onSuspiciousFlag, onFailedClaimAttempt } = require('./trustScoreService');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * Create a suspicious activity record and notify moderators.
 */
const flagSuspiciousActivity = async ({
  userId,
  activityType,
  severity,
  description,
  relatedEntityType = null,
  relatedEntityId = null,
}) => {
  try {
    const activity = await SuspiciousActivity.create({
      userId,
      activityType,
      severity,
      description,
      relatedEntityType,
      relatedEntityId,
    });

    // Adjust trust score
    if (['HIGH', 'CRITICAL'].includes(severity)) {
      await onSuspiciousFlag(userId);
    }

    // Notify moderators
    await notifyModeratorsAboutSuspiciousActivity(activity);

    // Audit log
    await createAuditLog({
      action: 'SUSPICIOUS_ACTIVITY_DETECTED',
      entityType: 'SuspiciousActivity',
      entityId: activity._id,
      metadata: { userId, activityType, severity },
    });

    return activity;
  } catch (err) {
    console.error('⚠️  SuspiciousActivity flagging failed:', err.message);
    return null;
  }
};

/**
 * Check if a user is attempting too many claims in a short window.
 * Threshold: >5 claims in 10 minutes = FRAUD_RISK
 */
const checkExcessiveClaims = async (userId) => {
  const windowStart = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

  const recentClaimCount = await Claim.countDocuments({
    claimantId: userId,
    createdAt: { $gte: windowStart },
  });

  if (recentClaimCount >= 5) {
    await flagSuspiciousActivity({
      userId,
      activityType: 'EXCESSIVE_CLAIMS',
      severity: recentClaimCount >= 7 ? 'CRITICAL' : 'HIGH',
      description: `User submitted ${recentClaimCount} claims within 10 minutes. Possible fraud attempt.`,
      relatedEntityType: 'Claim',
    });
    return true;
  }
  return false;
};

/**
 * Check if a user has too many failed verification attempts.
 * Threshold: 3+ failures across different posts in 24h
 */
const checkFailedVerifications = async (userId, foundPostId) => {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const failedAttempts = await Claim.countDocuments({
    claimantId: userId,
    verificationPassed: false,
    status: { $in: ['PENDING', 'REJECTED'] },
    createdAt: { $gte: windowStart },
  });

  if (failedAttempts >= 3) {
    await flagSuspiciousActivity({
      userId,
      activityType: 'FAILED_VERIFICATION',
      severity: failedAttempts >= 5 ? 'HIGH' : 'MEDIUM',
      description: `User failed verification ${failedAttempts} times in the last 24 hours.`,
      relatedEntityType: 'Claim',
      relatedEntityId: foundPostId,
    });
    await onFailedClaimAttempt(userId);
    return true;
  }
  return false;
};

/**
 * Check if a user is posting duplicate items.
 * Threshold: same itemName + category within 24h
 */
const checkDuplicatePosts = async (userId, itemName, category) => {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const duplicateCount = await ItemPost.countDocuments({
    userId,
    itemName: new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    category,
    createdAt: { $gte: windowStart },
  });

  if (duplicateCount >= 2) {
    await flagSuspiciousActivity({
      userId,
      activityType: 'DUPLICATE_POSTS',
      severity: 'MEDIUM',
      description: `User posted "${itemName}" (${category}) ${duplicateCount + 1} times today. Possible spam.`,
      relatedEntityType: 'ItemPost',
    });
    return true;
  }
  return false;
};

/**
 * Check if too many reports have been filed against a user.
 * Threshold: 3+ reports against same user in 7 days
 */
const checkRepeatedReports = async (targetUserId) => {
  const Report = require('../models/Report');
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const reportCount = await Report.countDocuments({
    targetType: 'USER',
    targetId: targetUserId,
    createdAt: { $gte: windowStart },
    status: { $ne: 'DISMISSED' },
  });

  if (reportCount >= 3) {
    await flagSuspiciousActivity({
      userId: targetUserId,
      activityType: 'REPEATED_REPORTS',
      severity: reportCount >= 5 ? 'HIGH' : 'MEDIUM',
      description: `User has received ${reportCount} reports in the last 7 days.`,
      relatedEntityType: 'Report',
    });
    return true;
  }
  return false;
};

module.exports = {
  flagSuspiciousActivity,
  checkExcessiveClaims,
  checkFailedVerifications,
  checkDuplicatePosts,
  checkRepeatedReports,
};
