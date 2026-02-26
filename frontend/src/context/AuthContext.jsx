import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
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
                    const config = {
                        headers: { Authorization: `Bearer ${token}` }
                    };
                    const { data } = await axios.get(`${API_BASE_URL}/api/auth/me`, config);
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
            await axios.post(`${API_BASE_URL}/api/auth/logout`);
        } catch (err) {
            console.error('Logout failed', err);
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
