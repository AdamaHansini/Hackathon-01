const express = require('express');
const router = express.Router();
const {
  createClaim, listClaims, getClaim, verifyClaim, cancelClaim,
  approveClaim, rejectClaim, requestMoreInfo,
  completeHandover, updateHandoverDetails,
} = require('../controllers/claimController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateCreateClaim, validateVerifyClaim } = require('../middleware/validateMiddleware');
const { verificationLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/', authenticate, validateCreateClaim, createClaim);
router.get('/', authenticate, listClaims);
router.get('/:id', authenticate, getClaim);
router.post('/:id/verify', authenticate, verificationLimiter, validateVerifyClaim, verifyClaim);
router.post('/:id/cancel', authenticate, cancelClaim);
router.post('/:id/approve', authenticate, approveClaim);
router.post('/:id/reject', authenticate, rejectClaim);
router.post('/:id/request-more-info', authenticate, requestMoreInfo);
router.post('/:id/complete-handover', authenticate, completeHandover);
router.patch('/:id/handover-details', authenticate, updateHandoverDetails);

module.exports = router;
