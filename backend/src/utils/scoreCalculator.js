/**
 * LostLink Smart Match Score Calculator
 *
 * Matching weights (total = 100%):
 *   Category:           20%
 *   Description (TF-IDF): 30%
 *   Location:           20%
 *   Date/time:          15%
 *   Color/Brand:        10%
 *   Other details:       5%
 */

const natural = require('natural');

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

/**
 * Compute TF-IDF cosine similarity between two text strings.
 * Returns 0–1.
 */
const computeTextSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;

  const tfidf = new TfIdf();
  tfidf.addDocument(text1.toLowerCase());
  tfidf.addDocument(text2.toLowerCase());

  // Get all unique terms
  const terms = new Set();
  tfidf.listTerms(0).forEach((t) => terms.add(t.term));
  tfidf.listTerms(1).forEach((t) => terms.add(t.term));

  if (terms.size === 0) return 0;

  // Build TF-IDF vectors
  const vec1 = {};
  const vec2 = {};
  tfidf.listTerms(0).forEach((t) => { vec1[t.term] = t.tfidf; });
  tfidf.listTerms(1).forEach((t) => { vec2[t.term] = t.tfidf; });

  // Cosine similarity
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  terms.forEach((term) => {
    const v1 = vec1[term] || 0;
    const v2 = vec2[term] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
};

/**
 * Compute simple token overlap ratio between two strings.
 * Used as a fallback for short texts.
 * Returns 0–1.
 */
const computeTokenOverlap = (text1, text2) => {
  if (!text1 || !text2) return 0;

  const tokens1 = new Set(tokenizer.tokenize(text1.toLowerCase()));
  const tokens2 = new Set(tokenizer.tokenize(text2.toLowerCase()));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = [...tokens1].filter((t) => tokens2.has(t));
  return intersection.length / Math.max(tokens1.size, tokens2.size);
};

/**
 * Score category match: exact match = 100, no match = 0.
 */
const scoreCategoryMatch = (cat1, cat2) => {
  if (!cat1 || !cat2) return 0;
  return cat1.toLowerCase() === cat2.toLowerCase() ? 100 : 0;
};

/**
 * Score description similarity using TF-IDF cosine (0–100).
 * Falls back to token overlap for short texts.
 */
const scoreDescriptionSimilarity = (desc1, desc2) => {
  if (!desc1 || !desc2) return 0;

  const wordCount1 = desc1.split(/\s+/).length;
  const wordCount2 = desc2.split(/\s+/).length;

  let sim;
  if (wordCount1 < 5 || wordCount2 < 5) {
    sim = computeTokenOverlap(desc1, desc2);
  } else {
    sim = computeTextSimilarity(desc1, desc2);
    // Blend with token overlap for robustness
    const tokenSim = computeTokenOverlap(desc1, desc2);
    sim = 0.7 * sim + 0.3 * tokenSim;
  }

  return Math.round(Math.min(sim * 100, 100));
};

/**
 * Score color and brand similarity (0–100).
 * Each worth 50% of this component.
 */
const scoreColorBrand = (color1, brand1, color2, brand2) => {
  let score = 0;

  if (color1 && color2) {
    const colorSim = computeTokenOverlap(color1, color2);
    score += colorSim * 50;
  }

  if (brand1 && brand2) {
    const brandSim = computeTokenOverlap(brand1, brand2);
    score += brandSim * 50;
  } else if (!brand1 && !brand2) {
    // Neither has brand; give neutral 25 points
    score += 25;
  }

  return Math.round(Math.min(score, 100));
};

/**
 * Score date proximity (0–100).
 * Same day = 100, within 1 day = 80, within 3 days = 50, within 7 days = 20, else = 0.
 */
const scoreDateProximity = (date1, date2) => {
  if (!date1 || !date2) return 0;

  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1 - d2);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return 100;
  if (diffDays < 2) return 80;
  if (diffDays < 3) return 65;
  if (diffDays < 5) return 50;
  if (diffDays < 7) return 30;
  if (diffDays < 14) return 15;
  return 0;
};

/**
 * Score other public attributes (publicCharacteristics).
 * Token overlap of joined characteristics (0–100).
 */
const scoreOtherAttributes = (chars1 = [], chars2 = []) => {
  if (!chars1.length || !chars2.length) return 30; // neutral if neither provided
  const text1 = chars1.join(' ');
  const text2 = chars2.join(' ');
  return Math.round(computeTokenOverlap(text1, text2) * 100);
};

/**
 * Compute the overall weighted Smart Match score.
 *
 * @param {Object} lostPost  - Lost ItemPost document
 * @param {Object} foundPost - Found ItemPost document
 * @param {number} locationScore - 0–100 from geoUtils (passed in)
 * @returns {{ score, components, matchReasons }}
 */
const computeMatchScore = (lostPost, foundPost, locationScore = 0) => {
  const weights = {
    category: 0.20,
    description: 0.30,
    location: 0.20,
    date: 0.15,
    colorBrand: 0.10,
    other: 0.05,
  };

  const components = {
    categoryScore: scoreCategoryMatch(lostPost.category, foundPost.category),
    descriptionScore: scoreDescriptionSimilarity(
      lostPost.publicDescription,
      foundPost.publicDescription
    ),
    locationScore: Math.round(locationScore),
    dateScore: scoreDateProximity(lostPost.lostOrFoundDate, foundPost.lostOrFoundDate),
    colorBrandScore: scoreColorBrand(
      lostPost.color,
      lostPost.brand,
      foundPost.color,
      foundPost.brand
    ),
    otherDetailsScore: scoreOtherAttributes(
      lostPost.publicCharacteristics,
      foundPost.publicCharacteristics
    ),
  };

  const score =
    components.categoryScore * weights.category +
    components.descriptionScore * weights.description +
    components.locationScore * weights.location +
    components.dateScore * weights.date +
    components.colorBrandScore * weights.colorBrand +
    components.otherDetailsScore * weights.other;

  const finalScore = Math.round(Math.min(score, 100));

  // Build human-readable match reasons (no private info)
  const matchReasons = [];
  if (components.categoryScore === 100) matchReasons.push('Same category');
  if (components.descriptionScore >= 50) matchReasons.push('Similar description');
  if (components.locationScore >= 60) matchReasons.push('Nearby approximate location');
  if (components.dateScore >= 65) matchReasons.push('Close date/time');
  if (components.colorBrandScore >= 50) matchReasons.push('Similar color/brand');
  if (components.otherDetailsScore >= 50) matchReasons.push('Matching characteristics');
  if (lostPost.city && foundPost.city && lostPost.city.toLowerCase() === foundPost.city.toLowerCase()) {
    matchReasons.push('Same city');
  }

  return { score: finalScore, components, matchReasons };
};

/**
 * Determine confidence level from score.
 */
const getConfidenceLevel = (score, highThreshold = 90, mediumThreshold = 70) => {
  if (score >= highThreshold) return 'HIGH';
  if (score >= mediumThreshold) return 'MEDIUM';
  return 'LOW';
};

module.exports = {
  computeMatchScore,
  computeTextSimilarity,
  scoreDescriptionSimilarity,
  scoreCategoryMatch,
  scoreDateProximity,
  scoreColorBrand,
  scoreOtherAttributes,
  getConfidenceLevel,
};
