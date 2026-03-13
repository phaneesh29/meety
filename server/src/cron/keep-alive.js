import cron from 'node-cron';
import { env } from '../config/env.js';

export function startCronJobs() {
    // Run every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
        try {
            const url = `https://meety-reb7.onrender.com/api/health`;
            const response = await fetch(url);
            
            if (response.ok) {
                console.log(`[Cron] Keep-alive ping successful: ${url}`);
            } else {
                console.error(`[Cron] Keep-alive ping failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('[Cron] Keep-alive ping failed:', error.message);
        }
    });

    console.log('[Cron] Keep-alive job scheduled to run every 30 seconds.');
}
