const mongoose = require('mongoose');

const verificationAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationQuestion',
      required: true,
    },
    // Normalized submitted answer (stored for audit, not raw)
    submittedAnswerNormalized: {
      type: String,
      required: true,
      select: false,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    foundPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemPost',
      required: true,
      index: true,
    },
    relatedLostPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemPost',
      default: null,
    },
    claimantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    foundPostOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    verificationAnswers: {
      type: [verificationAnswerSchema],
      default: [],
    },
    correctAnswersCount: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    verificationPassed: {
      type: Boolean,
      default: false,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    moreInfoRequested: {
      type: Boolean,
      default: false,
    },
    moreInfoNote: {
      type: String,
      default: null,
    },
    handoverLocation: {
      type: String,
      default: null,
    },
    handoverTime: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    claimMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Claim message cannot exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

// Compound index: one claimant per found post
claimSchema.index({ foundPostId: 1, claimantId: 1 });
claimSchema.index({ claimantId: 1, status: 1, createdAt: -1 });
claimSchema.index({ foundPostOwnerId: 1, status: 1, createdAt: -1 });

const Claim = mongoose.model('Claim', claimSchema);
module.exports = Claim;
