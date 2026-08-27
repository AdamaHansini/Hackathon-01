const VerificationQuestion = require('../models/VerificationQuestion');
const Claim = require('../models/Claim');
const { hashAnswer, compareAnswer, normalizeAnswer } = require('../utils/password');
const { env } = require('../config/env');

const MIN_CORRECT = env.VERIFICATION_MIN_CORRECT || 2;
const MAX_ATTEMPTS = env.VERIFICATION_MAX_ATTEMPTS || 3;

/**
 * Hash a verification answer
 */
const hashVerificationAnswer = async (answer) => {
  return hashAnswer(answer);
};

/**
 * Check if a claimant has exceeded the attempt limit for a given found post.
 * @returns {boolean} true if limit exceeded
 */
const isAttemptLimitExceeded = async (foundPostId, claimantId) => {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentAttempts = await Claim.countDocuments({
    foundPostId,
    claimantId,
    createdAt: { $gte: windowStart },
  });

  return recentAttempts >= MAX_ATTEMPTS;
};

/**
 * Get active verification questions for a lost post.
 * Does NOT return answer hashes.
 */
const getQuestionsForPost = async (lostPostId) => {
  return VerificationQuestion.find({ lostPostId, isActive: true })
    .select('_id question order')
    .sort({ order: 1 })
    .lean();
};

/**
 * Verify submitted answers against stored hashes.
 *
 * @param {string} lostPostId  - Lost post that has the verification questions
 * @param {Array} submittedAnswers - [{ questionId, answer }]
 * @returns {{ passed, correctCount, totalQuestions, results }}
 */
const verifyAnswers = async (lostPostId, submittedAnswers) => {
  // Fetch questions WITH their answer hashes (select: false fields require explicit selection)
  const questions = await VerificationQuestion.find({
    lostPostId,
    isActive: true,
  }).select('+answerHash');

  if (!questions || questions.length === 0) {
    // No questions set — verification auto-passes
    return {
      passed: true,
      correctCount: 0,
      totalQuestions: 0,
      results: [],
      autoPass: true,
    };
  }

  const results = [];

  for (const question of questions) {
    const submitted = submittedAnswers.find(
      (a) => a.questionId.toString() === question._id.toString()
    );

    if (!submitted || !submitted.answer) {
      results.push({
        questionId: question._id,
        submittedAnswerNormalized: '',
        isCorrect: false,
      });
      continue;
    }

    const isCorrect = await compareAnswer(submitted.answer, question.answerHash);
    results.push({
      questionId: question._id,
      submittedAnswerNormalized: normalizeAnswer(submitted.answer),
      isCorrect,
    });
  }

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalQuestions = questions.length;
  const passed = correctCount >= Math.min(MIN_CORRECT, totalQuestions);

  return { passed, correctCount, totalQuestions, results };
};

/**
 * Count correct answers in existing verificationAnswers array
 */
const countCorrectAnswers = (verificationAnswers) => {
  return verificationAnswers.filter((a) => a.isCorrect).length;
};

module.exports = {
  hashVerificationAnswer,
  verifyAnswers,
  getQuestionsForPost,
  isAttemptLimitExceeded,
  countCorrectAnswers,
  MIN_CORRECT,
  MAX_ATTEMPTS,
};
