import AppShell from '@/components/app-shell';
import LoginPage from './login/page';

// This is the single source of truth for test mode.
// Set to true to bypass login and use mock data for testing.
// Set to false for production to use Firebase Auth and Firestore.
const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export default function Home() {
  if (isTestMode) {
    return <AppShell />;
  }
  return <LoginPage />;
}
