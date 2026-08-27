const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema(
  {
    emailOnMatch: { type: Boolean, default: true },
    emailOnClaim: { type: Boolean, default: true },
    emailOnMessage: { type: Boolean, default: false },
    emailOnPostExpiry: { type: Boolean, default: true },
    pushOnMatch: { type: Boolean, default: true },
    pushOnClaim: { type: Boolean, default: true },
    pushOnMessage: { type: Boolean, default: true },
    pushOnPostExpiry: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
      select: false,
    },
    // Private — never returned publicly
    phone: {
      type: String,
      default: null,
      select: false,
    },
    city: {
      type: String,
      default: null,
      trim: true,
    },
    role: {
      type: String,
      enum: ['USER', 'MODERATOR', 'ADMIN'],
      default: 'USER',
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      default: 'ACTIVE',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    successfulReturnsCount: {
      type: Number,
      default: 0,
    },
    recoveredItemsCount: {
      type: Number,
      default: 0,
    },
    reportsAgainstCount: {
      type: Number,
      default: 0,
    },
    failedClaimAttempts: {
      type: Number,
      default: 0,
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    // Private — never returned publicly
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedReason: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.refreshTokenHash;
        delete ret.phone;
        delete ret.lastLoginIp;
        delete ret.avatarPublicId;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, accountStatus: 1 });
userSchema.index({ trustScore: -1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
