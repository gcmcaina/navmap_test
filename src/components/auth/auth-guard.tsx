
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
    // Apenas redireciona se o carregamento terminou e não há usuário.
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Enquanto o estado de autenticação está sendo verificado, exibe um spinner.
  // Isso previne o redirecionamento prematuro.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  // Se o carregamento terminou e temos um usuário, renderiza o conteúdo protegido.
  if (user) {
    return <>{children}</>;
  }

  // Se o carregamento terminou e não há usuário, o useEffect cuidará do redirecionamento.
  // Retornar null aqui evita renderizar a página protegida enquanto o redirecionamento está em andamento.
  return null;
}
