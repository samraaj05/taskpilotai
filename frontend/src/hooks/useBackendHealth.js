import { useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export function useBackendHealth(backendMode, onReset) {
    useEffect(() => {
        let isPolling = true;

        const checkHealth = async () => {
            try {
                // Lightweight polling on the health endpoint
                const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
                if (isPolling && response.status === 200) {
                    onReset(); // Log success / clear failures
                }
            } catch (error) {
                // Backend still down or degraded, silently continue
            }
        };

        // If DEGRADED, poll every 10s. If FULL, poll every 60s for proactive monitoring.
        const pollInterval = backendMode === "DEGRADED" ? 10000 : 60000;
        const interval = setInterval(checkHealth, pollInterval);

        // Run initial check immediately if DEGRADED
        if (backendMode === "DEGRADED") {
            checkHealth();
        }

        return () => {
            isPolling = false;
            clearInterval(interval);
        };
    }, [backendMode, onReset]);
}
