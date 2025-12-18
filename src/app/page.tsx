
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import LPRPage from '@/app/lpr/page';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Apenas redireciona se o carregamento estiver completo e não houver usuário.
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Enquanto o estado de autenticação está sendo verificado, exibe a tela de carregamento.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Se houver um usuário, renderiza a página principal.
  if (user) {
    return <LPRPage />;
  }
  
  // Se não houver usuário, exibe a tela de carregamento enquanto redireciona.
  // Isso evita um flash de conteúdo vazio.
  return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecionando...</p>
      </div>
  );
}
