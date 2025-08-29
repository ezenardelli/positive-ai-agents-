import AppShell from '@/components/app-shell';
import LoginPage from './login/page';

const isTestMode = true; // Forzamos el modo de prueba para saltear el login

export default function Home() {
  if (isTestMode) {
    return <AppShell />;
  }
  return <LoginPage />;
}
