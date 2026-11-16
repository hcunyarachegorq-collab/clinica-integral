'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (data: { fullName: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validar sesión inicial contra el backend
  const initAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const storedToken = localStorage.getItem('clinica_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      setToken(storedToken);
      const res = await api.getMe();
      setUser(res.user);
    } catch (error) {
      console.warn('Sesión previa inválida o expirada:', error);
      localStorage.removeItem('clinica_token');
      localStorage.removeItem('clinica_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const res = await api.login(credentials);
    localStorage.setItem('clinica_token', res.token);
    localStorage.setItem('clinica_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: { fullName: string; email: string; password: string; phone?: string }): Promise<User> => {
    const res = await api.register(data);
    localStorage.setItem('clinica_token', res.token);
    localStorage.setItem('clinica_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('clinica_token');
    localStorage.removeItem('clinica_user');
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (e) {
      console.error('Error al refrescar usuario:', e);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('clinica_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
