const express = require('express');
const router = express.Router();
const {
  createPost, listPosts, getPost, updatePost, deletePost,
  uploadImages, deleteImage, renewPost, cancelPost, markReturned,
  getPostMatches, getPostClaims,
  addVerificationQuestion, getVerificationQuestions,
  updateVerificationQuestion, deleteVerificationQuestion,
} = require('../controllers/postController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { uploadItemImages } = require('../middleware/uploadMiddleware');
const { validateCreatePost, validateUpdatePost, validateVerificationQuestion } = require('../middleware/validateMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');

// Public listing
router.get('/', optionalAuthenticate, listPosts);
router.get('/:id', optionalAuthenticate, getPost);

// Authenticated post management
router.post('/', authenticate, validateCreatePost, createPost);
router.patch('/:id', authenticate, validateUpdatePost, updatePost);
router.delete('/:id', authenticate, deletePost);

// Image management
router.post('/:id/images', authenticate, uploadLimiter, uploadItemImages, uploadImages);
router.delete('/:id/images/:imageId', authenticate, deleteImage);

// Post lifecycle
router.post('/:id/renew', authenticate, renewPost);
router.post('/:id/cancel', authenticate, cancelPost);
router.post('/:id/mark-returned', authenticate, markReturned);

// Post-related resources
router.get('/:id/matches', authenticate, getPostMatches);
router.get('/:id/claims', authenticate, getPostClaims);

// Verification questions
router.post('/:id/verification-questions', authenticate, validateVerificationQuestion, addVerificationQuestion);
router.get('/:id/verification-questions', authenticate, getVerificationQuestions);
router.patch('/:id/verification-questions/:questionId', authenticate, validateVerificationQuestion, updateVerificationQuestion);
router.delete('/:id/verification-questions/:questionId', authenticate, deleteVerificationQuestion);

module.exports = router;
