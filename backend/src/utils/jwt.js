const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * Generate an access token (short-lived)
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'lostlink',
    audience: 'lostlink-client',
  });
};

/**
 * Generate a refresh token (long-lived)
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'lostlink',
    audience: 'lostlink-client',
  });
};

/**
 * Generate a password reset token
 */
const generateResetToken = (payload) => {
  return jwt.sign(payload, env.JWT_RESET_SECRET, {
    expiresIn: env.JWT_RESET_EXPIRES_IN,
    issuer: 'lostlink',
    audience: 'lostlink-reset',
  });
};

/**
 * Verify access token — returns decoded payload or throws
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'lostlink',
    audience: 'lostlink-client',
  });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'lostlink',
    audience: 'lostlink-client',
  });
};

/**
 * Verify password reset token
 */
const verifyResetToken = (token) => {
  return jwt.verify(token, env.JWT_RESET_SECRET, {
    issuer: 'lostlink',
    audience: 'lostlink-reset',
  });
};

/**
 * Build standard JWT payload from user object
 */
const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  email: user.email,
  role: user.role,
  name: user.name,
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyResetToken,
  buildTokenPayload,
};
