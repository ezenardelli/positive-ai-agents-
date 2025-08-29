import AppShell from '@/components/app-shell';
import LoginPage from './login/page';

const isTestMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export default function Home() {
  if (isTestMode) {
    return <AppShell />;
  }
  return <LoginPage />;
}
