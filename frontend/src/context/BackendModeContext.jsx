import React, { createContext, useContext, useState, useCallback } from 'react';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { toast } from 'sonner';

const BackendModeContext = createContext();

export const useBackendMode = () => {
    const context = useContext(BackendModeContext);
    if (!context) {
        throw new Error('useBackendMode must be used within a BackendModeProvider');
    }
    return context;
};

export const BackendModeProvider = ({ children }) => {
    const [backendMode, setBackendMode] = useState("FULL");
    const [failureCount, setFailureCount] = useState(0);

    const logFailure = useCallback((errorMsg) => {
        setFailureCount((prev) => {
            const newCount = prev + 1;
            if (newCount === 1) {
                toast.warning("Connection issues detected. Retrying...", {
                    description: errorMsg || "The backend might be temporarily slow."
                });
            }
            if (newCount >= 3 && backendMode !== "DEGRADED") {
                setBackendMode("DEGRADED");
                toast.error("Backend Degraded", {
                    description: "Moving to API-ONLY mode after multiple connection failures."
                });
            }
            return newCount;
        });
    }, [backendMode]);

    const logSuccess = useCallback(() => {
        setFailureCount(0);
        if (backendMode !== "FULL") {
            setBackendMode("FULL");
            toast.success("Connection restored", {
                description: "Full system functionality is back."
            });
        }
    }, [backendMode]);

    // Mounts the health polling loop to detect and resolve DEGRADED back to FULL
    useBackendHealth(backendMode, logSuccess);

    return (
        <BackendModeContext.Provider value={{ backendMode, setBackendMode, logFailure, logSuccess, failureCount }}>
            {children}
        </BackendModeContext.Provider>
    );
};
