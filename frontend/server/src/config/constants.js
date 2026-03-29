/**
 * TaskPilotAI Global Safety & Performance Constants
 */

const SAFE_DEMO_MODE = process.env.SAFE_DEMO_MODE === 'true' || true; // Default to true if not specified

const SAFETY_CONFIG = {
    SAFE_DEMO_MODE,
    
    // API & DB Protection
    PAGINATION_LIMITS: {
        PROJECTS: SAFE_DEMO_MODE ? 50 : 200,
        TASKS: SAFE_DEMO_MODE ? 100 : 500,
        LOGS: SAFE_DEMO_MODE ? 20 : 100
    },
    
    // Aggregation & Analytics
    ANALYTICS: {
        CACHE_SNAPSHOT_ONLY: SAFE_DEMO_MODE,
        MAX_CONCURRENT_AGGREGATIONS: SAFE_DEMO_MODE ? 2 : 10,
        RECALC_ON_STARTUP: true
    },
    
    // Socket & Real-time
    SOCKET: {
        THROTTLE_MS: SAFE_DEMO_MODE ? 1000 : 200,
        ENABLE_BULK_BROADCAST: !SAFE_DEMO_MODE
    },
    
    // Background Tasks
    BACKGROUND: {
        SIMULATION_ENABLED: !SAFE_DEMO_MODE,
        CRON_RECALC_ENABLED: !SAFE_DEMO_MODE
    }
};

module.exports = { SAFETY_CONFIG };
