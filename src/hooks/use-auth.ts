'use client';
import { AuthContext } from '@/components/auth-provider';
import { useContext } from 'react';

// The hook now accepts the test mode flag, but it's optional
export const useAuth = (forceTestMode = false) => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // The logic for forcing test mode is now handled in the provider itself,
  // but we accept the argument to maintain a consistent API if needed elsewhere.
  return context;
};
