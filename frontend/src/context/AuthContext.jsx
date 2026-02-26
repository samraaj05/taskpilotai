import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/api/base44Client';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                localStorage.setItem('token', token);
                try {
                    const { data } = await api.get(`/api/auth/me`);
                    setUser(data);
                } catch (error) {
                    console.error("Auth init failed:", error);
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            } else {
                localStorage.removeItem('token');
                setUser(null);
            }
            setLoading(false);
        };

        const timer = setTimeout(() => {
            initAuth();
        }, 0);

        return () => clearTimeout(timer);
    }, [token]);

    const login = (userData, accessToken) => {
        setUser(userData);
        setToken(accessToken);
    };

    const logout = async () => {
        try {
            await api.post(`/api/auth/logout`);
            toast.success('Logged out successfully');
        } catch (err) {
            console.error('Logout failed', err);
            toast.error('Logout failed');
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, setToken, login, logout, loading, setLoading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
