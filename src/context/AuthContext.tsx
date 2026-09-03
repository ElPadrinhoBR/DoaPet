/**
 * Contexto global de autenticação
 * Observa o estado da sessão Firebase e carrega o perfil do Firestore.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { isFirebaseConfigured, auth } from '@/services/firebase';
import { fetchUserProfile, logout as logoutService } from '@/services/auth';
import { MOCK_USER } from '@/services/mockData';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
  updateProfilePhoto: (photoUrl: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user && isFirebaseConfigured) {
      const userProfile = await fetchUserProfile(user.uid);
      setProfile(userProfile);
    }
  };

  useEffect(() => {
    // Se o Firebase ainda não foi configurado (.env ausente), entra no Modo Demonstração
    if (!isFirebaseConfigured) {
      setUser({
        uid: MOCK_USER.uid,
        email: MOCK_USER.email,
        displayName: MOCK_USER.name,
      } as unknown as User);
      setProfile(MOCK_USER);
      setLoading(false);
      return;
    }

    // Cache local de sessão com Firebase real
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userProfile = await fetchUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginAsDemo = () => {
    setUser({
      uid: MOCK_USER.uid,
      email: MOCK_USER.email,
      displayName: MOCK_USER.name,
    } as unknown as User);
    setProfile(MOCK_USER);
  };

  const updateProfilePhoto = (photoUrl: string) => {
    setProfile((prev) => (prev ? { ...prev, photoUrl, photoURL: photoUrl } : prev));
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || user?.uid === MOCK_USER.uid) {
      setUser(null);
      setProfile(null);
      return;
    }
    await logoutService();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      signOut,
      loginAsDemo,
      updateProfilePhoto,
      refreshProfile,
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}