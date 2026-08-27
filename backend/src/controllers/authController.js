const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
  verifyResetToken,
  buildTokenPayload,
} = require('../utils/jwt');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { auditFromRequest } = require('../utils/auditLogger');
const { env } = require('../config/env');
const nodemailer = require('nodemailer');

// ─── Email helper ─────────────────────────────────────────────────────────────

const createTransporter = () => {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    return null; // Email not configured
  }
  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    return;
  }
  await transporter.sendMail({
    from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
};

// ─── Cookie helper ────────────────────────────────────────────────────────────

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, city } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    city: city || null,
    trustScore: env.INITIAL_TRUST_SCORE || 50,
  });

  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token hash
  await User.findByIdAndUpdate(user._id, {
    refreshTokenHash: await hashPassword(refreshToken),
    lastLoginAt: new Date(),
  });

  setCookies(res, accessToken, refreshToken);

  await auditFromRequest(req, {
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user._id,
    metadata: { email: user.email },
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Welcome to LostLink!',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustScore: user.trustScore,
        city: user.city,
      },
      accessToken,
    },
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (user.accountStatus === 'SUSPENDED') {
    return res.status(403).json({
      success: false,
      message: 'Your account has been suspended. Please contact support.',
    });
  }

  if (user.accountStatus === 'DELETED') {
    return res.status(401).json({ success: false, message: 'Account not found.' });
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await User.findByIdAndUpdate(user._id, {
    refreshTokenHash: await hashPassword(refreshToken),
    lastLoginAt: new Date(),
  });

  setCookies(res, accessToken, refreshToken);

  await auditFromRequest(req, {
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id,
    metadata: { email: user.email },
  });

  res.json({
    success: true,
    message: 'Login successful.',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustScore: user.trustScore,
        city: user.city,
        avatarUrl: user.avatarUrl,
        notificationPreferences: user.notificationPreferences,
      },
      accessToken,
    },
  });
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
    await auditFromRequest(req, {
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user._id,
    });
  }
  clearCookies(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '-passwordHash -refreshTokenHash -passwordResetTokenHash -passwordResetExpiresAt'
  );
  res.json({ success: true, data: { user } });
});

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, accountStatus: 'ACTIVE' });

  // Always return 200 to prevent email enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  const resetToken = generateResetToken({ sub: user._id.toString() });
  const resetTokenHash = await hashPassword(resetToken);

  await User.findByIdAndUpdate(user._id, {
    passwordResetTokenHash: resetTokenHash,
    passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'LostLink — Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Reset Your Password</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your LostLink password. Click the button below to create a new password.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">Reset Password</a>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;">LostLink — Secure Lost &amp; Found Platform</p>
      </div>
    `,
  });

  await auditFromRequest(req, {
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  });
});

/**
 * POST /api/auth/reset-password/:token
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token. Please request a new one.',
    });
  }

  const user = await User.findById(decoded.sub).select(
    '+passwordResetTokenHash +passwordResetExpiresAt'
  );

  if (
    !user ||
    !user.passwordResetTokenHash ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt < new Date()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Reset token has expired. Please request a new one.',
    });
  }

  const isValidToken = await comparePassword(token, user.passwordResetTokenHash);
  if (!isValidToken) {
    return res.status(400).json({
      success: false,
      message: 'Invalid reset token.',
    });
  }

  const passwordHash = await hashPassword(password);
  await User.findByIdAndUpdate(user._id, {
    passwordHash,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    refreshTokenHash: null, // Invalidate all sessions
  });

  clearCookies(res);

  await auditFromRequest(req, {
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ success: true, message: 'Password reset successfully. Please login again.' });
});

/**
 * POST /api/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token required.' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    return res.status(401).json({ success: false, message: 'Session not found. Please login.' });
  }

  const isValid = await comparePassword(token, user.refreshTokenHash);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }

  const payload = buildTokenPayload(user);
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await User.findByIdAndUpdate(user._id, {
    refreshTokenHash: await hashPassword(newRefreshToken),
  });

  setCookies(res, newAccessToken, newRefreshToken);

  res.json({
    success: true,
    message: 'Token refreshed.',
    data: { accessToken: newAccessToken },
  });
});

/**
 * PATCH /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  const isMatch = await comparePassword(currentPassword, user.passwordHash);

  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(user._id, { passwordHash, refreshTokenHash: null });

  clearCookies(res);

  await auditFromRequest(req, {
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ success: true, message: 'Password changed. Please login again.' });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  changePassword,
};
