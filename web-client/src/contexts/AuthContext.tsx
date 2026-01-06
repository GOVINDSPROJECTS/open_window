import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
// import { User } from '@open-window/shared';

// Temporary type for local definition if shared lib issue persists, using 'any' to unblock if needed
// but trying to use shared types.

interface AuthContextType {
    user: any | null;
    token: string | null;
    login: (data: any) => Promise<void>; // using any for dto locally to avoid complex import issues if workspace not perfectly linked yet
    register: (data: any) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Configure axios defaults
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                // Need to implement /me endpoint in User Service or Auth Service
                // For now decoding token or relying on stored user data
                // const { data } = await axios.get('http://localhost:3002/users/me'); 
                // setUser(data);
                const storedUser = localStorage.getItem('user');
                if (storedUser) setUser(JSON.parse(storedUser));
            } catch (e) {
                logout();
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token]);

    const login = async (dto: any) => {
        const res = await axios.post(`/api/auth/login`, dto);
        setToken(res.data.accessToken);
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('refreshToken', res.data.refreshToken);
    };

    const register = async (dto: any) => {
        const res = await axios.post(`/api/auth/register`, dto);
        setToken(res.data.accessToken);
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('refreshToken', res.data.refreshToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
