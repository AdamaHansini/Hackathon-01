const mongoose = require('mongoose');

const suspiciousActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: [
        'EXCESSIVE_CLAIMS',
        'FAILED_VERIFICATION',
        'DUPLICATE_POSTS',
        'SPAM',
        'FRAUD_RISK',
        'REPEATED_REPORTS',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: [2000],
    },
    relatedEntityType: {
      type: String,
      enum: ['ItemPost', 'Claim', 'Message', 'Report', null],
      default: null,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: ['OPEN', 'REVIEWED', 'RESOLVED'],
      default: 'OPEN',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

suspiciousActivitySchema.index({ userId: 1, activityType: 1, createdAt: -1 });
suspiciousActivitySchema.index({ severity: 1, status: 1, createdAt: -1 });

const SuspiciousActivity = mongoose.model('SuspiciousActivity', suspiciousActivitySchema);
module.exports = SuspiciousActivity;
