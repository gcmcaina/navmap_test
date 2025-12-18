
'use client';

import { AuthGuard } from "@/components/auth/auth-guard";
import LPRPage from '@/app/lpr/page';

export default function HomePage() {
  return (
    <AuthGuard>
      <LPRPage />
    </AuthGuard>
  );
}
