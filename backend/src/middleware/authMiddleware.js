const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authenticate request via JWT.
 * Accepts token from:
 *   1. HTTP-only cookie: "accessToken"
 *   2. Authorization header: "Bearer <token>"
 *
 * Attaches decoded user to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // 2. Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await User.findById(decoded.sub).select(
      'name email role accountStatus trustScore'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    if (user.accountStatus === 'DELETED') {
      return res.status(401).json({
        success: false,
        message: 'This account has been deleted.',
      });
    }

    if (user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }
    next(err);
  }
};

/**
 * Optional authentication — attaches req.user if valid token present,
 * but does NOT block unauthenticated requests.
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) return next();

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select(
      'name email role accountStatus trustScore'
    );

    if (user && user.accountStatus === 'ACTIVE') {
      req.user = user;
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate };
