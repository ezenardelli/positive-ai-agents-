'use client';
import { AuthContext } from '@/components/auth-provider';
import { useContext } from 'react';

// NOTE: This is a mock auth hook for development purposes.
// It simulates a logged-in user to bypass the Google login flow.
// Replace with the original use-auth.ts content to re-enable real authentication.

import type { User } from 'firebase/auth';

const MOCK_USER: User = {
  uid: 'mock-user-uid-12345',
  email: 'test.user@positiveit.com.ar',
  displayName: 'Test User',
  photoURL: 'https://picsum.photos/100',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  providerId: 'google.com',
  // Required properties for the User type
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({
    token: 'mock-token',
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


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Return a mock user and loading state for development
  return { 
    ...context, 
    user: MOCK_USER, 
    loading: false 
  };
};