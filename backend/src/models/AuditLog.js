const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system actions
    },
    actorRole: {
      type: String,
      enum: ['USER', 'MODERATOR', 'ADMIN', 'SYSTEM'],
      default: 'SYSTEM',
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200],
      // Examples: 'USER_REGISTERED', 'POST_CREATED', 'CLAIM_APPROVED',
      // 'USER_SUSPENDED', 'POST_REMOVED', 'MATCH_DISMISSED'
    },
    entityType: {
      type: String,
      enum: [
        'User',
        'ItemPost',
        'Match',
        'Claim',
        'Conversation',
        'Message',
        'Notification',
        'Report',
        'SuspiciousActivity',
        'Category',
        'SYSTEM',
      ],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    // Audit logs are never updated
    strict: true,
  }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
