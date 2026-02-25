import { useEffect } from 'react';
import axios from 'axios';

export function useBackendHealth(backendMode, setBackendMode) {
    useEffect(() => {
        // Only poll for recovery when we are in degraded mode
        if (backendMode !== "DEGRADED") return;

        let isPolling = true;

        const checkHealth = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || '';
                // Lightweight polling on the health endpoint
                await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
                if (isPolling) {
                    setBackendMode("FULL");
                    console.log("✅ Backend recovered — Queries Resumed.");
                }
            } catch (error) {
                // Backend still down or degraded, silently continue
            }
        };

        // Every 20 seconds, attempt to ping the health route
        const interval = setInterval(checkHealth, 20000);

        return () => {
            isPolling = false;
            clearInterval(interval);
        };
    }, [backendMode, setBackendMode]);
}
