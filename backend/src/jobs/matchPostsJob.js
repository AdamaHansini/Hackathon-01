const cron = require('node-cron');
const { refreshRecentMatches } = require('../services/matchingService');

/**
 * Hourly job — re-run Smart Match for posts updated in the last 24 hours
 */
const startMatchPostsJob = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 [CRON] Running Smart Match refresh job...');
    try {
      await refreshRecentMatches();
    } catch (err) {
      console.error('❌ [CRON] Smart Match job failed:', err.message);
    }
  });

  console.log('✅ Smart Match cron job scheduled (hourly)');
};

module.exports = { startMatchPostsJob };
