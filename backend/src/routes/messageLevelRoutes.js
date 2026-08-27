const express = require('express');
const router = express.Router();
const { markMessageRead, reportMessage } = require('../controllers/messageController');
const { authenticate } = require('../middleware/authMiddleware');

// These are message-level routes (not under /conversations)
router.patch('/:id/read', authenticate, markMessageRead);
router.post('/:id/report', authenticate, reportMessage);

module.exports = router;
