import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, LoginData, RegisterData } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setLoading(false);
      console.log('Auth check:', authenticated, 'Token:', localStorage.getItem('token') ? 'exists' : 'missing');
    };
    checkAuth();
    
    // Listen for storage changes (e.g., token updates from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const login = async (data: LoginData) => {
    await authService.login(data);
    // Double-check token was saved
    const token = localStorage.getItem('token');
    console.log('After login - Token in localStorage:', token ? 'exists' : 'MISSING');
    setIsAuthenticated(!!token);
  };

  const register = async (data: RegisterData) => {
    await authService.register(data);
    // Double-check token was saved
    const token = localStorage.getItem('token');
    console.log('After register - Token in localStorage:', token ? 'exists' : 'MISSING');
    setIsAuthenticated(!!token);
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

