import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  isVerified: boolean;
  role: "CREATOR" | "SUPPORTER" | "ADMIN";
  profile: {
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  clearSession: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          const data = res.data;
          setUser({
            id: data.id,
            email: data.email,
            isVerified: data.isVerified,
            role: data.role,
            profile: data.profile ?? undefined,
          });
        } catch (err) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const clearSession = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const logout = () => {
    clearSession();
    window.location.href = "/";
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      if (userData.profile) {
        return {
          ...prev,
          ...userData,
          profile: { ...prev.profile, ...userData.profile },
        };
      }
      return { ...prev, ...userData };
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, clearSession, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
