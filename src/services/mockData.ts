import type { Pet, SosAlert, AdoptionEvent, VetClinic, UserProfile } from '@/types';

export const MOCK_USER: UserProfile = {
  uid: 'user_demo_1',
  name: 'Ana Carolina',
  email: 'ana.carolina@exemplo.com',
  phone: '(21) 98323-7279',
  photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  role: 'user',
  searchRadiusKm: 15,
  pushNotificationsEnabled: true,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
};

// Bancos de dados de demonstração vazios — o app utiliza apenas registros reais
export const MOCK_PETS: Pet[] = [];

export const MOCK_SOS_ALERTS: SosAlert[] = [];

export const MOCK_EVENTS: AdoptionEvent[] = [];

export const MOCK_VET_CLINICS: VetClinic[] = [];
