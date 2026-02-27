
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a ferramenta LPR já que a autenticação foi removida
    router.replace('/lpr');
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
