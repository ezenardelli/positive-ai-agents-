import AppShell from '@/components/app-shell';

export default function Home() {
  // AppShell ahora manejará toda la lógica de renderizado,
  // ya sea mostrando el login o el panel principal del chat.
  return <AppShell />;
}
