const mongoose = require('mongoose');

const verificationQuestionSchema = new mongoose.Schema(
  {
    lostPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemPost',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },
    // Bcrypt hash of normalized answer — NEVER returned via API
    answerHash: {
      type: String,
      required: true,
      select: false,
    },
    // Hints are always disabled for security
    answerHintsDisabled: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

verificationQuestionSchema.index({ lostPostId: 1, order: 1 });

const VerificationQuestion = mongoose.model('VerificationQuestion', verificationQuestionSchema);
module.exports = VerificationQuestion;
