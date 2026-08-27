const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * GET /api/notifications
 */
const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { recipientId: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    },
  });
});

/**
 * PATCH /api/notifications/:id/read
 */
const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user._id },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'Notification marked as read.' });
});

/**
 * PATCH /api/notifications/read-all
 */
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipientId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: `${result.modifiedCount} notifications marked as read.` });
});

/**
 * DELETE /api/notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user._id });
  res.json({ success: true, message: 'Notification deleted.' });
});

module.exports = { listNotifications, markRead, markAllRead, deleteNotification };
