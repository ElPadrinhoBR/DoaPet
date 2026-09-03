/**
 * Inicialização do Firebase
 *
 * As credenciais vêm de variáveis de ambiente EXPO_PUBLIC_* (arquivo .env).
 * Veja .env.example na raiz do projeto.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const isFirebaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
);

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyMockDemoKeyForPreviewModeOnly123456',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'doapet-demo.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'doapet-demo',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'doapet-demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

// Evita reinicializar durante Fast Refresh no desenvolvimento
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Usa AsyncStorage para persistir a sessão entre reinicializações do app.
// initializeAuth só pode ser chamado uma vez; nas recargas usa getAuth().
export const auth = getApps().length > 1
  ? getAuth(firebaseApp)
  : initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
