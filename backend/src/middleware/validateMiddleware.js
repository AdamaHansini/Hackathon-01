const { validationResult, body, param, query } = require('express-validator');

/**
 * Run validation and return 400 with errors if any fail.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
      })),
    });
  }
  next();
};

// ─── Auth Validators ──────────────────────────────────────────────────────────

const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  validate,
];

const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const validateForgotPassword = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  validate,
];

const validateResetPassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  validate,
];

const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  validate,
];

// ─── Post Validators ──────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Electronics', 'Documents', 'Wallet', 'Keys',
  'Bags', 'Jewelry', 'Clothing', 'Pets', 'Other',
];

const validateCreatePost = [
  body('type')
    .notEmpty().withMessage('Post type is required')
    .isIn(['LOST', 'FOUND']).withMessage('Type must be LOST or FOUND'),
  body('itemName')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 200 }).withMessage('Item name cannot exceed 200 characters'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('publicDescription')
    .trim()
    .notEmpty().withMessage('Public description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters'),
  body('lostOrFoundDate')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO date'),
  // Sensitive info guard
  body('publicDescription').custom((val) => {
    const sensitivePatterns = [
      /\b\d{16}\b/, // card numbers
      /\b\d{12}\b/, // Aadhaar-like
      /password/i,
      /\bpin\b/i,
    ];
    for (const p of sensitivePatterns) {
      if (p.test(val)) {
        throw new Error(
          'Public description must not contain sensitive information (card numbers, passwords, PINs).'
        );
      }
    }
    return true;
  }),
  validate,
];

const validateUpdatePost = [
  body('itemName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Item name cannot exceed 200 characters'),
  body('category')
    .optional()
    .isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('publicDescription')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters'),
  body('lostOrFoundDate')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO date'),
  validate,
];

// ─── Verification Question Validators ────────────────────────────────────────

const validateVerificationQuestion = [
  body('question')
    .trim()
    .notEmpty().withMessage('Question is required')
    .isLength({ max: 500 }).withMessage('Question cannot exceed 500 characters'),
  body('answer')
    .notEmpty().withMessage('Answer is required')
    .isLength({ min: 1, max: 200 }).withMessage('Answer must be 1–200 characters'),
  validate,
];

// ─── Claim Validators ─────────────────────────────────────────────────────────

const validateCreateClaim = [
  body('foundPostId')
    .notEmpty().withMessage('Found post ID is required')
    .isMongoId().withMessage('Invalid found post ID'),
  body('relatedLostPostId')
    .optional()
    .isMongoId().withMessage('Invalid lost post ID'),
  body('claimMessage')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Claim message cannot exceed 1000 characters'),
  validate,
];

const validateVerifyClaim = [
  body('answers')
    .isArray({ min: 1 }).withMessage('Answers must be a non-empty array'),
  body('answers.*.questionId')
    .isMongoId().withMessage('Each answer must have a valid questionId'),
  body('answers.*.answer')
    .notEmpty().withMessage('Each answer must have a non-empty answer'),
  validate,
];

// ─── Report Validators ────────────────────────────────────────────────────────

const VALID_REPORT_REASONS = [
  'FAKE_ITEM', 'SCAM', 'DUPLICATE', 'INCORRECT_INFORMATION',
  'INAPPROPRIATE', 'SPAM', 'SUSPICIOUS_USER', 'OTHER',
];

const validateCreateReport = [
  body('targetType')
    .notEmpty().withMessage('Target type is required')
    .isIn(['POST', 'USER', 'MESSAGE', 'CLAIM']).withMessage('Invalid target type'),
  body('targetId')
    .notEmpty().withMessage('Target ID is required')
    .isMongoId().withMessage('Invalid target ID'),
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isIn(VALID_REPORT_REASONS).withMessage('Invalid report reason'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Details cannot exceed 2000 characters'),
  validate,
];

// ─── Message Validators ───────────────────────────────────────────────────────

const validateSendMessage = [
  body('content')
    .trim()
    .notEmpty().withMessage('Message content is required')
    .isLength({ max: 5000 }).withMessage('Message cannot exceed 5000 characters'),
  body('messageType')
    .optional()
    .isIn(['TEXT', 'HANDOVER_PROPOSAL']).withMessage('Invalid message type'),
  validate,
];

// ─── Search Validators ────────────────────────────────────────────────────────

const validateSearch = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1–50').toInt(),
  query('type').optional({ values: 'falsy' }).isIn(['LOST', 'FOUND']).withMessage('Type must be LOST or FOUND'),
  query('category').optional({ values: 'falsy' }).isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  validate,
];

// ─── User Validators ──────────────────────────────────────────────────────────

const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number'),
  validate,
];

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateCreatePost,
  validateUpdatePost,
  validateVerificationQuestion,
  validateCreateClaim,
  validateVerifyClaim,
  validateCreateReport,
  validateSendMessage,
  validateSearch,
  validateUpdateProfile,
};
