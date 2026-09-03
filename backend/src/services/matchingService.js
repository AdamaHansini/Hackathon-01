const ItemPost = require('../models/ItemPost');
const Match = require('../models/Match');
const { computeMatchScore, getConfidenceLevel } = require('../utils/scoreCalculator');
const { scoreLocationProximity } = require('../utils/geoUtils');
const { notifyMatchFound } = require('./notificationService');
const { env } = require('../config/env');

const HIGH_THRESHOLD = env.MATCH_HIGH_CONFIDENCE_THRESHOLD || 90;
const MEDIUM_THRESHOLD = env.MATCH_MEDIUM_CONFIDENCE_THRESHOLD || 70;

/**
 * Pre-filter candidate posts to reduce scoring work.
 * Filters by: active status, opposite type, same category (preferred), same city.
 */
const getCandidatePosts = async (sourcePost) => {
  const oppositeType = sourcePost.type === 'LOST' ? 'FOUND' : 'LOST';

  // Build date range ±30 days
  const dateFrom = new Date(sourcePost.lostOrFoundDate);
  const dateTo = new Date(sourcePost.lostOrFoundDate);
  dateFrom.setDate(dateFrom.getDate() - 30);
  dateTo.setDate(dateTo.getDate() + 30);

  const query = {
    type: oppositeType,
    status: 'ACTIVE',
    _id: { $ne: sourcePost._id },
    lostOrFoundDate: { $gte: dateFrom, $lte: dateTo },
  };

  // Prefer same city but don't exclude others
  // (we'll score all candidates and rank them)
  const candidates = await ItemPost.find(query)
    .select(
      'userId type itemName category publicDescription color brand publicCharacteristics lostOrFoundDate locationName city approximateCoordinates status'
    )
    .limit(200)
    .lean();

  // Prioritize same category and same city
  const prioritized = candidates.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.category === sourcePost.category) scoreA += 2;
    if (a.city && sourcePost.city && a.city === sourcePost.city) scoreA += 1;
    if (b.category === sourcePost.category) scoreB += 2;
    if (b.city && sourcePost.city && b.city === sourcePost.city) scoreB += 1;
    return scoreB - scoreA;
  });

  return prioritized.slice(0, 100); // Cap at 100 candidates
};

/**
 * Run Smart Match for a given post.
 * Finds candidates, scores them, upserts Match records, notifies users.
 *
 * @param {string} postId - The post to run matching for
 * @returns {Array} Array of created/updated Match records
 */
const runSmartMatch = async (postId) => {
  const sourcePost = await ItemPost.findById(postId).lean();

  if (!sourcePost) throw new Error('Post not found');
  if (!['ACTIVE', 'MATCHED'].includes(sourcePost.status)) return [];

  const candidates = await getCandidatePosts(sourcePost);
  if (candidates.length === 0) return [];

  const results = [];

  for (const candidate of candidates) {
    try {
      const locationScore = scoreLocationProximity(sourcePost, candidate);
      const { score, components, matchReasons } = computeMatchScore(
        sourcePost,
        candidate,
        locationScore
      );

      const confidenceLevel = getConfidenceLevel(score, HIGH_THRESHOLD, MEDIUM_THRESHOLD);

      // Determine which is lost and which is found
      const lostPostId = sourcePost.type === 'LOST' ? sourcePost._id : candidate._id;
      const foundPostId = sourcePost.type === 'FOUND' ? sourcePost._id : candidate._id;

      // Upsert the match record
      const match = await Match.findOneAndUpdate(
        { lostPostId, foundPostId },
        {
          score,
          categoryScore: components.categoryScore,
          descriptionScore: components.descriptionScore,
          locationScore: components.locationScore,
          dateScore: components.dateScore,
          colorBrandScore: components.colorBrandScore,
          otherDetailsScore: components.otherDetailsScore,
          matchReasons,
          confidenceLevel,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push(match);

      // Notify users for MEDIUM and HIGH confidence matches
      if (
        confidenceLevel !== 'LOW' &&
        (!match.notifiedLostUser || !match.notifiedFoundUser)
      ) {
        const lostPost =
          sourcePost.type === 'LOST'
            ? sourcePost
            : await ItemPost.findById(lostPostId).lean();
        const foundPost =
          sourcePost.type === 'FOUND'
            ? sourcePost
            : await ItemPost.findById(foundPostId).lean();

        if (lostPost && foundPost) {
          await notifyMatchFound(match, lostPost, foundPost);

          await Match.findByIdAndUpdate(match._id, {
            notifiedLostUser: true,
            notifiedFoundUser: true,
          });
        }
      }
    } catch (err) {
      console.error(`⚠️  Match scoring error for candidate ${candidate._id}:`, err.message);
    }
  }

  // Return only MEDIUM and HIGH confidence matches
  return results.filter((m) => m.confidenceLevel !== 'LOW');
};

/**
 * Refresh matches for all recently updated active posts
 */
const refreshRecentMatches = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h
  const recentPosts = await ItemPost.find({
    status: { $in: ['ACTIVE', 'MATCHED'] },
    updatedAt: { $gte: cutoff },
  })
    .select('_id')
    .lean();

  console.log(`🔄 Refreshing matches for ${recentPosts.length} recent posts...`);

  for (const post of recentPosts) {
    await runSmartMatch(post._id).catch((err) =>
      console.error(`⚠️  Match refresh error for ${post._id}:`, err.message)
    );
  }
};

module.exports = { runSmartMatch, refreshRecentMatches, getCandidatePosts };
