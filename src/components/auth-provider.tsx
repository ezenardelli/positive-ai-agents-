'use client';

import { useRouter } from 'next/navigation';
import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Mock checking for a logged-in user in localStorage
    try {
      const storedUser = localStorage.getItem('positive-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      // Could be in a server environment
      console.log("localStorage not available");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = () => {
    // Mock login process
    const mockUser: User = {
      uid: 'user_123',
      email: 'juan.perez@positiveit.com.ar',
      displayName: 'Juan Pérez',
      photoURL: 'https://picsum.photos/100/100',
    };
    try {
        localStorage.setItem('positive-user', JSON.stringify(mockUser));
    } catch (error) {
        console.error("Could not save user to localStorage", error);
    }
    setUser(mockUser);
    router.push('/');
  };

  const logout = () => {
    try {
        localStorage.removeItem('positive-user');
    } catch (error) {
        console.error("Could not remove user from localStorage", error);
    }
    setUser(null);
    router.push('/login');
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
