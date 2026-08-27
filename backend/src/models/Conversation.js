const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
      unique: true,
    },
    participantIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator: (v) => v.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    unreadCountUser1: {
      type: Number,
      default: 0,
    },
    unreadCountUser2: {
      type: Number,
      default: 0,
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participantIds: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
