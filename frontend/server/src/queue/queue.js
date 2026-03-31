const { Queue } = require('bullmq');
const redis = require('../config/redis');

if (process.env.DISABLE_REDIS === 'true') {
    const mockQueue = {
        add: async () => {},
        getJobs: async () => [],
        obliterate: async () => {},
        close: async () => {},
    };
    module.exports = {
        aiInsightsQueue: mockQueue,
        analyticsQueue: mockQueue,
        overdueQueue: mockQueue,
    };
} else {
    const queueOptions = {
        connection: redis,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    };

    const aiInsightsQueue = new Queue('AI_INSIGHTS_GEN', queueOptions);
    const analyticsQueue = new Queue('ANALYTICS_RECALC', queueOptions);
    const overdueQueue = new Queue('OVERDUE_SCAN', queueOptions);

    module.exports = {
        aiInsightsQueue,
        analyticsQueue,
        overdueQueue,
    };
}
