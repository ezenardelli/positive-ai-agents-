'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleIcon, Logo } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

 useEffect(() => {
    // In testing mode with a mock user, we can redirect immediately.
    // In a real scenario, this would check for an actual user object.
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  // Show a loader while redirecting
  if (user) {
     return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // This part will likely not be seen when auth is mocked, but is kept for when we re-enable it.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl font-headline">Positive AI Agent Hub</CardTitle>
          <CardDescription>Bienvenido. Inicia sesión para continuar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={login} className="w-full" size="lg">
            <GoogleIcon className="mr-2 h-5 w-5" />
            Ingresar con Google
          </Button>
          <p className="text-xs text-center text-muted-foreground px-4">
            Acceso restringido a empleados de Positive IT (@positiveit.com.ar)
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
