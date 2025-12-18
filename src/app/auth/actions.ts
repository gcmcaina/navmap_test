
'use server';

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase';
import { z } from 'zod';
import { cookies } from 'next/headers';

const auth = getAuth(firebaseApp);

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
        return 'Email ou senha inválidos.';
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
    const validatedData = signUpSchema.parse(data);
    await createUserWithEmailAndPassword(auth, validatedData.email, validatedData.password);
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function signIn(data: z.infer<typeof signInSchema>) {
  try {
    const validatedData = signInSchema.parse(data);
    const userCredential = await signInWithEmailAndPassword(auth, validatedData.email, validatedData.password);
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
