import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/api/base44Client';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};

export const WorkspaceProvider = ({ children }) => {
    const { user } = useAuth();
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState(localStorage.getItem('activeWorkspaceId'));
    const [isLoading, setIsLoading] = useState(false);

    const fetchWorkspaces = async () => {
        if (!user) {
            setWorkspaces([]);
            return;
        }
        setIsLoading(true);
        try {
            const response = await api.get('/api/workspaces');
            if (response.data.success) {
                const fetchedWorkspaces = response.data.data;
                setWorkspaces(fetchedWorkspaces);
                
                // Auto-select first workspace if none active or active not in list
                if (!activeWorkspaceId && fetchedWorkspaces.length > 0) {
                    const firstId = fetchedWorkspaces[0]._id;
                    setActiveWorkspaceId(firstId);
                    localStorage.setItem('activeWorkspaceId', firstId);
                } else if (!fetchedWorkspaces.some(w => w._id === activeWorkspaceId) && fetchedWorkspaces.length > 0) {
                    // Fallback if active workspace was deleted
                    const firstId = fetchedWorkspaces[0]._id;
                    setActiveWorkspaceId(firstId);
                    localStorage.setItem('activeWorkspaceId', firstId);
                }
            } else {
                setWorkspaces([]);
            }
        } catch (error) {
            console.error('[WORKSPACE_CONTEXT] Failed to fetch workspaces:', error);
            setWorkspaces([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, [user]);

    const switchWorkspace = (id) => {
        setActiveWorkspaceId(id);
        localStorage.setItem('activeWorkspaceId', id);
        // Page reload or query invalidation usually happens at component level
    };

    const activeWorkspace = workspaces.find(ws => ws._id === activeWorkspaceId) || workspaces[0] || null;

    return (
        <WorkspaceContext.Provider value={{ 
            workspaces, 
            activeWorkspace, 
            activeWorkspaceId, 
            switchWorkspace, 
            isLoading,
            refreshWorkspaces: fetchWorkspaces
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};
