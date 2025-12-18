
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if loading is finished and there's no user.
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // While loading, show a spinner. This prevents the redirect loop.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  // If loading is finished and we have a user, render the children.
  if (user) {
    return <>{children}</>;
  }

  // If loading is finished and there's no user, the useEffect will handle the redirect.
  // Returning null here prevents rendering children while the redirect is in progress.
  return null;
}
