const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['POST', 'USER', 'MESSAGE', 'CLAIM'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetTypeRef',
    },
    reason: {
      type: String,
      enum: [
        'FAKE_ITEM',
        'SCAM',
        'DUPLICATE',
        'INCORRECT_INFORMATION',
        'INAPPROPRIATE',
        'SPAM',
        'SUSPICIOUS_USER',
        'OTHER',
      ],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: [2000, 'Report details cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    assignedModeratorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    resolution: {
      type: String,
      default: null,
    },
    actionTaken: {
      type: String,
      enum: [
        'DISMISSED',
        'WARNING_ISSUED',
        'POST_HIDDEN',
        'POST_DELETED',
        'USER_SUSPENDED',
        'USER_FLAGGED',
        'CLAIM_ESCALATED',
        null,
      ],
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ assignedModeratorId: 1, status: 1 });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
