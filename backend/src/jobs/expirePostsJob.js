const cron = require('node-cron');
const { expirePosts } = require('../services/expiryService');

/**
 * Daily job at 00:05 AM — expire posts past their expiresAt date
 */
const startExpirePostsJob = () => {
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ [CRON] Running expire posts job...');
    try {
      await expirePosts();
    } catch (err) {
      console.error('❌ [CRON] Expire posts job failed:', err.message);
    }
  });

  console.log('✅ Expire posts cron job scheduled (daily at 00:05)');
};

module.exports = { startExpirePostsJob };
