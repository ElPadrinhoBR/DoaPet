/**
 * Serviço de autenticação — Suporta E-mail/Senha e Google Sign-In
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from './firebase';
import { profileImageToBase64 } from '@/utils/image';
import type { UserProfile } from '@/types';

// Necessário para fechar o popup do navegador caso use login social
WebBrowser.maybeCompleteAuthSession();

/** Cria ou atualiza o perfil do usuário no Firestore */
export async function createUserProfile(
  user: User,
  name: string,
  role: 'user' | 'ong' = 'user',
  organizationName?: string,
): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, {
    name,
    email: user.email ?? '',
    photoUrl: user.photoURL ?? null,
    role,
    organizationName: role === 'ong' ? organizationName : null,
    searchRadiusKm: 10,
    pushNotificationsEnabled: true,
    createdAt: serverTimestamp(),
  });
}

/** Cadastro de nova conta com E-mail e Senha */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: 'user' | 'ong' = 'user',
  organizationName?: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await createUserProfile(credential.user, name, role, organizationName);
  return credential.user;
}

/** Login com E-mail e Senha */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Envia e-mail de recuperação de senha */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/** Hook do Google OAuth (opcional / alternativo) */
export function useGoogleAuthRequest() {
  const webId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    '428930977134-meesjdt8gjfvihob8qug3p697bf6lmb6.apps.googleusercontent.com';
  const androidId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || webId;
  const iosId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || webId;

  return Google.useIdTokenAuthRequest({
    clientId: webId,
    webClientId: webId,
    androidClientId: androidId,
    iosClientId: iosId,
  });
}

/** Faz login no Firebase com o token retornado pelo Google */
export async function signInWithGoogleToken(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await upsertUserProfile(result.user);
  return result.user;
}

/** Cria ou atualiza o perfil do Google no Firestore */
export async function upsertUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName ?? 'Usuário DoaPet',
      email: user.email ?? '',
      photoUrl: user.photoURL ?? null,
      role: 'user' as const,
      searchRadiusKm: 10,
      pushNotificationsEnabled: true,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      ref,
      {
        name: user.displayName ?? snap.data().name,
        photoUrl: user.photoURL ?? snap.data().photoUrl,
      },
      { merge: true },
    );
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Busca o perfil completo do usuário no Firestore */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return { uid: snapshot.id, ...(snapshot.data() as Omit<UserProfile, 'uid'>) };
}

/** Converte a foto de perfil para Base64 e salva diretamente no Firestore */
export async function uploadProfilePhoto(
  userId: string,
  imageUri: string,
): Promise<string> {
  // 1. Já é base64? Retorna como está (evita dupla conversão)
  if (imageUri.startsWith('data:image/')) {
    return imageUri;
  }

  // 2. Comprime e converte para Base64 Data URI (~25 KB)
  const base64Photo = await profileImageToBase64(imageUri);

  // 3. Salva o Base64 no documento do usuário no Firestore
  //    Nota: Firebase Auth só aceita URLs HTTP em photoURL — não usamos Base64 no Auth.
  if (isFirebaseConfigured) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { photoUrl: base64Photo }, { merge: true });
    } catch (e) {
      console.error('Erro ao salvar foto de perfil no Firestore:', e);
    }
  }

  return base64Photo;
}

export { onAuthStateChanged };