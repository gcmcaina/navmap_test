// =================================================================================
// GUIA DE RESOLUÇÃO DE PROBLEMAS DE AUTENTICAÇÃO
// =================================================================================
// Se você está recebendo erros como "Ocorreu um erro desconhecido" ou
// "auth/network-request-failed" ao tentar fazer login ou se cadastrar, é
// muito provável que o domínio da sua aplicação de desenvolvimento não
// esteja autorizado no seu projeto Firebase.
//
// Siga estes passos para resolver:
//
// 1. **Vá para o Console do Firebase:** https://console.firebase.google.com/
// 2. **Selecione seu projeto.**
// 3. No menu à esquerda, clique em **Authentication**.
// 4. Vá para a aba **Settings**.
// 5. Clique em **Authorized domains** (ou Domínios autorizados).
// 6. Clique em **Add domain** (Adicionar domínio).
// 7. Adicione o domínio da sua estação de trabalho. Ele se parece com:
//    [SEU-ID-DE-CLUSTER].cloudworkstations.dev
//
// Isso permitirá que sua aplicação de desenvolvimento se comunique com o
// Firebase Authentication sem ser bloqueada.
// =================================================================================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inicializa o Firebase (padrão singleton para evitar reinicializações)
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(firebaseApp);

export { firebaseApp, auth };
