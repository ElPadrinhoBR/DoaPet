import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Pet } from '@/types';

/** Rotas do Stack raiz (fora das tabs) */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  PetDetail: { pet: Pet };
  ChatRoom: { chatId: string; petId?: string; pet?: Pet };
  CreatePet: undefined;
  EditPet: { pet: Pet };
  CreateSosAlert: undefined;
};

/** Rotas acessíveis pelas Bottom Tabs */
export type MainTabParamList = {
  HomeMap: undefined;
  Swipe: undefined;
  Events: undefined;
  Chats: undefined;
  Settings: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;