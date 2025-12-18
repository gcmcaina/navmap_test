
'use server';

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { z } from 'zod';
import { cookies } from 'next/headers';
import { signInSchema, signUpSchema } from './page';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch ((error as any).code) {
      case 'auth/email-already-in-use':
        return 'Este email já está em uso.';
      case 'auth/invalid-email':
        return 'O formato do email é inválido.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Tente uma mais forte.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email ou senha inválidos.';
      default:
        return 'Ocorreu um erro desconhecido. Tente novamente.';
    }
  }
  return 'Ocorreu um erro inesperado.';
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
    const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
    const idToken = await userCredential.user.getIdToken();

    cookies().set('firebaseIdToken', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 semana
    });

    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function handleSignOut() {
    try {
        await signOut(auth);
        cookies().delete('firebaseIdToken');
        return { success: true };
    } catch (error) {
        return { error: getErrorMessage(error) };
    }
}
