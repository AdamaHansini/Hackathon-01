const User = require('../models/User');
const { env } = require('../config/env');

const INITIAL_SCORE = env.INITIAL_TRUST_SCORE || 50;

/**
 * Trust score adjustment values
 */
const SCORE_ADJUSTMENTS = {
  SUCCESSFUL_RETURN: +5,        // User successfully returned an item
  ITEM_RECOVERED: +3,           // User successfully recovered their item
  VERIFIED_EMAIL: +5,           // Email verified
  REPORT_AGAINST: -5,           // Someone reported this user (validated)
  FAILED_CLAIM_ATTEMPT: -2,     // Failed verification on a claim
  SUSPICIOUS_FLAG: -10,         // Flagged by moderator as suspicious
  SUSPENSION: -20,              // Account suspended
  REINSTATED: +5,               // Suspension lifted
  CLAIM_CANCELLED_BY_USER: -1,  // User cancelled their own claim repeatedly
  MODERATOR_WARN: -5,           // Formal moderator warning
  DUPLICATE_POST: -3,           // Duplicate post detected
};

/**
 * Adjust a user's trust score by a delta, clamping to 0–100.
 */
const adjustTrustScore = async (userId, delta, reason = '') => {
  try {
    const user = await User.findById(userId).select('trustScore');
    if (!user) return null;

    const newScore = Math.max(0, Math.min(100, (user.trustScore || INITIAL_SCORE) + delta));

    await User.findByIdAndUpdate(userId, { trustScore: newScore });

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 TrustScore: User ${userId} ${delta > 0 ? '+' : ''}${delta} → ${newScore} (${reason})`);
    }

    return newScore;
  } catch (err) {
    console.error('⚠️  TrustScore update failed:', err.message);
    return null;
  }
};

/**
 * Recalculate full trust score from scratch based on user record.
 * Used periodically or after major events.
 */
const recalculateTrustScore = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let score = INITIAL_SCORE;

  // Positive factors
  score += Math.min(user.successfulReturnsCount * 5, 25);
  score += Math.min(user.recoveredItemsCount * 3, 15);
  if (user.emailVerified) score += 5;

  // Account age bonus (up to 5 points for 6+ months)
  const ageMonths = (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24 * 30);
  score += Math.min(Math.floor(ageMonths / 2), 5);

  // Negative factors
  score -= Math.min(user.reportsAgainstCount * 5, 20);
  score -= Math.min(user.failedClaimAttempts * 2, 10);
  if (user.accountStatus === 'SUSPENDED') score -= 20;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  await User.findByIdAndUpdate(userId, { trustScore: finalScore });

  return finalScore;
};

/**
 * Event-based trust score updates
 */
const onSuccessfulReturn = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.SUCCESSFUL_RETURN, 'Successful return');

const onItemRecovered = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.ITEM_RECOVERED, 'Item recovered');

const onEmailVerified = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.VERIFIED_EMAIL, 'Email verified');

const onReportAgainst = (userId) => {
  User.findByIdAndUpdate(userId, { $inc: { reportsAgainstCount: 1 } }).catch(() => {});
  return adjustTrustScore(userId, SCORE_ADJUSTMENTS.REPORT_AGAINST, 'Report against user');
};

const onFailedClaimAttempt = (userId) => {
  User.findByIdAndUpdate(userId, { $inc: { failedClaimAttempts: 1 } }).catch(() => {});
  return adjustTrustScore(userId, SCORE_ADJUSTMENTS.FAILED_CLAIM_ATTEMPT, 'Failed claim attempt');
};

const onSuspiciousFlag = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.SUSPICIOUS_FLAG, 'Suspicious activity flag');

const onSuspension = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.SUSPENSION, 'Account suspension');

const onReinstatement = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.REINSTATED, 'Account reinstated');

const onDuplicatePost = (userId) =>
  adjustTrustScore(userId, SCORE_ADJUSTMENTS.DUPLICATE_POST, 'Duplicate post detected');

module.exports = {
  adjustTrustScore,
  recalculateTrustScore,
  onSuccessfulReturn,
  onItemRecovered,
  onEmailVerified,
  onReportAgainst,
  onFailedClaimAttempt,
  onSuspiciousFlag,
  onSuspension,
  onReinstatement,
  onDuplicatePost,
  SCORE_ADJUSTMENTS,
};
