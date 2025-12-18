
'use server';

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { z } from 'zod';
import { signInSchema, signUpSchema } from './page';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // A propriedade 'code' é específica para erros do Firebase Auth
    const errorCode = (error as any).code;
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este email já está em uso por outra conta.';
      case 'auth/invalid-email':
        return 'O formato do email é inválido.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Tente uma com pelo menos 6 caracteres.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email ou senha inválidos. Verifique suas credenciais.';
      default:
        // Para outros erros do Firebase ou erros genéricos, retorna a mensagem original.
        return error.message || 'Ocorreu um erro desconhecido. Tente novamente.';
    }
  }
  return 'Ocorreu um erro inesperado durante a autenticação.';
}


export async function signUp(data: z.infer<typeof signUpSchema>) {
  try {
    await createUserWithEmailAndPassword(auth, data.email, data.password);
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function signIn(data: z.infer<typeof signInSchema>) {
  try {
    await signInWithEmailAndPassword(auth, data.email, data.password);
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function handleSignOut() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { error: getErrorMessage(error) };
    }
}
