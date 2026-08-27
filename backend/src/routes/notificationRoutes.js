const express = require('express');
const router = express.Router();
const { listNotifications, markRead, markAllRead, deleteNotification } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, listNotifications);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, markRead);
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;
