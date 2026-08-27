const express = require('express');
const router = express.Router();
const {
  register, login, logout, getMe, forgotPassword,
  resetPassword, refreshToken, changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const {
  validateRegister, validateLogin, validateForgotPassword,
  validateResetPassword, validateChangePassword,
} = require('../middleware/validateMiddleware');
const {
  loginLimiter, registerLimiter, forgotPasswordLimiter,
} = require('../middleware/rateLimitMiddleware');

router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);
router.post('/refresh-token', refreshToken);
router.patch('/change-password', authenticate, validateChangePassword, changePassword);

module.exports = router;
