const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry.
 *
 * @param {Object} options
 * @param {string} options.action     - e.g. 'POST_CREATED', 'USER_SUSPENDED'
 * @param {string} options.entityType - Mongoose model name
 * @param {*}      options.entityId   - MongoDB ObjectId of affected entity
 * @param {Object} [options.actor]    - req.user or null for system
 * @param {Object} [options.metadata] - Extra context
 * @param {string} [options.ipAddress]
 * @param {string} [options.userAgent]
 */
const createAuditLog = async ({
  action,
  entityType,
  entityId = null,
  actor = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await AuditLog.create({
      actorId: actor?._id || actor?.sub || null,
      actorRole: actor?.role || 'SYSTEM',
      action,
      entityType,
      entityId,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Audit logging should never crash the main flow
    console.error('⚠️  AuditLog write failed:', err.message);
  }
};

/**
 * Helper: Extract IP from request
 */
const getIpFromRequest = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  null;

/**
 * Helper: Extract User-Agent from request
 */
const getUserAgentFromRequest = (req) => req.headers['user-agent'] || null;

/**
 * Convenience wrapper that extracts IP and UA from Express req automatically
 */
const auditFromRequest = async (req, { action, entityType, entityId, metadata }) => {
  return createAuditLog({
    action,
    entityType,
    entityId,
    actor: req.user || null,
    metadata,
    ipAddress: getIpFromRequest(req),
    userAgent: getUserAgentFromRequest(req),
  });
};

module.exports = {
  createAuditLog,
  auditFromRequest,
  getIpFromRequest,
  getUserAgentFromRequest,
};
