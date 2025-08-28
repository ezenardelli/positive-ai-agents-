'use client';

import { useRouter } from 'next/navigation';
import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
// import { auth } from '@/lib/firebase';
// import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Mock user for testing purposes
const MOCK_USER: User = {
  uid: 'test-user-id',
  email: 'test@positiveit.com.ar',
  displayName: 'Test User',
  photoURL: 'https://picsum.photos/100/100',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  providerId: 'password',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'test-token',
  getIdTokenResult: async () => ({
    token: 'test-token',
    expirationTime: '',
    authTime: '',
    issuedAtTime: '',
    signInProvider: null,
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User | null>(MOCK_USER);
  const [loading] = useState(false);
  const router = useRouter();

  const login = () => {
    console.log("Login skipped for testing.");
  };

  const logout = () => {
    console.log("Logout skipped for testing.");
    // In a real scenario, you'd redirect. For testing, we might not need to.
    // router.push('/login');
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
