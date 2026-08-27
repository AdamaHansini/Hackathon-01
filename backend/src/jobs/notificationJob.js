const cron = require('node-cron');
const { warnExpiringPosts } = require('../services/expiryService');

/**
 * Daily job at 08:00 AM — warn users about posts expiring in 3 days
 */
const startNotificationJob = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('📬 [CRON] Running expiry warning notification job...');
    try {
      await warnExpiringPosts();
    } catch (err) {
      console.error('❌ [CRON] Expiry warning job failed:', err.message);
    }
  });

  console.log('✅ Expiry warning cron job scheduled (daily at 08:00)');
};

module.exports = { startNotificationJob };
