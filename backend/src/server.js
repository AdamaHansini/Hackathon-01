require('dotenv').config();

const http = require('http');
const { validateEnv } = require('./config/env');
const connectDB = require('./config/db');
const { initCloudinary } = require('./config/cloudinary');
const app = require('./app');
const { initSocketServer } = require('./sockets/socketServer');
const { startExpirePostsJob } = require('./jobs/expirePostsJob');
const { startMatchPostsJob } = require('./jobs/matchPostsJob');
const { startNotificationJob } = require('./jobs/notificationJob');

// Validate environment variables before starting
validateEnv();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Cloudinary (non-blocking — just configures SDK)
    initCloudinary();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocketServer(server);

    // Start background jobs
    startExpirePostsJob();
    startMatchPostsJob();
    startNotificationJob();

    // Start listening
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║          🔗 LostLink Backend Server              ║
║══════════════════════════════════════════════════║
║  Environment: ${process.env.NODE_ENV?.padEnd(33)}║
║  Port:        ${String(PORT).padEnd(33)}║
║  Health:      http://localhost:${PORT}/health${' '.repeat(Math.max(0, 15 - String(PORT).length))}║
╚══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚡ ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('✅ HTTP server closed.');
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled promise rejection safety net
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err.message);
    process.exit(1);
  }
};

startServer();
