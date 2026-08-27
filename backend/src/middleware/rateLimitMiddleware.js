const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter with standardized response format.
 */
const createLimiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000 / 60),
      });
    },
    ...options,
  });

/**
 * Login rate limiter — 10 attempts per 15 minutes
 */
const loginLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 10,
  message: 'Too many login attempts. Please try again after 15 minutes.',
  keyGenerator: (req) => req.body?.email || req.ip,
});

/**
 * Register rate limiter — 5 accounts per hour per IP
 */
const registerLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_REGISTER_MAX, 10) || 5,
  message: 'Too many accounts created. Please try again later.',
});

/**
 * Forgot password rate limiter — 5 requests per hour per email/IP
 */
const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests. Please try again after an hour.',
  keyGenerator: (req) => req.body?.email || req.ip,
});

/**
 * Claim verification rate limiter — 3 attempts per 24 hours
 * Applied per claimant user ID to prevent brute-force on verification questions
 */
const verificationLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_VERIFICATION_WINDOW_MS, 10) || 24 * 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_VERIFICATION_MAX, 10) || 3,
  message: 'Too many verification attempts. Please try again after 24 hours.',
  keyGenerator: (req) =>
    req.user ? `verify:${req.user._id}:${req.params.id}` : req.ip,
});

/**
 * General API rate limiter — 100 requests per minute
 */
const generalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests. Please slow down.',
});

/**
 * Upload rate limiter — 20 uploads per hour
 */
const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Upload limit reached. Please try again later.',
});

/**
 * Report rate limiter — 10 reports per hour per user
 */
const reportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many reports submitted. Please try again later.',
  keyGenerator: (req) => (req.user ? req.user._id.toString() : req.ip),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  verificationLimiter,
  generalLimiter,
  uploadLimiter,
  reportLimiter,
};
