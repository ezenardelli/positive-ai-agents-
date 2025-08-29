'use client';

import { useRouter } from 'next/navigation';
import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Check if Firebase environment variables are set. If not, run in test mode.
const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Create a mock user for testing purposes.
const mockUser: User = {
  uid: 'mock-user-id',
  email: 'test@positiveit.com.ar',
  displayName: 'Test User',
  photoURL: 'https://picsum.photos/100/100',
  providerId: 'google.com',
  emailVerified: true,
} as User;


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isTestMode ? mockUser : null);
  const [loading, setLoading] = useState(!isTestMode);
  const router = useRouter();

  useEffect(() => {
    if (isTestMode) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isTestMode) {
      setUser(mockUser);
      router.push('/');
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
          'hd': 'positiveit.com.ar'
      });
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error) {
      console.error("Error during sign-in:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
     if (isTestMode) {
      setUser(null);
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
        console.error("Error during sign-out:", error);
    } finally {
        setLoading(false);
    }
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
