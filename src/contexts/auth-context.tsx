
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuth = sessionStorage.getItem('isAuthenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
        console.error("Could not read from sessionStorage", error);
    }
    setIsLoading(false);
  }, []);

  const login = async (user: string, pass: string): Promise<boolean> => {
    // Simple hardcoded check
    if (user === 'admin' && pass === 'admin') {
      try {
        sessionStorage.setItem('isAuthenticated', 'true');
      } catch (error) {
        console.error("Could not write to sessionStorage", error);
      }
      setIsAuthenticated(true);
      router.push('/lpr');
      return true;
    }
    return false;
  };

  const logout = () => {
    try {
        sessionStorage.removeItem('isAuthenticated');
    } catch (error) {
        console.error("Could not remove from sessionStorage", error);
    }
    setIsAuthenticated(false);
    router.push('/auth');
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
