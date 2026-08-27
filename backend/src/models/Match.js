const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    lostPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemPost',
      required: true,
      index: true,
    },
    foundPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemPost',
      required: true,
      index: true,
    },
    // Overall score 0–100
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    // Component scores
    categoryScore: { type: Number, default: 0, min: 0, max: 100 },
    descriptionScore: { type: Number, default: 0, min: 0, max: 100 },
    locationScore: { type: Number, default: 0, min: 0, max: 100 },
    dateScore: { type: Number, default: 0, min: 0, max: 100 },
    colorBrandScore: { type: Number, default: 0, min: 0, max: 100 },
    otherDetailsScore: { type: Number, default: 0, min: 0, max: 100 },

    // Human-readable match reasons (no private info)
    matchReasons: {
      type: [String],
      default: [],
    },
    confidenceLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['SUGGESTED', 'VIEWED', 'DISMISSED', 'CLAIM_STARTED', 'RESOLVED'],
      default: 'SUGGESTED',
      index: true,
    },
    notifiedLostUser: {
      type: Boolean,
      default: false,
    },
    notifiedFoundUser: {
      type: Boolean,
      default: false,
    },
    viewedByLostUser: {
      type: Boolean,
      default: false,
    },
    viewedByFoundUser: {
      type: Boolean,
      default: false,
    },
    dismissedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate matches
matchSchema.index({ lostPostId: 1, foundPostId: 1 }, { unique: true });
matchSchema.index({ score: -1, confidenceLevel: 1 });
matchSchema.index({ status: 1, createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
