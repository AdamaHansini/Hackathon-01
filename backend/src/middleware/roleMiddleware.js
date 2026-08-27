/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate middleware.
 */

/**
 * Require a specific role or higher.
 * Role hierarchy: USER < MODERATOR < ADMIN
 */
const ROLE_HIERARCHY = { USER: 1, MODERATOR: 2, ADMIN: 3 };

/**
 * Require user to have at least the specified role.
 * @param {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = Math.min(...roles.map((r) => ROLE_HIERARCHY[r] || 999));

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

/**
 * Shorthand guards
 */
const requireModerator = requireRole('MODERATOR', 'ADMIN');
const requireAdmin = requireRole('ADMIN');
const requireUser = requireRole('USER', 'MODERATOR', 'ADMIN');

/**
 * Require user to own the resource OR have elevated role.
 * @param {Function} getOwnerId - (req) => string | ObjectId
 */
const requireOwnerOrModerator = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    if (userLevel >= ROLE_HIERARCHY.MODERATOR) return next();

    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId) {
        return res.status(404).json({ success: false, message: 'Resource not found.' });
      }
      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Require user to own the resource exactly (no moderator bypass).
 */
const requireOwner = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId) {
        return res.status(404).json({ success: false, message: 'Resource not found.' });
      }
      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this resource.',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  requireRole,
  requireUser,
  requireModerator,
  requireAdmin,
  requireOwnerOrModerator,
  requireOwner,
  ROLE_HIERARCHY,
};
