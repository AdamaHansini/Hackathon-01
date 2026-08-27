const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'MATCH_FOUND',
        'CLAIM_CREATED',
        'CLAIM_APPROVED',
        'CLAIM_REJECTED',
        'CLAIM_UNDER_REVIEW',
        'MESSAGE_RECEIVED',
        'POST_EXPIRING',
        'POST_EXPIRED',
        'REPORT_UPDATE',
        'SUSPICIOUS_ACTIVITY',
        'ITEM_RETURNED',
        'VERIFICATION_FAILED',
        'HANDOVER_PROPOSED',
        'CLAIM_MORE_INFO',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    relatedPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemPost',
      default: null,
    },
    relatedMatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    relatedClaimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      default: null,
    },
    relatedConversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
