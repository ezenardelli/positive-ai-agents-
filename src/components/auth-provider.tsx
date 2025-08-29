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

const hasFirebaseConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// This is a mock user for testing environments
const mockUser = {
    uid: 'mock-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://picsum.photos/100/100',
} as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      console.warn("Firebase config not found. App is in test mode.");
      setUser(mockUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if(user.email?.endsWith('@positiveit.com.ar')) {
            setUser(user);
        } else {
            signOut(auth);
            setUser(null);
            alert("Acceso denegado. Solo se permiten cuentas de @positiveit.com.ar.");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!hasFirebaseConfig) {
      setUser(mockUser); // Set mock user on login click in test mode
      return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
          'hd': 'positiveit.com.ar'
      });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!hasFirebaseConfig) {
        setUser(null);
        return;
    };
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
        console.error("Error during sign-out:", error);
    } finally {
        setLoading(false);
    }
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
