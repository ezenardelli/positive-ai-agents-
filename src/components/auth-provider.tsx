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

const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

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
    if (isTestMode) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        if(user.email?.endsWith('@positiveit.com.ar')) {
            setUser(user);
            if (window.location.pathname === '/login') {
                router.replace('/');
            }
        } else {
            // User is not from the allowed domain, sign them out.
            signOut(auth);
            setUser(null);
            alert("Acceso denegado. Solo se permiten cuentas de @positiveit.com.ar.");
            router.replace('/login');
        }
      } else {
        setUser(null);
        if (window.location.pathname !== '/login') {
            router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const login = async () => {
    if (isTestMode) {
       setUser(mockUser);
       router.replace('/');
       return;
    }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
          'hd': 'positiveit.com.ar'
      });
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle routing
    } catch (error) {
      console.error("Error during sign-in:", error);
      setLoading(false);
    }
  };

  const logout = async () => {
     if (isTestMode) {
      setUser(null);
      window.location.reload();
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
