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

// This is a mock user for testing environments
const mockUser = {
    uid: 'mock-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://picsum.photos/100/100',
    // Add other fields to match the User type to avoid type errors
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: 'mock-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({ token: 'mock-id-token', claims: {}, authTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null, expirationTime: '' }),
    reload: async () => {},
    toJSON: () => ({}),
    providerId: 'password', // or 'google.com', etc.
} as User;

// Use a separate hook for the FORCE_TEST_MODE flag
export function AuthProvider({ children, forceTestMode = false }: { children: ReactNode, forceTestMode?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If test mode is forced, bypass Firebase entirely
    if (forceTestMode) {
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
  }, [forceTestMode]);

  const login = async () => {
    if (forceTestMode) {
      setUser(mockUser);
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
    if (forceTestMode) {
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
