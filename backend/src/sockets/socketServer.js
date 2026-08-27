const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { setSocketIO } = require('../services/notificationService');

/**
 * Initialize Socket.IO server with JWT authentication and room management.
 *
 * Rooms:
 *   user:<userId>       — personal notification room for each user
 *   conv:<convId>       — private conversation room (participants only)
 *
 * Server events emitted:
 *   notification        — new notification object
 *   new_message         — new message in a conversation
 *   match_found         — high-confidence match alert
 *   claim_update        — claim status changed
 *   typing              — typing indicator
 *   user_joined         — user connected to conv room
 *
 * Client events handled:
 *   join_conversation   — join a private conv room (validated)
 *   leave_conversation  — leave a conv room
 *   send_message        — send via socket (mirrors REST endpoint)
 *   typing_start        — broadcast typing indicator
 *   typing_stop         — broadcast stop typing
 *   mark_read           — mark messages as read
 */
const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Authentication Middleware ──────────────────────────────────────────────

  io.use(async (socket, next) => {
    try {
      // Token from auth header, cookie, or query string
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select('name email role accountStatus');

      if (!user || user.accountStatus !== 'ACTIVE') {
        return next(new Error('User not found or inactive'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    const { userId } = socket;

    console.log(`🔌 Socket connected: ${socket.user.name} (${userId})`);

    // Join personal notification room
    socket.join(`user:${userId}`);

    // ── Join Conversation Room ────────────────────────────────────────────────
    socket.on('join_conversation', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found.' });
          return;
        }

        const isParticipant = conversation.participantIds.some(
          (id) => id.toString() === userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'You are not a participant in this conversation.' });
          return;
        }

        socket.join(`conv:${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
        socket.to(`conv:${conversationId}`).emit('user_joined', {
          userId,
          name: socket.user.name,
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to join conversation.' });
      }
    });

    // ── Leave Conversation Room ───────────────────────────────────────────────
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Typing Indicators ─────────────────────────────────────────────────────
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing', {
        userId,
        name: socket.user.name,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing', {
        userId,
        name: socket.user.name,
        isTyping: false,
      });
    });

    // ── Mark Messages Read ────────────────────────────────────────────────────
    socket.on('mark_read', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('messages_read', {
        userId,
        conversationId,
        readAt: new Date().toISOString(),
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.user?.name} — ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`🔌 Socket error (${socket.user?.name}):`, err.message);
    });
  });

  // Register Socket.IO instance with notification service
  setSocketIO(io);

  console.log('✅ Socket.IO server initialized');
  return io;
};

module.exports = { initSocketServer };
