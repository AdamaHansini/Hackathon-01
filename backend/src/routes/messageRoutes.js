const express = require('express');
const router = express.Router();
const {
  createConversation, listConversations, getConversation,
  getMessages, sendMessage, markMessageRead, reportMessage,
} = require('../controllers/messageController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateSendMessage } = require('../middleware/validateMiddleware');

// Conversations
router.post('/claim/:claimId', authenticate, createConversation);
router.get('/', authenticate, listConversations);
router.get('/:id', authenticate, getConversation);
router.get('/:id/messages', authenticate, getMessages);
router.post('/:id/messages', authenticate, validateSendMessage, sendMessage);

module.exports = router;
